// src/pages/intro/demo-assets.js

export const DEMOS = {
  video: [
    {
      id: 'vid1',
      src: '/demo/sora_game.mp4',
      prompt: "Close up of a female warrior gaming character staring intensely into the camera. Red light is on her."
    },
    {
      id: 'vid2',
      src: '/demo/sora_models.mp4',
      prompt: "Clip on a sunlit beach boardwalk. Three diverse models walk in slow-motion wearing our Summer ’25 linen collection. Golden hour lighting, light acoustic pop track, quick jump-cuts between outfits. Animated title card: ‘Summer ’25 Has Arrived’ with brand logo."
    },
    {
      id: 'vid3',
      src: '/demo/sora_man.mp4',
      prompt: "Advertising luxury perfume with a female model holding the perfume with NYC sunset behind her."
    }
  ],
  voiceover: [
    {
      id: 'vo1',
      src: '/voice-previews/hi-IN-Arjun-General-Audio-wav.wav',
      voice: 'Arjun-General',
      accent: 'Indian (Enthusiasm)',
      script: "In a world where ideas fly at the speed of thought, one tool empowers creators to bring them to life instantly. This is not just software; it's a revolution in content creation."
    },    
    {
      id: 'vo2',
      src: '/voice-previews/en-US-Andrew2DragonHDLatest-General-Audio-wav.wav',
      voice: 'Andrew2 DragonHDLatest',
      accent: 'US (Calm & Clear)',
      script: "Discover the power of clarity. Our AI voices deliver your message with perfect pronunciation and intonation, ensuring your audience understands and engages with every word."
    },
    {
      id: 'vo3',
      src: '/voice-previews/en-US-BreeDragonHDLatest-General-Audio-wav.wav',
      voice: 'Bree DragonHDLatest',
      accent: 'US (Calm & Clear)',
      script: "Discover the power of clarity. Our AI voices deliver your message with perfect pronunciation and intonation, ensuring your audience understands and engages with every word."
    },
    {
      id: 'vo4',
      src: '/voice-previews/en-US-EmmaDragonHDLatest-General-Audio-wav.wav',
      voice: 'Emma DragonHDLatest',
      accent: 'US (Passionate)',
      script: "Discover the power of clarity. Our AI voices deliver your message with perfect pronunciation and intonation, ensuring your audience understands and engages with every word."
    },
  ],
  dubbing: {
    original: { src: '/demos/dub-original-en.mp4', lang: 'EN', label: "Original (English)" },
    dubs: [
        { src: '/demos/dub-dubbed-hi.mp4', lang: 'HI', label: "AI Dubbed (Hindi)" },
    ]
  },
  transcription: [
    {
      id: 'ts1',
      src: '/demos/transcription-demo.mp3',
      title: 'Product Strategy Meeting',
      segments: [
        { speaker: 'Speaker 1', text: "So, what's the plan for the new product launch?", start: 0.5, end: 3.2 },
        { speaker: 'Speaker 2', text: "We need to finalize the marketing strategy. I was thinking a big social media push, focusing on short-form video content.", start: 3.5, end: 10.1 },
        { speaker: 'Speaker 1', text: "I like that. We can use Greaby to generate the video assets quickly. What about the voiceover?", start: 10.5, end: 15.8 },
        { speaker: 'Speaker 2', text: "Already done. I used one of their premium AI voices. It sounds incredible. We can even get it transcribed instantly for subtitles.", start: 16.2, end: 23.0 },
      ]
    }
  ]
};
