import os
import json
from openai import AzureOpenAI
from django.conf import settings

class VideoPlanner:
    def __init__(self):
        # Configuration - strictly following user's provided details
        self.endpoint = "https://anurag6569201-1049-resource.cognitiveservices.azure.com/"
        self.deployment = "model-router"
        self.api_version = "2024-12-01-preview"
        
        # Try to get key from settings/env, otherwise rely on user having it set
        self.api_key = getattr(settings, 'AZURE_OPENAI_API_KEY', os.environ.get('AZURE_OPENAI_API_KEY'))
        
        if not self.api_key:
             # Fallback for local testing if env is missing, but this should be properly set in .env
             # Ideally validation happens here
             pass

        self.client = AzureOpenAI(
            api_version=self.api_version,
            azure_endpoint=self.endpoint,
            api_key=self.api_key,
        )

    def generate_plan(self, user_prompt):
        system_prompt = """
        You are a professional Video Production Director AI.
        Your goal is to create a comprehensive video plan based on the user's idea.
        
        You MUST return a VALID JSON object with the following structure:
        {
            "navigation_plan": "Details on flow and scene transition logic",
            "script_plan": "The actual spoken content or text overlays",
            "interaction_plan": "User engagement elements (polls, questions, clickable areas)",
            "movement_plan": "Camera movements (pan, tilt, dolly)",
            "zoom_plan": "Specific zoom in/out details for emphasis",
            "visual_style": "Description of the aesthetic and mood"
        }
        Do not include markdown formatting (like ```json) in the response, just the raw JSON string.
        """

        try:
            response = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=8192,
                temperature=0.7,
                top_p=0.95,
                model=self.deployment
            )
            
            content = response.choices[0].message.content
            
            # Clean up potential markdown formatting if the model disregards instruction
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
                
            return json.loads(content.strip())
            
        except Exception as e:
            return {
                "error": str(e),
                "details": "Failed to generate video plan."
            }
