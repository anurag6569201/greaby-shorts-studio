# Bug Bash Report V2 - Greaby Shorts Studio

**Date:** $(date)  
**Scope:** Post-fix audit - Remaining issues and new findings  
**Status:** 🔍 Issues Found

---

## 🔴 CRITICAL BUGS

### 1. **Race Condition in Reel Subtitle Generation (NOT FIXED)**
**Location:** `greaby_backend/reels/views.py:74-85`

**Issue:** The user rejected the fix, so this still has a race condition. Credit balance check and deduction are not atomic.

```python
subtitle_cost = SUBTITLE_GENERATION_COST
user = request.user
if user.credit_balance < subtitle_cost:  # ❌ Check outside transaction
    return Response(...)

with transaction.atomic():
    user.credit_balance -= subtitle_cost  # ❌ No select_for_update()
    user.save(update_fields=['credit_balance'])
    reel.subtitle_status = Reel.SubtitleStatus.PENDING
    reel.save(update_fields=['subtitle_status'])

generate_subtitles_for_reel.delay(str(reel.id))  # ❌ Outside transaction
```

**Impact:**
- **Financial:** Users can spend credits they don't have
- **Data Integrity:** Negative balances possible
- **Consistency:** Status updated but task may not run if Celery fails

**Fix Required:**
```python
try:
    with transaction.atomic():
        # Lock the user row to prevent race conditions
        user = User.objects.select_for_update().get(id=request.user.id)
        
        if user.credit_balance < subtitle_cost:
            return Response({"detail": f"Insufficient credits. This action costs {subtitle_cost} credits."}, status=status.HTTP_402_PAYMENT_REQUIRED)
        
        user.credit_balance -= subtitle_cost
        user.save(update_fields=['credit_balance'])
        reel.subtitle_status = Reel.SubtitleStatus.PENDING
        reel.save(update_fields=['subtitle_status'])

    generate_subtitles_for_reel.delay(str(reel.id))
except Exception as e:
    logger = logging.getLogger(__name__)
    logger.error(f"Error in reel subtitle generation: {e}", exc_info=True)
    return Response({"detail": "An unexpected error occurred. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

---

### 2. **Race Condition in Razorpay Webhook Credit Grant**
**Location:** `greaby_backend/billing/views.py:133-136`

**Issue:** When granting credits in the webhook, the user row is not locked, which could cause issues if multiple webhooks are processed simultaneously.

```python
# Grant credits to the user
user = purchase.user
user.credit_balance += purchase.credits_purchased  # ❌ No select_for_update()
user.save(update_fields=['credit_balance'])
```

**Impact:**
- **Data Integrity:** Potential for lost credit grants if webhooks arrive simultaneously
- **Business:** Users might not receive all credits they paid for

**Fix Required:**
```python
# Grant credits to the user
user = User.objects.select_for_update().get(id=purchase.user.id)
user.credit_balance += purchase.credits_purchased
user.save(update_fields=['credit_balance'])
```

---

## 🟠 HIGH PRIORITY BUGS

### 3. **Print Statements Instead of Logging (Multiple Files)**
**Location:** Multiple files

**Issue:** Many files use `print()` statements instead of proper logging, which:
- Doesn't respect log levels
- Can't be filtered or redirected
- Makes debugging harder in production
- May expose sensitive information in logs

**Affected Files:**
- `greaby_backend/billing/views.py` - 6 print statements (lines 59, 82, 102, 111, 138, 159, 161)
- `greaby_backend/reels/views.py` - 1 print statement (line 46)
- `greaby_backend/users/views.py` - 1 print statement (line 89)
- `greaby_backend/users/signals.py` - 1 print statement (line 18)
- `greaby_backend/reels/tasks.py` - 2 print statements (lines 31, 155)
- `greaby_backend/notifications/consumers.py` - 2 print statements (lines 15, 20)
- `greaby_backend/greaby_project/email_utils.py` - 2 print statements (lines 20, 23)

**Impact:**
- **Debugging:** Harder to trace issues in production
- **Security:** May log sensitive information
- **Maintainability:** Inconsistent logging approach

**Fix Required:** Replace all `print()` statements with proper logging:
```python
import logging
logger = logging.getLogger(__name__)

# Instead of: print(f"ERROR: {e}")
logger.error(f"Error message: {e}", exc_info=True)

# Instead of: print(f"SUCCESS: {message}")
logger.info(f"Success message: {message}")
```

---

### 4. **Missing select_related for User Foreign Keys (N+1 Queries)**
**Location:** Multiple views

**Issue:** Several querysets don't use `select_related('user')` which causes N+1 queries when serializing responses.

**Affected Files:**
- `greaby_backend/creations/views.py:18` - VideoCreation queryset
- `greaby_backend/audio_creations/views.py:24` - AudioCreation queryset
- `greaby_backend/image_creations/views.py:26` - ImageCreation queryset
- `greaby_backend/transcriptions/views.py:40` - Transcription queryset
- `greaby_backend/translations/views.py:24` - DocumentTranslation queryset
- `greaby_backend/video_translations/views.py:26` - VideoTranslation queryset

**Impact:**
- **Performance:** Extra database queries for each record (N+1 problem)
- **Scalability:** Performance degrades with more records

**Fix Required:**
```python
def get_queryset(self):
    base_queryset = VideoCreation.objects.filter(user=self.request.user).select_related('user')
    # ... rest of the code
```

---

### 5. **Missing Error Handling in VideoPlanningView**
**Location:** `greaby_backend/creations/views.py:83-105`

**Issue:** The `VideoPlanningView` doesn't have proper error handling. If `planner.generate_plan()` raises an exception, it will return a 500 error without logging.

```python
plan = planner.generate_plan(prompt)

if "error" in plan:
    return Response(plan, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
return Response(plan, status=status.HTTP_200_OK)
```

**Impact:**
- **Debugging:** No logging of errors
- **User Experience:** Generic 500 errors

**Fix Required:**
```python
try:
    plan = planner.generate_plan(prompt)
    
    if "error" in plan:
        logger = logging.getLogger(__name__)
        logger.error(f"Video planning error: {plan.get('error')}")
        return Response(plan, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    return Response(plan, status=status.HTTP_200_OK)
except Exception as e:
    logger = logging.getLogger(__name__)
    logger.error(f"Error in video planning: {e}", exc_info=True)
    return Response({"error": "An unexpected error occurred. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

---

### 6. **Potential File Read Issue in DownloadTranscriptionView**
**Location:** `greaby_backend/transcriptions/views.py:115`

**Issue:** The file is read but not closed properly, and there's no check for file size before reading.

```python
json_content = transcription.result_file.read().decode('utf-8')
```

**Impact:**
- **Memory:** Large files could cause memory issues
- **Resource Leaks:** File handle not explicitly closed

**Fix Required:**
```python
try:
    # Check file size first
    if transcription.result_file.size > 10 * 1024 * 1024:  # 10MB limit
        return Response({"detail": "File too large to download."}, status=status.HTTP_400_BAD_REQUEST)
    
    with transcription.result_file.open('r') as f:
        json_content = f.read().decode('utf-8')
except Exception as e:
    logger = logging.getLogger(__name__)
    logger.error(f"Error reading transcription file {pk}: {e}", exc_info=True)
    return Response({"detail": "Could not read result file."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

---

## 🟡 MEDIUM PRIORITY BUGS

### 7. **Inconsistent Error Response Format**
**Location:** Multiple views

**Issue:** Some views return `{"detail": "..."}` while others return `{"error": "..."}`. This inconsistency makes frontend error handling harder.

**Examples:**
- `billing/views.py:82` - Returns `{'error': '...'}`
- `billing/views.py:163` - Returns `{'error': '...'}`
- Most other views return `{"detail": "..."}`

**Impact:**
- **Frontend:** Inconsistent error handling
- **API Design:** Poor API consistency

**Recommendation:** Standardize on `{"detail": "..."}` format (Django REST Framework standard).

---

### 8. **Missing Input Validation in VideoPlanningView**
**Location:** `greaby_backend/creations/views.py:88`

**Issue:** The prompt is only checked for existence, not validated for length or content.

```python
prompt = request.data.get('prompt')
if not prompt:
    return Response({"detail": "Prompt is required."}, status=status.HTTP_400_BAD_REQUEST)
```

**Impact:**
- **API Abuse:** Very long prompts could cause issues
- **Cost:** Long prompts cost more API credits

**Fix Required:**
```python
prompt = request.data.get('prompt')
if not prompt:
    return Response({"detail": "Prompt is required."}, status=status.HTTP_400_BAD_REQUEST)

if len(prompt) > 5000:  # Reasonable limit
    return Response({"detail": "Prompt is too long. Maximum 5000 characters."}, status=status.HTTP_400_BAD_REQUEST)
```

---

### 9. **Missing Transaction in Reel Creation**
**Location:** `greaby_backend/reels/views.py:52-58`

**Issue:** Reel creation and task dispatch are not in a transaction. If task dispatch fails, the reel is created but task may not run.

```python
reel = Reel.objects.create(
    user=request.user,
    title=serializer.validated_data.get('title'),
    video_creation=video,
    audio_creation=audio
)
combine_video_and_audio.delay(str(reel.id))  # ❌ No error handling
```

**Impact:**
- **Data Consistency:** Reel created but task may not run
- **User Experience:** Reel stuck in pending state

**Recommendation:** Add error handling around task dispatch.

---

### 10. **Potential SQL Injection in UnifiedHistoryView**
**Location:** `greaby_backend/billing/views.py:211-257`

**Issue:** While using `.values()`, the code manually constructs dictionaries. This is safe but inefficient and could be improved.

**Note:** This is not a security issue, but the implementation could be optimized.

---

## 🔵 LOW PRIORITY / CODE QUALITY

### 11. **Missing Type Hints**
**Location:** Multiple files

**Issue:** Most functions lack type hints, making code harder to understand and maintain.

**Impact:**
- **Maintainability:** Harder to understand function signatures
- **IDE Support:** Less autocomplete support

---

### 12. **Inconsistent Import Organization**
**Location:** Multiple files

**Issue:** Imports are not consistently organized (standard library, third-party, local).

**Impact:**
- **Code Quality:** Inconsistent style
- **Readability:** Harder to scan imports

---

### 13. **Missing Docstrings**
**Location:** Multiple views and methods

**Issue:** Many methods lack docstrings explaining their purpose.

**Impact:**
- **Documentation:** Poor code documentation
- **Onboarding:** Harder for new developers

---

## 📊 SUMMARY

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 2 | Needs immediate attention |
| 🟠 High | 4 | Should be fixed soon |
| 🟡 Medium | 3 | Plan for next sprint |
| 🔵 Low | 3 | Code quality improvements |

**Total New Issues Found:** 12

---

## 🎯 RECOMMENDED FIX PRIORITY

1. **Immediate (This Week):**
   - Fix race condition in reel subtitle generation (#1)
   - Fix race condition in Razorpay webhook (#2)
   - Replace print statements with logging (#3)

2. **High Priority (Next Sprint):**
   - Add select_related to prevent N+1 queries (#4)
   - Add error handling to VideoPlanningView (#5)
   - Fix file read issue in DownloadTranscriptionView (#6)

3. **Medium Priority (Next Month):**
   - Standardize error response format (#7)
   - Add input validation (#8)
   - Improve transaction handling (#9)

4. **Low Priority (Backlog):**
   - Add type hints (#11)
   - Organize imports (#12)
   - Add docstrings (#13)

---

## ✅ POSITIVE FINDINGS

- Most race conditions have been fixed
- Error handling is mostly consistent
- Authorization is properly implemented
- Transaction usage is good in most places

---

**Report Generated By:** AI Code Review  
**Previous Report:** BUG_BASH_REPORT.md  
**Next Review Recommended:** After fixes are applied

