import azure.cognitiveservices.speech as speechsdk
from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.core.files.base import ContentFile
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import AudioCreation

def send_progress_update(user_id, creation_id, status_message, creation_type='audio'):
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{user_id}',
            {
                'type': 'send_notification',
                'message': {
                    'event': 'creation_progress',
                    'creation_id': str(creation_id),
                    'creation_type': creation_type,
                    'status_message': status_message,
                }
            }
        )
    except Exception as e:
        print(f"Failed to send progress update: {e}")

def refund_credits_audio(creation_id: str, reason: str):
    try:
        with transaction.atomic():
            creation = AudioCreation.objects.select_for_update().get(id=creation_id)
            user = creation.user
            if creation.status != AudioCreation.Status.COMPLETED and creation.credit_cost > 0:
                original_cost = creation.credit_cost
                user.credit_balance += original_cost
                user.save(update_fields=['credit_balance'])
                
                creation.credit_cost = 0
                creation.error_message = f"Task failed: {reason}. Credits have been refunded."
                creation.status = AudioCreation.Status.FAILED
                creation.save(update_fields=['credit_cost', 'error_message', 'status'])
    except Exception as e:
        print(f"CRITICAL: Failed to refund credits for audio creation {creation_id}. Error: {e}")

@shared_task(bind=True)
def generate_audio_from_text(self, creation_id: str):
    creation = None
    try:
        creation = AudioCreation.objects.get(id=creation_id)
        creation.status = AudioCreation.Status.PROCESSING
        creation.save(update_fields=['status'])
        send_progress_update(creation.user.id, creation.id, "Queued: Preparing request...")
    except AudioCreation.DoesNotExist:
        return f"AudioCreation with id {creation_id} not found."

    try:
        send_progress_update(creation.user.id, creation.id, "Step 1/2: Contacting Speech Service...")
        speech_config = speechsdk.SpeechConfig(
            subscription=settings.AZURE_SPEECH_KEY, 
            endpoint=settings.AZURE_SPEECH_ENDPOINT
        )
        speech_config.speech_synthesis_voice_name = creation.voice
        
        output_format_map = {
            'mp3': speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3,
            'opus': speechsdk.SpeechSynthesisOutputFormat.Ogg16Khz16BitMonoOpus,
            'aac': speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3,
            'flac': speechsdk.SpeechSynthesisOutputFormat.Audio24Khz160KBitRateMonoMp3,
            'wav': speechsdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm,
        }
        output_format = output_format_map.get(creation.response_format, speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3)
        speech_config.set_speech_synthesis_output_format(output_format)

        synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)

        rate_percentage = f"{((creation.speed - 1.0) * 100):+.2f}%"
        ssml_string = f"""
        <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
            <voice name='{creation.voice}'>
                <prosody rate='{rate_percentage}'>
                    {creation.text_input}
                </prosody>
            </voice>
        </speak>
        """
        
        send_progress_update(creation.user.id, creation.id, "Step 2/2: Synthesizing audio...")
        result = synthesizer.speak_ssml_async(ssml_string).get()

        if result.reason == speechsdk.ResultReason.Canceled:
            cancellation_details = result.cancellation_details
            error_details = cancellation_details.error_details if cancellation_details.error_details else "No details provided."
            raise Exception(f"Speech synthesis canceled: {cancellation_details.reason}. Details: {error_details}")
        
        if not result.audio_data:
            raise Exception("Synthesis completed but no audio data was returned.")

        audio_data = result.audio_data
        file_name = f'{creation.id}.{creation.response_format}'
        file_content = ContentFile(audio_data)
        
        creation.result_file.save(file_name, file_content, save=False)
        creation.status = AudioCreation.Status.COMPLETED
        creation.error_message = None
        creation.save(update_fields=['result_file', 'status', 'error_message'])
    
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{creation.user.id}',
            {'type': 'send_notification', 'message': {'event': 'creation_completed', 'creation_type': 'audio', 'creation_id': str(creation.id)}}
        )
        return f"Successfully processed audio creation {creation.id}."

    except Exception as e:
        error_message = str(e)
        if creation:
            refund_credits_audio(creation_id, error_message)
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'user_{creation.user.id}',
                {'type': 'send_notification', 'message': {'event': 'creation_failed', 'creation_type': 'audio', 'creation_id': str(creation.id)}}
            )
        return f"Failed and refunded audio creation {creation_id}."