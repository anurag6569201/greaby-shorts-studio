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
    FIX: It now uses 'recognizedPhrases' from channel 0 to avoid duplication from stereo audio.
    """
    try:
        data = json.loads(result_json_content)
        # FIX: Filter phrases to only use channel 0, which is the primary audio track.
        phrases = [
            p for p in data.get("recognizedPhrases", []) if p.get("channel") == 0
        ]
        if not phrases:
            return "No transcription text found for the primary channel."
        
        # FIX: Join the display text from the 'nBest' array of each phrase.
        full_text = " ".join(
            p.get("nBest", [{}])[0].get("display", "") for p in phrases
        )
        return full_text.strip() if full_text.strip() else "Transcription result was empty."
    except (json.JSONDecodeError, KeyError, IndexError):
        return "Error: Could not parse transcription data."

def to_srt(result_json_content: str) -> str:
    """
    Converts Azure's detailed transcription JSON to an SRT (subtitle) format string.
    FIX: Now filters for channel 0 to handle stereo audio correctly and prevent duplicate entries.
    """
    try:
        data = json.loads(result_json_content)
        # FIX: Filter phrases to only use channel 0 to avoid duplication.
        phrases = [
            p for p in data.get("recognizedPhrases", []) if p.get("channel") == 0
        ]
        if not phrases:
            return "1\n00:00:00,000 --> 00:00:05,000\nNo recognized phrases with timing found for the primary channel."

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
            offset_ticks = phrase.get("offsetInTicks", 0)
            duration_ticks = phrase.get("durationInTicks", 0)

            start_seconds = offset_ticks / TICKS_PER_SECOND
            end_seconds = (offset_ticks + duration_ticks) / TICKS_PER_SECOND
            
            start_time = srt_time_format(start_seconds)
            end_time = srt_time_format(end_seconds)

            speaker = phrase.get("speaker")
            if speaker:
                text = f"Speaker {speaker}: {text}"

            srt_content.append(f"{i}\n{start_time} --> {end_time}\n{text}\n")
            
        return "\n".join(srt_content)
        
    except (json.JSONDecodeError, KeyError, IndexError, ValueError) as e:
        return f"1\n00:00:00,000 --> 00:00:05,000\nError: Could not parse data to SRT. Details: {e}"