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
        
        # This is the most reliable field for a clean, full transcript with punctuation.
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
    It iterates through each recognized phrase to create timed subtitle blocks.
    """
    try:
        data = json.loads(result_json_content)
        
        # We need the detailed 'recognizedPhrases' for per-segment timing.
        phrases = data.get("recognizedPhrases", [])
        if not phrases:
            return "1\n00:00:00,000 --> 00:00:05,000\nNo recognized phrases with timing found in data."

        srt_content = []
        for i, phrase in enumerate(phrases, 1):
            nBest = phrase.get("nBest", [])
            if not nBest:
                continue
            
            best_choice = nBest[0]
            text = best_choice.get("display", "").strip()

            offset_str = phrase.get("offset", "PT0S")
            duration_str = phrase.get("duration", "PT0S")

            start_seconds = float(offset_str.replace("PT", "").replace("S", ""))
            duration_seconds = float(duration_str.replace("PT", "").replace("S", ""))
            end_seconds = start_seconds + duration_seconds
            
            start_time = srt_time_format(start_seconds)
            end_time = srt_time_format(end_seconds)

            speaker = best_choice.get("speaker")
            if "speaker" in phrase:
                speaker = phrase.get("speaker")

            if speaker:
                text = f"Speaker {speaker}: {text}"

            srt_content.append(f"{i}\n{start_time} --> {end_time}\n{text}\n")
            
        return "\n".join(srt_content)
        
    except (json.JSONDecodeError, KeyError, IndexError, ValueError) as e:
        return f"1\n00:00:00,000 --> 00:00:05,000\nError: Could not parse transcription data to SRT. Details: {e}"