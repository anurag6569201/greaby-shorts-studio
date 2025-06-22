# reels/tasks.py

import os
import subprocess
import tempfile
import requests
from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
from .models import Reel

@shared_task(bind=True, max_retries=3, default_retry_delay=120, acks_late=True)
def combine_video_and_audio(self, reel_id: str):
    try:
        reel = Reel.objects.select_related('video_creation', 'audio_creation').get(id=reel_id)
    except Reel.DoesNotExist:
        return f"Reel with id {reel_id} not found."

    try:
        reel.status = Reel.Status.PROCESSING
        reel.save(update_fields=['status'])

        video_url = reel.video_creation.result_url
        audio_file_path = reel.audio_creation.result_file.path

        # Create temporary files to hold the downloaded video and the output
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_video_file, \
             tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_output_file:
            
            # 1. Download the video from Azure URL
            video_headers = {'Api-Key': settings.AZURE_OPENAI_API_KEY}
            with requests.get(video_url, headers=video_headers, stream=True, timeout=60) as r:
                r.raise_for_status()
                for chunk in r.iter_content(chunk_size=8192):
                    temp_video_file.write(chunk)
            
            temp_video_path = temp_video_file.name
            temp_output_path = temp_output_file.name

        # 2. Run FFmpeg command
        # -i video.mp4 -i audio.mp3 : ainputs
        # -c:v copy : Copy video stream without re-encoding (fast)
        # -c:a aac : Re-encode audio to aac, a standard for mp4
        # -map 0:v:0 : Map video from the first input
        # -map 1:a:0 : Map audio from the second input
        # -shortest : Finish encoding when the shortest input stream ends
        command = [
            'ffmpeg',
            '-i', temp_video_path,
            '-i', audio_file_path,
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-map', '0:v:0',
            '-map', '1:a:0',
            '-shortest',
            temp_output_path,
            '-y' # Overwrite output file if it exists
        ]
        
        subprocess.run(command, check=True, capture_output=True, text=True)

        # 3. Save the final result to the Reel model
        with open(temp_output_path, 'rb') as f:
            final_video_content = ContentFile(f.read())
            reel.result_file.save(f'{reel.id}.mp4', final_video_content, save=True)

        reel.status = Reel.Status.COMPLETED
        reel.error_message = None
        reel.save(update_fields=['status', 'error_message'])
        
        # 4. Clean up temporary files
        os.unlink(temp_video_path)
        os.unlink(temp_output_path)
        
        return f"Successfully processed reel {reel.id}."

    except Exception as e:
        error_output = ""
        if isinstance(e, subprocess.CalledProcessError):
            # Capture FFmpeg-specific errors
            error_output = e.stderr
        
        if 'reel' in locals():
            reel.status = Reel.Status.FAILED
            reel.error_message = f"Error: {e}\nOutput: {error_output}"[:1024]
            reel.save(update_fields=['status', 'error_message'])
        
        self.retry(exc=e)