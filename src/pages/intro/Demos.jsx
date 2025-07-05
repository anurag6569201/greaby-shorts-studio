import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Video, Voicemail, Languages, FileText } from "lucide-react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Navbar from "./Navbar";
import Footer from "./Footer";

// --- DEMO ASSETS ---
// Place these files in your /public/demos/ folder
const DEMO_VIDEO_SRC = '/demos/video-demo.mp4';
const DEMO_VOICEOVER_AUDIO_SRC = '/demos/voice-demo.mp3';
const DEMO_DUB_ORIGINAL_SRC = '/demos/dub-original-en.mp4';
const DEMO_DUB_DUBBED_SRC = '/demos/dub-dubbed-hi.mp4';
const DEMO_TRANSCRIPTION_AUDIO_SRC = '/demos/transcription-demo.mp3';

const AnimatedInView = ({ children, variants, className = "", amount = 0.2, once = true }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount });
  return (
    <motion.div ref={ref} className={className} variants={variants} initial="hidden" animate={isInView ? "visible" : "hidden"}>
      {children}
    </motion.div>
  );
};

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

const VideoDemo = () => (
    <div className="space-y-4">
        <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden ring-1 ring-slate-200">
            <video src={DEMO_VIDEO_SRC} controls autoPlay muted loop className="w-full h-full object-cover"/>
        </div>
        <div className="bg-slate-100 rounded-md p-3 text-sm">
            <p className="font-mono text-slate-500 text-xs mb-1 tracking-widest">PROMPT</p>
            <p className="text-slate-700">A hyper-realistic video of a cat DJing at a party, cinematic lighting, shallow depth of field.</p>
        </div>
    </div>
);

const VoiceoverDemo = () => {
    const script = "In a world where ideas fly at the speed of thought, one tool empowers creators to bring them to life instantly. This is not just software; it's a revolution in content creation. Welcome to the future.";
    return (
        <div className="space-y-4">
            <div className="h-64 bg-slate-100 rounded-lg p-4 overflow-y-auto ring-1 ring-slate-200">
                <p className="text-slate-700 leading-relaxed">{script}</p>
            </div>
            <div className="flex flex-col gap-3">
                <Badge variant="secondary" className="w-fit">Voice: en-US-JennyNeural (Free Tier)</Badge>
                <audio src={DEMO_VOICEOVER_AUDIO_SRC} controls className="w-full"/>
            </div>
        </div>
    );
};

const DubbingDemo = () => {
    const [playing, setPlaying] = useState(null);
    const originalRef = useRef(null);
    const dubbedRef = useRef(null);

    const handlePlay = (player) => {
        if (player === 'original' && dubbedRef.current) {
            dubbedRef.current.pause();
        } else if (player === 'dubbed' && originalRef.current) {
            originalRef.current.pause();
        }
        setPlaying(player);
    };

    return (
        <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label>Original (English)</Label>
                <div className="aspect-video bg-slate-200 rounded-lg overflow-hidden ring-1 ring-slate-200">
                    <video ref={originalRef} src={DEMO_DUB_ORIGINAL_SRC} controls onPlay={() => handlePlay('original')} className="w-full h-full object-cover"/>
                </div>
            </div>
            <div className="space-y-2">
                <Label>AI Dubbed (Hindi)</Label>
                <div className="aspect-video bg-slate-200 rounded-lg overflow-hidden ring-1 ring-slate-200">
                    <video ref={dubbedRef} src={DEMO_DUB_DUBBED_SRC} controls onPlay={() => handlePlay('dubbed')} className="w-full h-full object-cover"/>
                </div>
            </div>
        </div>
    );
};

const TranscriptionDemo = () => {
    const transcript = [
        { speaker: 'Speaker 1', text: "So, what's the plan for the new product launch?" },
        { speaker: 'Speaker 2', text: "We need to finalize the marketing strategy. I was thinking a big social media push, focusing on short-form video content." },
        { speaker: 'Speaker 1', text: "I like that. We can use Greaby to generate the video assets quickly. What about the voiceover?" },
        { speaker: 'Speaker 2', text: "Already done. I used one of their premium AI voices. It sounds incredible. We can even get it transcribed instantly for subtitles." },
    ];
    return (
        <div className="space-y-4">
            <audio src={DEMO_TRANSCRIPTION_AUDIO_SRC} controls className="w-full"/>
            <div className="h-64 bg-slate-100 rounded-lg p-4 overflow-y-auto space-y-3 ring-1 ring-slate-200">
                {transcript.map((item, i) => (
                    <div key={i}>
                        <p className="font-semibold text-primary text-sm">{item.speaker}</p>
                        <p className="text-slate-700">{item.text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Demos = () => {
  const [activeTab, setActiveTab] = useState('video');

  const tabs = [
      { id: 'video', label: 'AI Video', icon: Video, component: <VideoDemo /> },
      { id: 'voiceover', label: 'Voiceover', icon: Voicemail, component: <VoiceoverDemo /> },
      { id: 'dubbing', label: 'Dubbing', icon: Languages, component: <DubbingDemo /> },
      { id: 'transcription', label: 'Transcription', icon: FileText, component: <TranscriptionDemo /> }
  ];

  return (
    <section id="demos" className="bg-transparent">
        <Navbar/>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-5 mb-5 pb-2">
            <AnimatedInView variants={fadeIn} className="text-center mb-12">
                <h2 className="text-4xl font-bold tracking-tighter mb-4 text-slate-900">See The Magic In Action</h2>
                <p className="text-slate-600 max-w-2xl mx-auto">Click through the tabs to experience the quality of each core feature.</p>
            </AnimatedInView>

            <div className="flex justify-center flex-wrap gap-2 mb-8">
                {tabs.map(tab => (
                    <Button 
                        key={tab.id} 
                        variant="ghost" 
                        onClick={() => setActiveTab(tab.id)}
                        className={cn("rounded-full px-5 py-2.5 transition-all duration-300", activeTab === tab.id ? "bg-primary/10 text-primary font-semibold" : "text-slate-500 hover:text-primary hover:bg-slate-100")}
                    >
                        <tab.icon className="h-5 w-5 mr-2" />
                        {tab.label}
                    </Button>
                ))}
            </div>

            <div className="relative bg-white/60 backdrop-blur-md border rounded-2xl p-6 shadow-xl shadow-slate-200/50 min-h-[400px]">
                <AnimatePresence mode="wait">
                    {tabs.map(tab =>
                        activeTab === tab.id && (
                            <motion.div
                                key={tab.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {tab.component}
                            </motion.div>
                        )
                    )}
                </AnimatePresence>
            </div>
        </div>
        <Footer/>
    </section>
  );
};

export default Demos;