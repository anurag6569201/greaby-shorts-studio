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
        <div className="p-4 sm:p-8 space-y-8 h-full flex flex-col">
            <header className="text-center">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">AI Video Generation Studio</h2>
                <p className="text-slate-500 mt-2 max-w-2xl mx-auto">Turn text into captivating video. Select a clip below to see the AI's interpretation of a prompt.</p>
            </header>
            <div className="flex-grow flex flex-col items-center justify-center">
                <div className="relative w-full max-w-4xl aspect-video mb-8">
                    <AnimatePresence>
                        <motion.div
                            key={selected.id}
                            layoutId={selected.id}
                            className="absolute inset-0 bg-black rounded-2xl shadow-2xl shadow-primary/20 overflow-hidden"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] } }}
                            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.3 } }}
                        >
                            <video src={selected.src} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
                                <p className="font-mono text-xs uppercase tracking-widest opacity-70 mb-1">Prompt</p>
                                <p className="font-medium text-base leading-relaxed">{selected.prompt}</p>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
                    {DEMOS.video.map((video) => (
                        <motion.div
                            key={video.id}
                            onClick={() => setSelected(video)}
                            className={cn(
                                "relative aspect-video bg-black rounded-xl shadow-lg cursor-pointer overflow-hidden border-2 transition-all",
                                selected.id === video.id 
                                    ? "border-violet-500 scale-105 shadow-violet-200" 
                                    : "border-transparent hover:border-slate-300 hover:scale-105"
                            )}
                            whileHover={{ y: -4 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                        >
                            <video src={video.src} muted playsInline className="w-full h-full object-cover" />
                            {selected.id === video.id && (
                                <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-violet-500 flex items-center justify-center">
                                        <Play className="h-6 w-6 text-white ml-1" />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const VoiceoverStudio = () => {
    const [selected, setSelected] = useState(DEMOS.voiceover[0]);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const handleVoiceChange = (vo) => {
        setSelected(vo);
        setIsPlaying(false); // Stop playback when switching voices
    };
    
    return (
        <div className="w-full grid md:grid-cols-2 gap-8 p-4 sm:p-8 h-full">
            <div className="flex flex-col justify-start items-start text-left">
                <header className="mb-6">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Lifelike Voiceovers</h2>
                    <p className="text-slate-500 mt-2">Choose from a library of premium AI voices that captivate and engage your audience.</p>
                </header>
                <div className="space-y-4 w-full flex-grow overflow-y-auto pr-2">
                    {DEMOS.voiceover.map(vo => (
                        <motion.div 
                            key={vo.id} 
                            onClick={() => handleVoiceChange(vo)}
                            className={cn(
                                "p-4 rounded-xl border-2 cursor-pointer transition-all bg-white",
                                selected.id === vo.id 
                                    ? "border-violet-400 shadow-lg scale-105 bg-violet-50" 
                                    : "border-transparent hover:border-slate-300 hover:bg-slate-50"
                            )}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <h4 className="font-bold text-slate-800">{vo.voice}</h4>
                            <p className="text-sm text-slate-500 mt-1">{vo.accent}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
            <div className="bg-white rounded-2xl p-6 lg:p-8 flex flex-col justify-between shadow-2xl shadow-slate-200">
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={selected.id} 
                        initial={{ opacity: 0, x: 20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="flex-grow flex flex-col h-full"
                    >
                        <div className="mb-6 flex items-center gap-4">
                            <button 
                                onClick={() => setIsPlaying(!isPlaying)} 
                                className="play-pause-btn flex-shrink-0 w-16 h-16 rounded-full bg-violet-500 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-violet-200"
                            >
                                {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1"/>}
                            </button>
                            <div className="w-full">
                                <Waveform 
                                    key={selected.id} 
                                    audioSrc={selected.src} 
                                    isPlaying={isPlaying} 
                                    onFinish={() => setIsPlaying(false)} 
                                />
                            </div>
                        </div>
                        <div className="text-slate-600 leading-relaxed text-lg flex-grow overflow-y-auto max-h-80 pr-2">
                            <p className="whitespace-pre-line">{selected.script}</p>
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
    const [isPlaying, setIsPlaying] = useState(false);

    const handlePlay = (videoRef, otherRef) => {
        if (videoRef && otherRef) {
            otherRef.currentTime = videoRef.currentTime;
            if (!otherRef.paused) {
                otherRef.play().catch(() => {});
            }
        }
        setIsPlaying(true);
    };

    const handlePause = () => {
        setIsPlaying(false);
    };

    const handleTimeUpdate = (videoRef, otherRef) => {
        if (videoRef && otherRef && !videoRef.paused && Math.abs(videoRef.currentTime - otherRef.currentTime) > 0.15) {
            otherRef.currentTime = videoRef.currentTime;
        }
    };
    
    return (
        <div className="h-full w-full flex flex-col p-4 sm:p-8">
            <header className="text-center mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Seamless AI Dubbing</h2>
                <p className="text-slate-500 mt-2 max-w-2xl mx-auto">Reach a global audience with perfectly synchronized, multi-lingual video dubbing. Play either video to see them sync automatically.</p>
            </header>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {[DEMOS.dubbing.original, DEMOS.dubbing.dubs[0]].map((video, index) => {
                    const isOriginal = index === 0;
                    const currentRef = isOriginal ? originalRef : dubRef;
                    const otherRef = isOriginal ? dubRef : originalRef;
                    
                    return (
                        <motion.div 
                            key={video.lang}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0, transition: { delay: index * 0.1, duration: 0.6 } }}
                            className="p-4 bg-white rounded-2xl shadow-2xl shadow-slate-200/80"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-slate-700">{video.label}</h3>
                                {isOriginal && (
                                    <span className="text-xs px-2 py-1 bg-violet-100 text-violet-700 rounded-full">Original</span>
                                )}
                                {!isOriginal && (
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">AI Dubbed</span>
                                )}
                            </div>
                            <div className="aspect-video bg-black rounded-xl overflow-hidden">
                                <video 
                                    ref={currentRef} 
                                    src={video.src} 
                                    controls 
                                    muted={!isOriginal}
                                    onPlay={() => handlePlay(currentRef.current, otherRef)}
                                    onPause={handlePause}
                                    onTimeUpdate={() => handleTimeUpdate(currentRef.current, otherRef.current)}
                                    playsInline 
                                    className="w-full h-full object-cover" 
                                />
                            </div>
                        </motion.div>
                    );
                })}
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