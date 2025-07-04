# transcriptions/format_converter.py

import json
from datetime import timedelta

def srt_time_format(seconds: float) -> str:
    """Converts seconds (as a float) to SRT time format HH:MM:SS,ms"""
    if seconds < 0:
        seconds = 0
    td = timedelta(seconds=seconds)
    total_seconds = int(td.total_seconds())
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    milliseconds = td.microseconds // 1000
    return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}"

def to_plain_text(result_json_content: str) -> str:
    """
    Converts Azure's transcription JSON to a simple plain text string.
    It uses the 'display' field from the 'combinedRecognizedPhrases' for the best formatting.
    """
    try:
        data = json.loads(result_json_content)
        combined_phrases = data.get("combinedRecognizedPhrases", [])
        if not combined_phrases:
            return "No transcription text found."
        full_text = " ".join(phrase.get("display", "") for phrase in combined_phrases)
        return full_text if full_text.strip() else "Transcription result was empty."
    except (json.JSONDecodeError, KeyError):
        return "Error: Could not parse transcription data."

def to_srt(result_json_content: str) -> str:
    """
    Converts Azure's detailed transcription JSON to an SRT (subtitle) format string.
    FIXED: Now uses high-precision 'ticks' for timing, making it robust.
    """
    try:
        data = json.loads(result_json_content)
        phrases = data.get("recognizedPhrases", [])
        if not phrases:
            return "1\n00:00:00,000 --> 00:00:05,000\nNo recognized phrases with timing found."

        srt_content = []
        # A tick is 100 nanoseconds. 10,000,000 ticks in a second.
        TICKS_PER_SECOND = 10_000_000

        for i, phrase in enumerate(phrases, 1):
            nBest = phrase.get("nBest", [])
            if not nBest:
                continue
            
            best_choice = nBest[0]
            text = best_choice.get("display", "").strip()

            # Use 'offsetInTicks' for accuracy, falling back to 'offset' if needed
            offset_ticks = phrase.get("offsetInTicks")
            duration_ticks = phrase.get("durationInTicks")

            if offset_ticks is None or duration_ticks is None:
                # Fallback for older formats, though less reliable
                offset_str = phrase.get("offset", "PT0S").replace("PT", "").replace("S", "")
                duration_str = phrase.get("duration", "PT0S").replace("PT", "").replace("S", "")
                start_seconds = float(offset_str)
                duration_seconds = float(duration_str)
            else:
                start_seconds = offset_ticks / TICKS_PER_SECOND
                duration_seconds = duration_ticks / TICKS_PER_SECOND
            
            end_seconds = start_seconds + duration_seconds
            
            start_time = srt_time_format(start_seconds)
            end_time = srt_time_format(end_seconds)

            speaker = phrase.get("speaker")
            if speaker:
                text = f"Speaker {speaker}: {text}"

            srt_content.append(f"{i}\n{start_time} --> {end_time}\n{text}\n")
            
        return "\n".join(srt_content)
        
    except (json.JSONDecodeError, KeyError, IndexError, ValueError) as e:
        return f"1\n00:00:00,000 --> 00:00:05,000\nError: Could not parse data to SRT. Details: {e}"