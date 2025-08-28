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
    
# --- For user-uploaded audio/video files to be transcribed ---
class SourceMediaStorage(AzureStorage):
    azure_container = 'greaby-source-media'
    
# --- For the JSON transcription results from Azure ---
class TranscriptionResultStorage(AzureStorage):
    azure_container = 'greaby-transcription-results'
    
# --- Storage for original uploaded documents ---
class InputDocumentStorage(AzureStorage):
    azure_container = 'greaby-documents-input'
    expiration_secs = 3600

# --- Storage for translated documents from Azure ---
class TranslatedDocumentStorage(AzureStorage):
    azure_container = 'greaby-documents-output'
    expiration_secs = 3600
    
# --- Storage for user-uploaded source images for editing ---
class ImageSourceStorage(AzureStorage):
    azure_container = 'greaby-source-images'