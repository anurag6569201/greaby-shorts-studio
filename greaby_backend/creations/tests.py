from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
import json
from django.contrib.auth import get_user_model

User = get_user_model()

class VideoPlannerTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email='test@example.com', password='testpassword')
        self.client.force_authenticate(user=self.user)
        self.url = reverse('video-planning')

    @patch('creations.ai_planner.AzureOpenAI')
    @patch('creations.ai_planner.VideoPlanner.__init__')
    def test_video_planning_success_mock(self, mock_init, mock_azure_openai):
        # We are testing the view, so we rely on the view tests below.
        pass

    @patch('creations.views.VideoPlanner')
    def test_planning_endpoint_success(self, MockVideoPlanner):
        # Configure the mock planner instance
        mock_instance = MockVideoPlanner.return_value
        mock_instance.api_key = "fake_key" 
        
        expected_plan = {
            "navigation_plan": "Scene 1 to Scene 2",
            "script_plan": "Hello world",
            "interaction_plan": "None",
            "movement_plan": "Pan left",
            "zoom_plan": "Zoom in start",
            "visual_style": "Cinematic"
        }
        mock_instance.generate_plan.return_value = expected_plan

        # Make request
        data = {"prompt": "A cool video about AI"}
        response = self.client.post(self.url, data, format='json')

        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, expected_plan)
        mock_instance.generate_plan.assert_called_with("A cool video about AI")

    @patch('creations.views.VideoPlanner')
    def test_planning_endpoint_no_key(self, MockVideoPlanner):
        mock_instance = MockVideoPlanner.return_value
        mock_instance.api_key = None 

        data = {"prompt": "test"}
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    @patch('creations.views.VideoPlanner')
    def test_planning_endpoint_error(self, MockVideoPlanner):
        mock_instance = MockVideoPlanner.return_value
        mock_instance.api_key = "fake_key"
        mock_instance.generate_plan.return_value = {"error": "Something went wrong"}

        data = {"prompt": "test"}
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)

    def test_planning_endpoint_missing_prompt(self):
        # No need to mock planner here if we fail early
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
