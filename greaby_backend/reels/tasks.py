import os
import subprocess
import tempfile
import datetime
from celery import shared_task
from django.db import transaction
from django.core.files.base import ContentFile
from .models import Reel

@shared_task(bind=True, max_retries=2, default_retry_delay=120, acks_late=True)
def combine_video_and_audio(self, reel_id: str):
    """
    Combines a video and an audio file using FFmpeg.
    Downloads source files from cloud storage to a temporary location for processing.
    """
    try:
        reel = Reel.objects.select_related('video_creation', 'audio_creation').get(id=reel_id)
        reel.status = Reel.Status.PROCESSING
        reel.save(update_fields=['status'])
    except Reel.DoesNotExist:
        return f"Reel with id {reel_id} not found."

    temp_video_path = None
    temp_output_path = None
    try:
        # Source files are in cloud storage. We need their URLs.
        video_url = reel.video_creation.result_file.url
        audio_url = reel.audio_creation.result_file.url

        # Create temporary files to hold the downloaded assets and the output
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_video_file, \
             tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_audio_file, \
             tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_output_file:
            
            temp_video_path = temp_video_file.name
            temp_audio_path = temp_audio_file.name
            temp_output_path = temp_output_file.name

            # Download the video and audio content
            # In a real high-traffic scenario, a more robust download method might be needed.
            import requests
            for url, path in [(video_url, temp_video_path), (audio_url, temp_audio_path)]:
                with requests.get(url, stream=True, timeout=120) as r:
                    r.raise_for_status()
                    with open(path, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=8192):
                            f.write(chunk)
            
            # Run FFmpeg command
            command = [
                'ffmpeg', '-i', temp_video_path, '-i', temp_audio_path,
                '-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0', '-map', '1:a:0',
                '-shortest', temp_output_path, '-y'
            ]
            subprocess.run(command, check=True, capture_output=True, text=True)

            # Save the final result to the Reel model (uploads to cloud storage)
            with open(temp_output_path, 'rb') as f:
                final_video_content = ContentFile(f.read())
                reel.result_file.save(f'{reel.id}.mp4', final_video_content, save=False)

            reel.status = Reel.Status.COMPLETED
            reel.error_message = None
            reel.save(update_fields=['result_file', 'status', 'error_message'])
            
            return f"Successfully processed reel {reel.id}."

    except Exception as e:
        error_output = ""
        if isinstance(e, subprocess.CalledProcessError):
            error_output = e.stderr
        
        if 'reel' in locals():
            reel.status = Reel.Status.FAILED
            reel.error_message = f"Error: {e}\nOutput: {error_output}"[:1024]
            reel.save(update_fields=['status', 'error_message'])
        self.retry(exc=e)
    
    finally:
        # Clean up all temporary files
        for path in [temp_video_path, temp_output_path, globals().get('temp_audio_path')]:
            if path and os.path.exists(path):
                os.unlink(path)

# --- NEW TASK for Smart Subtitles ---
@shared_task(bind=True, max_retries=2)
def generate_subtitles_for_reel(self, reel_id: str):
    """Generates an SRT subtitle file from the audio creation's source text."""
    try:
        reel = Reel.objects.select_related('audio_creation__result_file').get(id=reel_id)
        
        script_text = reel.audio_creation.text_input
        if not script_text:
            raise ValueError("The source script text is empty.")

        # Use a library to get accurate audio duration
        from mutagen.mp3 import MP3
        audio_duration_seconds = MP3(reel.audio_creation.result_file).info.length
            
        # Basic SRT generation logic
        lines = [line.strip() for line in script_text.split('\n') if line.strip()]
        if not lines:
            raise ValueError("The source script text is empty after stripping.")
            
        duration_per_line = audio_duration_seconds / len(lines)
        srt_content = ""
        start_time = 0.0

        for i, line_text in enumerate(lines):
            end_time = start_time + duration_per_line
            # Format to HH:MM:SS,ms with leading zeros
            start_td_str = str(datetime.timedelta(seconds=start_time)).split('.')[0].zfill(8) + ',' + str(start_time % 1 * 1000).split('.')[0].zfill(3)
            end_td_str = str(datetime.timedelta(seconds=end_time)).split('.')[0].zfill(8) + ',' + str(end_time % 1 * 1000).split('.')[0].zfill(3)

            srt_content += f"{i+1}\n"
            srt_content += f"{start_td_str} --> {end_td_str}\n"
            srt_content += f"{line_text}\n\n"
            
            start_time = end_time

        # Save the SRT file to cloud storage
        srt_file = ContentFile(srt_content.encode('utf-8'))
        reel.subtitle_file.save(f'{reel.id}.srt', srt_file, save=False)
        reel.subtitle_status = Reel.SubtitleStatus.COMPLETED
        reel.subtitle_error_message = None
        reel.save(update_fields=['subtitle_file', 'subtitle_status', 'subtitle_error_message'])
        
        return f"Successfully generated subtitles for reel {reel.id}."

    except Exception as e:
        error_message = f"Subtitle generation failed: {e}"
        print(error_message)
        if 'reel' in locals():
            reel.subtitle_status = Reel.SubtitleStatus.FAILED
            reel.subtitle_error_message = str(e)[:255]
            reel.save(update_fields=['subtitle_status', 'subtitle_error_message'])
            # Refund the small credit cost for this action
            with transaction.atomic():
                user = reel.user
                # Assuming subtitle cost is 1.0, adjust as needed
                user.credit_balance += 1.0 
                user.save(update_fields=['credit_balance'])
        self.retry(exc=e)