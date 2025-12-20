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
      prompt: "Clip on a sunlit beach boardwalk. Three diverse models walk in slow-motion wearing our Summer '25 linen collection. Golden hour lighting, light acoustic pop track, quick jump-cuts between outfits. Animated title card: 'Summer '25 Has Arrived' with brand logo."
    },
    {
      id: 'vid3',
      src: '/demo/sora_man.mp4',
      prompt: "A man in a stylish outfit walking through a modern urban environment, showcasing contemporary fashion and lifestyle."
    },
    {
      id: 'vid4',
      src: '/demo/sora_solar.mp4',
      prompt: "Stunning solar system visualization with planets orbiting, showcasing cosmic beauty and astronomical wonder."
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
      accent: 'US (Warm & Friendly)',
      script: "Transform your content with voices that feel natural and authentic. Every word is crafted to connect with your audience on a deeper level, making your message memorable and impactful."
    },
    {
      id: 'vo4',
      src: '/voice-previews/en-US-EmmaDragonHDLatest-General-Audio-wav.wav',
      voice: 'Emma DragonHDLatest',
      accent: 'US (Passionate)',
      script: "Experience the future of voice synthesis. Our advanced AI technology captures every nuance of human speech, delivering performances that are indistinguishable from real voices."
    },
  ],
  dubbing: {
    original: { src: '/demo/sora_models.mp4', lang: 'EN', label: "Original (English)" },
    dubs: [
        { src: '/demo/sora_models.mp4', lang: 'HI', label: "AI Dubbed (Hindi)" },
    ]
  },
  transcription: [
    {
      id: 'ts1',
      src: '/voice-previews/en-US-Andrew2DragonHDLatest-General-Audio-wav.wav',
      title: 'Product Strategy Meeting',
      segments: [
        { speaker: 'Speaker 1', text: "So, what's the plan for the new product launch?", start: 0.0, end: 2.5 },
        { speaker: 'Speaker 2', text: "We need to finalize the marketing strategy. I was thinking a big social media push, focusing on short-form video content.", start: 2.8, end: 8.0 },
        { speaker: 'Speaker 1', text: "I like that. We can use Greaby to generate the video assets quickly. What about the voiceover?", start: 8.3, end: 12.5 },
        { speaker: 'Speaker 2', text: "Already done. I used one of their premium AI voices. It sounds incredible. We can even get it transcribed instantly for subtitles.", start: 12.8, end: 18.0 },
      ]
    }
  ]
};
