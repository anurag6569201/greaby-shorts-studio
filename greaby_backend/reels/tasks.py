import os
import subprocess
import tempfile
import datetime
import requests
import logging
from celery import shared_task
from django.db import transaction
from django.conf import settings
from django.core.files.base import ContentFile
from mutagen.mp3 import MP3

from .models import Reel
from billing.models import CreditUsage
from greaby_project.email_utils import send_template_email
from .costs import SUBTITLE_GENERATION_COST

logger = logging.getLogger(__name__)

def _refund_subtitle_credits(reel: Reel, reason: str):
    try:
        with transaction.atomic():
            reel.refresh_from_db()
            user = reel.user
            user.refresh_from_db()
            
            user.credit_balance += SUBTITLE_GENERATION_COST
            user.save(update_fields=['credit_balance'])

            reel.subtitle_status = Reel.SubtitleStatus.FAILED
            reel.subtitle_error_message = f"Task failed: {reason}"
            reel.save(update_fields=['subtitle_status', 'subtitle_error_message'])
    except Exception as e:
        logger.error(f"CRITICAL: Failed to refund subtitle credits for reel {reel.id}. Error: {e}", exc_info=True)

@shared_task(bind=True, max_retries=2, default_retry_delay=120, acks_late=True)
def combine_video_and_audio(self, reel_id: str):
    try:
        reel = Reel.objects.select_related('video_creation', 'audio_creation').get(id=reel_id)
        reel.status = Reel.Status.PROCESSING
        reel.save(update_fields=['status'])
    except Reel.DoesNotExist:
        return f"Reel with id {reel_id} not found."

    temp_video_path, temp_audio_path, temp_output_path = None, None, None
    try:
        video_url = reel.video_creation.result_file.url
        audio_url = reel.audio_creation.result_file.url

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_video_file, \
             tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_audio_file, \
             tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_output_file:
            
            temp_video_path, temp_audio_path, temp_output_path = temp_video_file.name, temp_audio_file.name, temp_output_file.name

            for url, path in [(video_url, temp_video_path), (audio_url, temp_audio_path)]:
                with requests.get(url, stream=True, timeout=120) as r:
                    r.raise_for_status()
                    with open(path, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=8192):
                            f.write(chunk)
            
            command = [
                'ffmpeg', '-i', temp_video_path, '-i', temp_audio_path,
                '-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0', '-map', '1:a:0',
                '-shortest', temp_output_path, '-y'
            ]
            subprocess.run(command, check=True, capture_output=True, text=True)

            with open(temp_output_path, 'rb') as f:
                final_video_content = ContentFile(f.read())
                reel.result_file.save(f'{reel.id}.mp4', final_video_content, save=False)

            reel.status = Reel.Status.COMPLETED
            reel.error_message = None
            reel.save(update_fields=['result_file', 'status', 'error_message'])
            
            email_context = {
                'creation_type': 'Reel', 'prompt': reel.title,
                'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=reels"
            }
            send_template_email("Your Reel Assembly is Complete!", "emails/generation_complete.html", email_context, [reel.user.email])
            
            return f"Successfully processed reel {reel.id}."

    except Exception as e:
        error_output = str(e.stderr) if isinstance(e, subprocess.CalledProcessError) else str(e)
        if 'reel' in locals():
            reel.status = Reel.Status.FAILED
            reel.error_message = f"Error: {e}\nOutput: {error_output}"[:1024]
            reel.save(update_fields=['status', 'error_message'])
            
            email_context = {
                'creation_type': 'Reel', 'prompt': reel.title, 'error': str(e),
                'dashboard_url': f"{settings.FRONTEND_URL}/dashboard?tab=reels"
            }
            send_template_email("Your Reel Assembly Failed", "emails/generation_failed.html", email_context, [reel.user.email])
        
        self.retry(exc=e)
    
    finally:
        for path in [temp_video_path, temp_audio_path, temp_output_path]:
            if path and os.path.exists(path):
                os.unlink(path)

@shared_task(bind=True, max_retries=2)
def generate_subtitles_for_reel(self, reel_id: str):
    reel = None
    try:
        reel = Reel.objects.select_related('audio_creation', 'user').get(id=reel_id)
        
        script_text = reel.audio_creation.text_input
        if not script_text: raise ValueError("The source script text is empty.")
        
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_audio_file:
            audio_url = reel.audio_creation.result_file.url
            with requests.get(audio_url, stream=True, timeout=60) as r:
                r.raise_for_status()
                for chunk in r.iter_content(chunk_size=8192):
                    temp_audio_file.write(chunk)
            temp_audio_path = temp_audio_file.name

        audio_duration_seconds = MP3(temp_audio_path).info.length
        os.unlink(temp_audio_path)
            
        lines = [line.strip() for line in script_text.split('\n') if line.strip()]
        if not lines: raise ValueError("The source script text is empty after stripping.")
            
        duration_per_line = audio_duration_seconds / len(lines)
        srt_content, start_time = "", 0.0

        for i, line_text in enumerate(lines):
            end_time = start_time + duration_per_line
            start_td_str = str(datetime.timedelta(seconds=start_time)).split('.')[0].zfill(8) + ',' + str(start_time % 1 * 1000).split('.')[0].zfill(3)
            end_td_str = str(datetime.timedelta(seconds=end_time)).split('.')[0].zfill(8) + ',' + str(end_time % 1 * 1000).split('.')[0].zfill(3)
            srt_content += f"{i+1}\n{start_td_str} --> {end_td_str}\n{line_text}\n\n"
            start_time = end_time

        srt_file = ContentFile(srt_content.encode('utf-8'))
        
        with transaction.atomic():
            reel.subtitle_file.save(f'{reel.id}.srt', srt_file, save=False)
            reel.subtitle_status = Reel.SubtitleStatus.COMPLETED
            reel.subtitle_error_message = None
            reel.save(update_fields=['subtitle_file', 'subtitle_status', 'subtitle_error_message'])

            CreditUsage.objects.create(
                user=reel.user,
                usage_type=CreditUsage.UsageType.SUBTITLE,
                credits_spent=SUBTITLE_GENERATION_COST,
                description=f"Subtitles for Reel: {reel.title[:100]}"
            )
        
        return f"Successfully generated subtitles for reel {reel.id}."

    except Exception as e:
        error_message = f"Subtitle generation failed: {e}"
        logger.error(error_message, exc_info=True)
        if reel:
            _refund_subtitle_credits(reel, str(e))
        self.retry(exc=e)