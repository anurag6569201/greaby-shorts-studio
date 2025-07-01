from storages.backends.azure_storage import AzureStorage

# This storage class points to your 'greaby-videos' container.
class VideoStorage(AzureStorage):
    azure_container = 'greaby-videos'
    
# This storage class points to your 'greaby-audios' container.
class AudioStorage(AzureStorage):
    azure_container = 'greaby-audios'

# This storage class points to your 'greaby-reels' container.
class ReelStorage(AzureStorage):
    azure_container = 'greaby-reels'
    
# This storage class points to your 'greaby-subtitles' container.
class SubtitleStorage(AzureStorage):
    azure_container = 'greaby-subtitles'
    
# --- NEW: For user-uploaded audio/video files to be transcribed ---
class SourceMediaStorage(AzureStorage):
    azure_container = 'greaby-source-media'
    
# --- NEW: For the JSON transcription results from Azure ---
class TranscriptionResultStorage(AzureStorage):
    azure_container = 'greaby-transcription-results'