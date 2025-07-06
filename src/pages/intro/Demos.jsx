import React, { useState, useRef, useEffect } from "react";
import { Video, Voicemail, Languages, FileText, Play, Pause, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { DEMOS } from "./demo-assets";
import Waveform from "./Waveform";
import Navbar from "./Navbar";
import Footer from "./Footer";

// --- Main Header & Navigation ---
const AppHeader = ({ features, activeStudio, setActiveStudio }) => (
    <div className="bg-white/50 backdrop-blur-sm sticky top-4 z-20 max-w-lg mx-auto p-2 h-16 flex items-center justify-center rounded-full border border-slate-200/80 shadow-sm">
        <nav className="flex items-center gap-2">
            {features.map(feature => (
                <button
                    key={feature.id}
                    onClick={() => setActiveStudio(feature.id)}
                    className={cn(
                        "relative px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-300",
                        activeStudio === feature.id ? "text-primary" : "text-slate-600 hover:text-slate-900"
                    )}
                >
                    {activeStudio === feature.id && (
                        <motion.div layoutId="active-demo-pill" className="absolute inset-0 bg-white rounded-full shadow-md" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                    )}
                    <span className="relative z-10 flex items-center gap-2"><feature.icon className="h-4 w-4" />{feature.label}</span>
                </button>
            ))}
        </nav>
    </div>
);

// --- Re-themed Studio Components ---
const VideoStudio = () => {
    const [selected, setSelected] = useState(DEMOS.video[0]);

    return (
        <div className="p-4 sm:p-8 space-y-8">
            <header className="text-center">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">AI Video Generation Studio</h2>
                <p className="text-slate-500 mt-2 max-w-2xl mx-auto">Turn text into captivating video. Select a clip below to see the AI's interpretation of a prompt.</p>
            </header>
            <div className="relative w-full h-[500px] flex items-center justify-center">
                <AnimatePresence>
                    <motion.div
                        key={selected.id}
                        layoutId={selected.id}
                        className="absolute z-10 w-full max-w-2xl aspect-video bg-black rounded-2xl shadow-2xl shadow-primary/20 overflow-hidden"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] } }}
                        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
                    >
                        <video src={selected.src} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white">
                            <p className="font-mono text-xs uppercase tracking-widest opacity-70">Prompt</p>
                            <p className="font-medium text-sm">{selected.prompt}</p>
                        </div>
                    </motion.div>
                </AnimatePresence>
                {DEMOS.video.filter(v => v.id !== selected.id).map((video, i) => (
                    <motion.div
                        key={video.id}
                        layoutId={video.id}
                        onClick={() => setSelected(video)}
                        className={`absolute z-0 w-48 aspect-video bg-black rounded-xl shadow-lg cursor-pointer hover:!opacity-100 transition-opacity ${i === 0 ? 'left-4 sm:left-10 -rotate-6' : 'right-4 sm:right-10 rotate-6'}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5, transition: { delay: 0.3 } }}
                    >
                        <video src={video.src} muted playsInline className="w-full h-full object-cover rounded-xl" />
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

const VoiceoverStudio = () => {
    const [selected, setSelected] = useState(DEMOS.voiceover[0]);
    const [isPlaying, setIsPlaying] = useState(false);
    
    return (
        <div className="w-full grid md:grid-cols-2 gap-8 p-4 sm:p-8">
            <div className="flex flex-col justify-start items-start text-left">
                <header className="mb-6">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Lifelike Voiceovers</h2>
                    <p className="text-slate-500 mt-2">Choose from a library of premium AI voices that captivate and engage your audience.</p>
                </header>
                <div className="space-y-4 w-full">
                    {DEMOS.voiceover.map(vo => (
                        <motion.div key={vo.id} onClick={() => setSelected(vo)}
                            className={cn("p-4 w-100 rounded-xl border-2 cursor-pointer transition-all bg-white", selected.id === vo.id ? "border-violet-400 shadow-lg scale-105" : "border-transparent hover:border-slate-300")}
                            whileHover={{ y: -5 }}
                        >
                            <h4 className="font-bold text-slate-800">{vo.voice}</h4>
                            <p className="text-sm text-slate-500">{vo.accent}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
            <div className="bg-white rounded-2xl p-6 lg:p-8 flex flex-col justify-between shadow-2xl shadow-slate-200">
                <AnimatePresence mode="wait">
                    <motion.div key={selected.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-grow flex flex-col h-full">
                                                <div className="mb-4 flex items-center gap-4">
                            <button onClick={() => setIsPlaying(!isPlaying)} className="play-pause-btn flex-shrink-0 w-16 h-16 rounded-full bg-violet-500 text-white flex items-center justify-center transition-transform hover:scale-105 shadow-lg shadow-violet-200">
                                {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1"/>}
                            </button>
                            <div className="w-full">
                                <Waveform key={selected.id} audioSrc={selected.src} isPlaying={isPlaying} onFinish={() => setIsPlaying(false)} />
                            </div>
                        </div>
                        <div className="text-slate-600 leading-relaxed text-lg flex-grow overflow-y-auto max-h-80 pr-2">
                           {selected.script}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};


const DubbingStudio = () => {
    const originalRef = useRef(null);
    const dubRef = useRef(null);
    const [synced, setSynced] = useState(true);

    const syncVideos = (master, slave) => {
        if (synced && Math.abs(master.currentTime - slave.currentTime) > 0.1) {
            slave.currentTime = master.currentTime;
        }
    };
    
    return (
        <div className="h-full w-full flex flex-col p-4 sm:p-8">
            <header className="text-center mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Seamless AI Dubbing</h2>
                <p className="text-slate-500 mt-2 max-w-2xl mx-auto">Reach a global audience with perfectly synchronized, multi-lingual video dubbing.</p>
            </header>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {[DEMOS.dubbing.original, DEMOS.dubbing.dubs[0]].map((video, index) => (
                    <motion.div 
                        key={video.lang}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: index * 0.1, duration: 0.6 } }}
                        className="p-3 bg-white/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-slate-200/80"
                    >
                        <h3 className="text-center font-semibold text-slate-700 mb-3">{video.label}</h3>
                        <div className="aspect-video bg-black rounded-xl overflow-hidden">
                            <video 
                                ref={index === 0 ? originalRef : dubRef} 
                                src={video.src} 
                                controls 
                                muted={index === 1}
                                onPlay={(e) => syncVideos(e.target, index === 0 ? dubRef.current : originalRef.current)}
                                onTimeUpdate={(e) => syncVideos(e.target, index === 0 ? dubRef.current : originalRef.current)}
                                playsInline 
                                className="w-full h-full object-cover" 
                            />
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

// From your main component file

const TranscriptionStudio = () => {
    const [selected, setSelected] = useState(DEMOS.transcription[0]);
    const [currentTime, setCurrentTime] = useState(0);
    
    // Refs for the audio element and the animation loop
    const audioRef = useRef(null);
    const containerRef = useRef(null);
    const animationFrameRef = useRef();

    // Scroll active line into view
    useEffect(() => {
        const activeLine = containerRef.current?.querySelector('[data-active="true"]');
        if (activeLine) {
            activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentTime]); // Triggered by our smooth update loop

    // The high-frequency update loop
    const updateLoop = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            animationFrameRef.current = requestAnimationFrame(updateLoop);
        }
    };

    const handlePlay = () => {
        animationFrameRef.current = requestAnimationFrame(updateLoop);
    };

    const handlePauseOrEnd = () => {
        cancelAnimationFrame(animationFrameRef.current);
    };

    // Cleanup the animation frame on component unmount
    useEffect(() => {
        return () => cancelAnimationFrame(animationFrameRef.current);
    }, []);


    return (
        <div className="h-full w-full grid md:grid-cols-12 gap-8 p-4 sm:p-8">
            <div className="md:col-span-5 flex flex-col justify-center">
                <header className="mb-6">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Instant & Accurate Transcription</h2>
                    <p className="text-slate-500 mt-2">Get speaker-labeled transcripts in seconds, ready for editing or repurposing.</p>
                </header>
                <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200 w-full mt-4">
                     <h4 className="font-semibold text-slate-800 mb-4">{selected.title}</h4>
                     <audio 
                        key={selected.id} 
                        ref={audioRef}
                        src={selected.src} 
                        controls 
                        className="w-full styled-audio"
                        onPlay={handlePlay}
                        onPause={handlePauseOrEnd}
                        onEnded={handlePauseOrEnd}
                        onSeeked={() => {
                            // Update time immediately on seek
                            if(audioRef.current) setCurrentTime(audioRef.current.currentTime);
                        }}
                     />
                </div>
            </div>
            <div className="md:col-span-7 bg-white rounded-2xl p-4 sm:p-6 flex flex-col shadow-2xl shadow-slate-200 overflow-hidden">
                <div ref={containerRef} className="flex-grow overflow-y-auto space-y-5 pr-4 font-sans h-96">
                    {selected.segments.map((segment, i) => {
                        // The logic remains the same, but it's now driven by a much faster update
                        const isActive = currentTime >= segment.start && currentTime < segment.end;
                        return (
                            <div key={i} data-active={isActive} className={cn("p-3 rounded-lg transition-all duration-200", isActive ? "bg-violet-100" : "")}>
                                <p className={cn("font-bold text-sm", isActive ? "text-violet-600" : "text-slate-500")}>{segment.speaker}</p>
                                <p className={cn("text-slate-700 text-lg leading-relaxed", isActive ? "text-slate-900" : "text-slate-700")}>{segment.text}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const Demos = () => {
    const [activeStudio, setActiveStudio] = useState('video');
    const features = [
        { id: 'video', label: 'Video', icon: Video, component: <VideoStudio /> },
        { id: 'voiceover', label: 'Voiceover', icon: Voicemail, component: <VoiceoverStudio /> },
        { id: 'dubbing', label: 'Dubbing', icon: Languages, component: <DubbingStudio /> },
        { id: 'transcription', label: 'Transcription', icon: FileText, component: <TranscriptionStudio /> },
    ];
    const activeComponent = features.find(f => f.id === activeStudio)?.component;

    return (
        <div className="min-h-screen w-full bg-slate-50/50 selection:bg-violet-200">
            <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]"></div>
            <Navbar />
            <main className="pt-24">
                <AppHeader features={features} activeStudio={activeStudio} setActiveStudio={setActiveStudio} />
                <div className="w-full h-[calc(100vh-10rem)] max-w-7xl mx-auto mt-4">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeStudio}
                            initial={{ opacity: 0, scale: 0.98, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] } }}
                            exit={{ opacity: 0, scale: 0.98, y: -20, transition: { duration: 0.3, ease: "easeIn" } }}
                            className="w-full h-full"
                        >
                            {activeComponent}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Demos;