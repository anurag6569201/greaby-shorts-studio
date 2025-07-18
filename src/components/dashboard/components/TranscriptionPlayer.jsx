// src/components/dashboard/TranscriptionPlayer.js
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { toast } from 'sonner';
import {
  Loader2, AlertCircle, Play, Pause, AlertTriangle, Search, Edit, Download,
  ChevronLeft, ChevronRight, FileText, Languages as LanguagesIcon,
  Undo2, Redo2, Replace, Volume2, VolumeX, Maximize2, Minimize2,
  RefreshCw, Baseline, Clock, HelpCircle, Settings2, ChevronsLeft, ChevronsRight,
  CornerRightDown, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useDebounce } from 'use-debounce';
import { cn } from '@/lib/utils';

const TICKS_PER_SECOND = 10_000_000;
const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
const LOW_CONFIDENCE_THRESHOLD = 0.85;

const formatTime = (seconds, withMs = true) => {
  if (isNaN(seconds) || seconds < 0) return withMs ? "00:00.000" : "00:00";
  const date = new Date(seconds * 1000);
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const secs = date.getUTCSeconds().toString().padStart(2, '0');
  if (!withMs) return `${minutes}:${secs}`;
  const ms = date.getUTCMilliseconds().toString().padStart(3, '0');
  return `${minutes}:${secs}.${ms}`;
};

const parseTime = (timeStr) => {
  if (!timeStr) return NaN;
  const parts = timeStr.split(':');
  if (parts.length !== 2) return NaN;
  const secondsAndMs = parseFloat(parts[1]);
  if (isNaN(secondsAndMs)) return NaN;
  const minutes = parseInt(parts[0], 10);
  if (isNaN(minutes)) return NaN;
  return (minutes * 60) + secondsAndMs;
};

const WordItem = React.memo(({ word, index, isActive, isSearchResult, isCurrentSearchResult, progress, handleSeek, showLowConfidence }) => {
  const isLowConfidence = word.confidence < LOW_CONFIDENCE_THRESHOLD;
  return (
    <span data-word-index={index} className={cn("relative cursor-pointer transition-colors duration-150 rounded-sm p-0.5 -m-0.5 group", isCurrentSearchResult && 'ring-2 ring-yellow-400 bg-yellow-200/80', isSearchResult && !isCurrentSearchResult && 'bg-yellow-200/70', isActive && 'bg-blue-100 dark:bg-blue-900/50')} onClick={() => handleSeek(word.offsetInTicks / TICKS_PER_SECOND)}>
      {isActive && (<span className="absolute top-0 left-0 h-full bg-blue-500/30 rounded-sm" style={{ width: `${progress}%` }} />)}
      <span className={cn("relative z-10 transition-colors", isActive && 'text-blue-600 dark:text-blue-300 font-medium', showLowConfidence && isLowConfidence && 'border-b-2 border-dashed border-orange-500')}>{word.word}</span>{' '}
    </span>
  );
});
WordItem.displayName = 'WordItem';

const ParagraphEditor = React.memo(({ phrase, phraseIndex, onParagraphChange, onTimestampChange, handleSeek }) => {
    const initialText = phrase.nBest[0].display;
    const [text, setText] = useState(initialText);
    const textareaRef = useRef(null);
    const phraseStartTime = phrase.offsetInTicks / TICKS_PER_SECOND;
    const phraseEndTime = (phrase.offsetInTicks + phrase.durationInTicks) / TICKS_PER_SECOND;
    const [startTimeStr, setStartTimeStr] = useState(formatTime(phraseStartTime));
    const [endTimeStr, setEndTimeStr] = useState(formatTime(phraseEndTime));
    
    useEffect(() => { setText(initialText); }, [initialText]);
    useEffect(() => { setStartTimeStr(formatTime(phraseStartTime)); setEndTimeStr(formatTime(phraseEndTime)); }, [phraseStartTime, phraseEndTime]);
    useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; } }, [text]);
    
    const handleTextBlur = () => { if (text.trim() !== initialText) { onParagraphChange(phraseIndex, text); } };
    const handleTimeBlur = (type, value) => { const newTimeInSeconds = parseTime(value); if (isNaN(newTimeInSeconds)) { if (type === 'start') setStartTimeStr(formatTime(phraseStartTime)); else setEndTimeStr(formatTime(phraseEndTime)); return; } const originalTime = type === 'start' ? phraseStartTime : phraseEndTime; if (Math.abs(newTimeInSeconds - originalTime) > 0.001) { onTimestampChange(phraseIndex, type, newTimeInSeconds); } };
    const handleKeyDown = (e) => { e.stopPropagation(); if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y')) { e.stopPropagation(); } };
    
    return (<div className="flex flex-col sm:flex-row items-start gap-1 mb-4 group p-2 rounded-md hover:bg-muted/50 transition-colors"><div className="flex-shrink-0 flex items-center gap-2 w-full sm:w-auto" style={{flexDirection:'row-reverse'}}><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground" onClick={() => handleSeek(phraseStartTime)}><Play className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>Play from here</p></TooltipContent></Tooltip></TooltipProvider><div className="flex flex-wrap items-center gap-1 rounded-md bg-muted/30" style={{flexDirection:'column'}}><Input value={startTimeStr} onChange={(e) => setStartTimeStr(e.target.value)} onBlur={(e) => handleTimeBlur('start', e.target.value)} className="w-30 h-9 text-xs font-mono text-center" /><Input value={endTimeStr} onChange={(e) => setEndTimeStr(e.target.value)} onBlur={(e) => handleTimeBlur('end', e.target.value)} className="w-30 h-9 text-xs font-mono text-center" /></div></div><Textarea ref={textareaRef} value={text} onChange={(e) => setText(e.target.value)} onBlur={handleTextBlur} onKeyDown={handleKeyDown} className="w-full text-base leading-relaxed p-2 border-blue-200 focus-visible:ring-blue-400 bg-blue-50/50 dark:bg-blue-900/10" rows={1} /></div>);
});
ParagraphEditor.displayName = 'ParagraphEditor';

const KeyboardShortcutsHelp = () => ( <Dialog><DialogTrigger asChild><Button variant="outline" size="icon"><HelpCircle className="w-4 h-4" /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Keyboard Shortcuts</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm"><div className="font-semibold">Play / Pause</div><div className="font-mono text-muted-foreground">Space</div><div className="font-semibold">Undo</div><div className="font-mono text-muted-foreground">Ctrl/Cmd + Z</div><div className="font-semibold">Redo</div><div className="font-mono text-muted-foreground">Ctrl/Cmd + Y</div><div className="font-semibold">Find & Replace</div><div className="font-mono text-muted-foreground">Ctrl/Cmd + F</div><div className="font-semibold">Skip Forward 5s</div><div className="font-mono text-muted-foreground">→</div><div className="font-semibold">Skip Backward 5s</div><div className="font-mono text-muted-foreground">←</div><div className="font-semibold">Skip Forward 15s</div><div className="font-mono text-muted-foreground">Shift + →</div><div className="font-semibold">Skip Backward 15s</div><div className="font-mono text-muted-foreground">Shift + ←</div><div className="font-semibold">Increase Speed</div><div className="font-mono text-muted-foreground">]</div><div className="font-semibold">Decrease Speed</div><div className="font-mono text-muted-foreground">[</div><div className="font-semibold">Mute / Unmute</div><div className="font-mono text-muted-foreground">M</div><div className="font-semibold">Jump to Start</div><div className="font-mono text-muted-foreground">Home</div><div className="font-semibold">Jump to End</div><div className="font-mono text-muted-foreground">End</div></div></DialogContent></Dialog> );
const ExportDialog = ({ onExport }) => {
    const [format, setFormat] = useState('txt'); const [includeTimestamps, setIncludeTimestamps] = useState(true);
    const handleExportClick = () => { onExport({ format, options: { includeTimestamps: format === 'txt' && includeTimestamps } }); };
    return (<Dialog><DialogTrigger asChild><Button variant="outline"><Download className="w-4 h-4 mr-2" />Export</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Export Transcript</DialogTitle><DialogDescription>Choose your export format and options.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label>Format</Label><Select value={format} onValueChange={setFormat}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="txt">Plain Text (.txt)</SelectItem><SelectItem value="srt">SubRip Subtitle (.srt)</SelectItem><SelectItem value="vtt">WebVTT Subtitle (.vtt)</SelectItem><SelectItem value="csv">Comma-separated Values (.csv)</SelectItem><SelectItem value="json">JSON (.json)</SelectItem></SelectContent></Select></div>{format === 'txt' && (<div className="space-y-4 rounded-md border p-4"><h4 className="text-sm font-medium">Text Options</h4><div className="flex items-center space-x-2"><Checkbox id="include-timestamps" checked={includeTimestamps} onCheckedChange={setIncludeTimestamps} /><Label htmlFor="include-timestamps">Include timestamps</Label></div></div>)}</div><DialogFooter><DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose><DialogClose asChild><Button onClick={handleExportClick}>Export</Button></DialogClose></DialogFooter></DialogContent></Dialog>);
};

const TranscriptionPlayer = ({ item, transcriptJson }) => {
    const wavesurferRef = useRef(null);
    const transcriptContainerRef = useRef(null);
    const searchInputRef = useRef(null);
    const waveformContainerRef = useRef(null);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isWaveformReady, setIsWaveformReady] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    
    const [isEditing, setIsEditing] = useState(false);
    const [isParagraphEditing, setIsParagraphEditing] = useState(false);
    const [transcript, setTranscript] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    
    const [searchTerm, setSearchTerm] = useState("");
    const [replaceTerm, setReplaceTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [currentResultIndex, setCurrentResultIndex] = useState(-1);
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [wholeWord, setWholeWord] = useState(false);
    const [showSearchPanel, setShowSearchPanel] = useState(false);
    const [showLowConfidence, setShowLowConfidence] = useState(false);
    const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

    const flatWords = useMemo(() => {
        if (!transcript?.recognizedPhrases) return [];
        return transcript.recognizedPhrases.flatMap(p => p.nBest?.[0]?.words || []);
    }, [transcript]);
    
    useEffect(() => {
        const audioUrl = item?.source_url;
        const waveformEl = waveformContainerRef.current;
        if (!waveformEl || !audioUrl || !transcript) {
            return;
        }
        setIsWaveformReady(false);
        setIsLoadingAudio(true);
        setCurrentTime(0);
        setDuration(0);
        setIsPlaying(false);
        if (wavesurferRef.current) {
            wavesurferRef.current.destroy();
        }
        try {
            const ws = WaveSurfer.create({
                container: waveformEl,
                waveColor: '#A8B5C0',
                progressColor: '#3B82F6',
                cursorColor: '#1E40AF',
                barWidth: 2,
                barRadius: 3,
                responsive: true,
                height: 60,
                normalize: true,
            });
            wavesurferRef.current = ws;
            ws.on('ready', (d) => {
                setDuration(d);
                setIsWaveformReady(true);
                setIsLoadingAudio(false);
            });
            ws.on('audioprocess', (time) => setCurrentTime(time));
            ws.on('seek', (time) => setCurrentTime(time));
            ws.on('play', () => setIsPlaying(true));
            ws.on('pause', () => setIsPlaying(false));
            ws.on('finish', () => {
                setIsPlaying(false);
                ws.seekTo(0);
                setCurrentTime(0);
            });
            ws.on('error', (e) => {
                setIsWaveformReady(false);
                setIsLoadingAudio(false);
                toast.error("Error Loading Audio", { description: "The audio file could not be loaded. Check console for details (e.g., CORS)." });
            });
            ws.load(audioUrl);
        } catch (error) {
            console.error("Failed to create or load WaveSurfer instance:", error);
            setIsLoadingAudio(false);
        }
 
        return () => {
            if (wavesurferRef.current) {
                wavesurferRef.current.destroy();
                wavesurferRef.current = null;
            }
        };
    }, [item?.source_url, transcript]);


    useEffect(() => { setTranscript(transcriptJson); if (transcriptJson) { setHistory([transcriptJson]); setHistoryIndex(0); } }, [transcriptJson]);
    
    useEffect(() => { 
        const ws = wavesurferRef.current; 
        if (ws && isWaveformReady) { 
            ws.setVolume(isMuted ? 0 : volume); 
            ws.setPlaybackRate(playbackRate); 
        } 
    }, [volume, isMuted, playbackRate, isWaveformReady]);

    const saveToHistory = useCallback((newTranscript) => { const newHistory = [...history.slice(0, historyIndex + 1), newTranscript]; setHistory(newHistory); setHistoryIndex(newHistory.length - 1); }, [history, historyIndex]);
    const handleUndo = useCallback(() => { if (historyIndex > 0) { const newIndex = historyIndex - 1; setTranscript(history[newIndex]); setHistoryIndex(newIndex); } }, [history, historyIndex]);
    const handleRedo = useCallback(() => { if (historyIndex < history.length - 1) { const newIndex = historyIndex + 1; setTranscript(history[newIndex]); setHistoryIndex(newIndex); } }, [history, historyIndex]);

    const handleSearch = useCallback(() => { if (!debouncedSearchTerm) { setSearchResults([]); setCurrentResultIndex(-1); return; } const flags = caseSensitive ? 'g' : 'gi'; const pattern = wholeWord ? `\\b${debouncedSearchTerm}\\b` : debouncedSearchTerm; const searchRegex = new RegExp(pattern, flags); const results = flatWords.reduce((acc, word, index) => { if (word.word.match(searchRegex)) { acc.push(index); } return acc; }, []); setSearchResults(results); const newIndex = results.length > 0 ? 0 : -1; setCurrentResultIndex(newIndex); if (newIndex !== -1) { scrollToWord(results[newIndex]); } }, [debouncedSearchTerm, caseSensitive, wholeWord, flatWords]);
    useEffect(() => { handleSearch(); }, [handleSearch]);
    
    const scrollToWord = useCallback((wordIndex) => { const wordElement = transcriptContainerRef.current?.querySelector(`[data-word-index="${wordIndex}"]`); if (wordElement) { wordElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, []);
    
    const handlePlayPause = useCallback(() => { if (isWaveformReady) { wavesurferRef.current?.playPause(); } }, [isWaveformReady]);
    const changePlaybackRate = useCallback((direction) => { if (!isWaveformReady) return; const currentIndex = PLAYBACK_RATES.indexOf(playbackRate); const newIndex = Math.max(0, Math.min(PLAYBACK_RATES.length - 1, currentIndex + direction)); setPlaybackRate(PLAYBACK_RATES[newIndex]); }, [playbackRate, isWaveformReady]);
    const handleSeek = useCallback((time) => { if (wavesurferRef.current && isWaveformReady && duration > 0) { const newTime = Math.max(0, Math.min(duration, time)); wavesurferRef.current.seekTo(newTime / duration); } }, [isWaveformReady, duration]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const targetNode = e.target.nodeName.toUpperCase(); if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetNode) && e.key !== 'Escape') return; let handled = false;
            const isPlayerReady = isWaveformReady; if (!isPlayerReady && !['z', 'y', 'f'].includes(e.key)) return;
            switch (e.key) {
                case ' ': if (!e.ctrlKey && !e.metaKey) { if (isPlayerReady) { handlePlayPause(); handled = true; } } break;
                case 'z': if (e.ctrlKey || e.metaKey) { handleUndo(); handled = true; } break;
                case 'y': if (e.ctrlKey || e.metaKey) { handleRedo(); handled = true; } break;
                case 'f': if (e.ctrlKey || e.metaKey) { setShowSearchPanel(p => !p); setTimeout(() => searchInputRef.current?.focus(), 0); handled = true; } break;
                case 'ArrowRight': if (isPlayerReady) { handleSeek(currentTime + (e.shiftKey ? 15 : 5)); handled = true; } break;
                case 'ArrowLeft': if (isPlayerReady) { handleSeek(currentTime - (e.shiftKey ? 15 : 5)); handled = true; } break;
                case ']': if (isPlayerReady) { changePlaybackRate(1); handled = true; } break;
                case '[': if (isPlayerReady) { changePlaybackRate(-1); handled = true; } break;
                case 'm': if (isPlayerReady) { setIsMuted(m => !m); handled = true; } break;
                case 'Home': if (isPlayerReady) { handleSeek(0); handled = true; } break;
                case 'End': if (isPlayerReady) { handleSeek(duration); handled = true; } break;
            }
            if (handled) e.preventDefault();
        };
        window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo, handlePlayPause, handleSeek, currentTime, duration, changePlaybackRate, isWaveformReady]);

    const handleParagraphChange = (phraseIndex, newText) => { const trimmedText = newText.trim(); const newWordsArray = trimmedText.split(/\s+/).filter(Boolean); const newTranscript = JSON.parse(JSON.stringify(transcript)); const phraseToUpdate = newTranscript.recognizedPhrases[phraseIndex]; const phraseStartTime = phraseToUpdate.offsetInTicks; const phraseDuration = phraseToUpdate.durationInTicks; const numWords = newWordsArray.length; const avgDurationPerWord = numWords > 0 ? Math.floor(phraseDuration / numWords) : 0; let accumulatedOffset = phraseStartTime; const updatedWords = newWordsArray.map((wordStr, i) => { const isLastWord = i === numWords - 1; const wordDuration = isLastWord ? (phraseStartTime + phraseDuration) - accumulatedOffset : avgDurationPerWord; const newWord = { word: wordStr, offsetInTicks: accumulatedOffset, durationInTicks: wordDuration, confidence: 1.0, }; accumulatedOffset += wordDuration; return newWord; }); phraseToUpdate.nBest.forEach(nBestItem => { nBestItem.words = updatedWords; nBestItem.display = trimmedText; nBestItem.lexical = trimmedText.toLowerCase(); }); setTranscript(newTranscript); saveToHistory(newTranscript); };
    const handleTimestampChange = (phraseIndex, type, newTimeInSeconds) => { const newTranscript = JSON.parse(JSON.stringify(transcript)); const phraseToUpdate = newTranscript.recognizedPhrases[phraseIndex]; const currentOffsetInSeconds = phraseToUpdate.offsetInTicks / TICKS_PER_SECOND; const currentDurationInSeconds = phraseToUpdate.durationInTicks / TICKS_PER_SECOND; const currentEndInSeconds = currentOffsetInSeconds + currentDurationInSeconds; if (type === 'start') { const newOffsetInTicks = newTimeInSeconds * TICKS_PER_SECOND; const newDurationInSeconds = currentEndInSeconds - newTimeInSeconds; if (newDurationInSeconds > 0) { phraseToUpdate.offsetInTicks = newOffsetInTicks; phraseToUpdate.durationInTicks = newDurationInSeconds * TICKS_PER_SECOND; } } else { const newDurationInSeconds = newTimeInSeconds - currentOffsetInSeconds; if (newDurationInSeconds > 0) { phraseToUpdate.durationInTicks = newDurationInSeconds * TICKS_PER_SECOND; } } setTranscript(newTranscript); saveToHistory(newTranscript); };
    const navigateSearchResults = (direction) => { if (searchResults.length === 0) return; const newIndex = (currentResultIndex + direction + searchResults.length) % searchResults.length; setCurrentResultIndex(newIndex); scrollToWord(searchResults[newIndex]); };
    const performReplace = (indicesToReplace) => { if (!replaceTerm && replaceTerm !== '') return; let newTranscript = JSON.parse(JSON.stringify(transcript)); let globalWordIndex = 0; const flags = caseSensitive ? 'g' : 'gi'; const pattern = wholeWord ? `\\b${searchTerm}\\b` : searchTerm; const searchRegex = new RegExp(pattern, flags); newTranscript.recognizedPhrases.forEach(phrase => { let phraseDisplayNeedsUpdate = false; phrase.nBest[0].words.forEach(word => { if (indicesToReplace.includes(globalWordIndex)) { word.word = word.word.replace(searchRegex, replaceTerm); phraseDisplayNeedsUpdate = true; } globalWordIndex++; }); if (phraseDisplayNeedsUpdate) { const newDisplayText = phrase.nBest[0].words.map(w => w.word).join(' '); phrase.nBest.forEach(nBestItem => { nBestItem.display = newDisplayText; nBestItem.lexical = newDisplayText.toLowerCase(); }); } }); setTranscript(newTranscript); saveToHistory(newTranscript); handleSearch(); };
    const handleReplace = () => { if (searchResults.length === 0 || currentResultIndex === -1) return; performReplace([searchResults[currentResultIndex]]); };
    const handleReplaceAll = () => { if (searchResults.length === 0) return; performReplace(searchResults); };
    
    const handleExport = ({ format, options }) => {
        let content, mimeType, extension;
        const to_srt_vtt = (type) => { let output = type === 'vtt' ? 'WEBVTT\n\n' : ''; let count = 1; transcript.recognizedPhrases.forEach(phrase => { if (phrase.nBest[0].words?.length > 0) { const startTime = phrase.offsetInTicks / TICKS_PER_SECOND; const endTime = (phrase.offsetInTicks + phrase.durationInTicks) / TICKS_PER_SECOND; const timeSeparator = type === 'vtt' ? '.' : ','; output += `${count++}\n${formatTime(startTime).replace('.', timeSeparator)} --> ${formatTime(endTime).replace('.', timeSeparator)}\n${phrase.nBest[0].display}\n\n`; } }); return output; };
        const to_plain_text = ({ includeTimestamps }) => { return transcript.recognizedPhrases.map(phrase => { let line = includeTimestamps ? `[${formatTime(phrase.offsetInTicks / TICKS_PER_SECOND, false)}] ` : ''; line += phrase.nBest[0].display; return line; }).join('\n'); };
        const to_csv = () => { let csv = 'start_time_seconds,end_time_seconds,text\n'; transcript.recognizedPhrases.forEach(phrase => { const startTime = (phrase.offsetInTicks / TICKS_PER_SECOND).toFixed(3); const endTime = ((phrase.offsetInTicks + phrase.durationInTicks) / TICKS_PER_SECOND).toFixed(3); const text = `"${phrase.nBest[0].display.replace(/"/g, '""')}"`; csv += `${startTime},${endTime},${text}\n`; }); return csv; };
        switch (format) { case 'txt': content = to_plain_text(options); mimeType = 'text/plain'; extension = 'txt'; break; case 'srt': content = to_srt_vtt('srt'); mimeType = 'text/plain'; extension = 'srt'; break; case 'vtt': content = to_srt_vtt('vtt'); mimeType = 'text/vtt'; extension = 'vtt'; break; case 'csv': content = to_csv(); mimeType = 'text/csv'; extension = 'csv'; break; case 'json': content = JSON.stringify(transcript, null, 2); mimeType = 'application/json'; extension = 'json'; break; default: return; }
        const blob = new Blob([content], { type: mimeType }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${item?.title?.replace(/[^a-z0-9]/gi, '_') || 'transcript'}.${extension}`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    };

    const toggleFullscreen = () => { const elem = transcriptContainerRef.current?.parentElement?.parentElement; if (!elem) return; if (!document.fullscreenElement) { elem.requestFullscreen().catch(err => alert(`Error: ${err.message}`)); } else { document.exitFullscreen(); } };
    useEffect(() => { const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement); document.addEventListener('fullscreenchange', onFullscreenChange); return () => document.removeEventListener('fullscreenchange', onFullscreenChange); }, []);

    if (!transcript) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (transcript.error) return <div className="flex items-center justify-center h-full text-red-500"><AlertCircle className="w-5 h-5 mr-2" />{transcript.error}</div>;
    
    return (
        <div className={cn("flex flex-col gap-4 h-full", isFullscreen && "fixed inset-0 z-50 p-4 bg-background")}>
            <div className="flex items-center gap-2 border-b pb-2 flex-wrap">
                <Button variant={isEditing ? 'outline' : 'outline'} size="sm" onClick={() => setIsEditing(!isEditing)}><Edit className="w-4 h-4 mr-2" />{isEditing ? 'Finish Editing' : 'Edit Transcript'}</Button>
                {isEditing && (<div className="flex gap-1"><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={handleUndo} disabled={historyIndex <= 0}><Undo2 className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Undo (Ctrl+Z)</p></TooltipContent></Tooltip></TooltipProvider><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={handleRedo} disabled={historyIndex >= history.length - 1}><Redo2 className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Redo (Ctrl+Y)</p></TooltipContent></Tooltip></TooltipProvider><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant={isParagraphEditing ? 'default' : 'outline'} size="icon" onClick={() => setIsParagraphEditing(!isParagraphEditing)}><Baseline className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>{isParagraphEditing ? 'Word-by-word editing' : 'Paragraph editing'}</p></TooltipContent></Tooltip></TooltipProvider></div>)}
                <div className="flex-grow"></div>
                <div className="flex gap-1 items-center"><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => setShowSearchPanel(!showSearchPanel)}><Search className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Search / Replace (Ctrl+F)</p></TooltipContent></Tooltip></TooltipProvider><Popover><PopoverTrigger asChild><Button variant="outline" size="icon"><Settings2 className="w-4 h-4" /></Button></PopoverTrigger><PopoverContent className="w-64"><div className="space-y-4"><div className="flex items-center justify-between"><Label htmlFor="low-confidence-switch">Highlight low confidence</Label><Switch id="low-confidence-switch" checked={showLowConfidence} onCheckedChange={setShowLowConfidence} /></div></div></PopoverContent></Popover><KeyboardShortcutsHelp /><Button variant="outline" size="icon" onClick={toggleFullscreen}>{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</Button></div>
            </div>
            {showSearchPanel && (<div className="p-3 bg-muted/50 rounded-lg space-y-2" ><div className="flex flex-wrap gap-2 items-center"><div className="relative flex-grow"><Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input ref={searchInputRef} placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />{searchResults.length > 0 && (<span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currentResultIndex + 1}/{searchResults.length}</span>)}</div><div className="flex"><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigateSearchResults(-1)} disabled={searchResults.length === 0}><ChevronLeft className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Previous</TooltipContent></Tooltip></TooltipProvider><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigateSearchResults(1)} disabled={searchResults.length === 0}><ChevronRight className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Next</TooltipContent></Tooltip></TooltipProvider></div><Input placeholder="Replace with..." value={replaceTerm} onChange={(e) => setReplaceTerm(e.target.value)} className="h-9 flex-grow" /><Button variant="outline" size="sm" onClick={handleReplace} disabled={!searchTerm || searchResults.length === 0}><CornerRightDown className="w-4 h-4 mr-2" />Replace</Button><Button variant="outline" size="sm" onClick={handleReplaceAll} disabled={!searchTerm || searchResults.length === 0}><RefreshCw className="w-4 h-4 mr-2" />Replace All</Button></div><div className="flex flex-wrap gap-x-4 gap-y-2 items-center"><div className="flex items-center space-x-2"><Switch id="case-sensitive" checked={caseSensitive} onCheckedChange={setCaseSensitive} /><Label htmlFor="case-sensitive">Case sensitive</Label></div><div className="flex items-center space-x-2"><Switch id="whole-word" checked={wholeWord} onCheckedChange={setWholeWord} /><Label htmlFor="whole-word">Whole word</Label></div></div></div>)}
            <div ref={transcriptContainerRef} className="prose prose-sm max-w-none p-4 border rounded-lg overflow-y-auto bg-background flex-grow leading-relaxed min-h-0">
                {isEditing && isParagraphEditing ? (<div>{transcript.recognizedPhrases.map((phrase, phraseIndex) => (<ParagraphEditor key={`${phrase.offsetInTicks}-${phraseIndex}`} phrase={phrase} phraseIndex={phraseIndex} onParagraphChange={handleParagraphChange} onTimestampChange={handleTimestampChange} handleSeek={handleSeek} />))}</div>) : (<div>{flatWords.map((word, index) => { const currentTicks = currentTime * TICKS_PER_SECOND; const isActive = currentTicks >= word.offsetInTicks && currentTicks < (word.offsetInTicks + word.durationInTicks); const progress = isActive ? Math.min(100, ((currentTicks - word.offsetInTicks) / word.durationInTicks) * 100) : 0; return ( <WordItem key={`${word.offsetInTicks}-${index}`} word={word} index={index} isActive={isActive} isSearchResult={searchResults.includes(index)} isCurrentSearchResult={searchResults[currentResultIndex] === index} progress={progress} handleSeek={handleSeek} showLowConfidence={showLowConfidence} /> ); })}</div>)}
            </div>
            <div className="p-2 sm:p-3 border bg-muted/50 rounded-lg flex flex-col gap-3">
                <div className="flex w-full items-center gap-2 sm:gap-3"><span className="text-xs font-mono text-muted-foreground w-16 sm:w-20 text-center">{formatTime(currentTime)}</span><div className="w-full relative h-[60px]"><div ref={waveformContainerRef} className="w-full h-full" />{isLoadingAudio && (<div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"><Loader2 className="w-6 h-6 animate-spin text-primary" /><span className="ml-2 text-sm text-muted-foreground">Loading audio...</span></div>)}</div><span className="text-xs font-mono text-muted-foreground w-16 sm:w-20 text-center">{formatTime(duration)}</span></div>
                <div className="flex w-full flex-wrap items-center justify-center gap-y-2 gap-x-4 sm:justify-between">
                    <div className="flex items-center gap-1 sm:gap-2">
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button onClick={() => handleSeek(currentTime - 15)} size="icon" variant="ghost" className="w-8 h-8 flex-shrink-0" disabled={!isWaveformReady}><ChevronsLeft className="w-5 h-5" /></Button></TooltipTrigger><TooltipContent>Skip back 15s (Shift+Left)</TooltipContent></Tooltip></TooltipProvider>
                        <Button onClick={handlePlayPause} size="icon" className="w-10 h-10 flex-shrink-0" disabled={!isWaveformReady}>{isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}</Button>
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button onClick={() => handleSeek(currentTime + 15)} size="icon" variant="ghost" className="w-8 h-8 flex-shrink-0" disabled={!isWaveformReady}><ChevronsRight className="w-5 h-5" /></Button></TooltipTrigger><TooltipContent>Skip forward 15s (Shift+Right)</TooltipContent></Tooltip></TooltipProvider>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <Select value={playbackRate.toString()} onValueChange={(value) => setPlaybackRate(parseFloat(value))} disabled={!isWaveformReady}><SelectTrigger className="w-[80px] h-9"><SelectValue placeholder="Speed" /></SelectTrigger><SelectContent>{PLAYBACK_RATES.map(rate => (<SelectItem key={rate} value={rate.toString()}>{rate.toFixed(2)}x</SelectItem>))}</SelectContent></Select>
                        <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9" disabled={!isWaveformReady}>{isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</Button></PopoverTrigger><PopoverContent className="w-40 p-2 mb-2"><div className="flex items-center gap-2"><Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setIsMuted(!isMuted)}>{isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</Button><Slider min={0} max={1} step={0.01} value={isMuted ? [0] : [volume]} onValueChange={([val]) => { setVolume(val); if (val > 0 && isMuted) setIsMuted(false); }}/></div></PopoverContent></Popover>
                        <ExportDialog onExport={handleExport} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TranscriptionPlayer;