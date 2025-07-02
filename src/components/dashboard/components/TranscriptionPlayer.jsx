import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Loader2, AlertCircle, Play, Pause, AlertTriangle, Search, Edit, Download, 
  ChevronLeft, ChevronRight, FileText, Languages as LanguagesIcon, Mic, MicOff,
  UserPlus, History, Undo2, Redo2, Replace, ChevronsUpDown, Volume2, VolumeX,
  Maximize2, Minimize2, Speaker, RefreshCw, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useDebounce } from 'use-debounce';
import { cn } from '@/lib/utils';

const TICKS_PER_SECOND = 10_000_000;
const SPEAKER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return "00:00.0";
  const floorSeconds = Math.floor(seconds);
  const min = Math.floor(floorSeconds / 60);
  const sec = floorSeconds % 60;
  const ms = Math.floor((seconds - floorSeconds) * 10);
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms}`;
};

const WordItem = React.memo(({
  word, index, isActive, isSearchResult, isCurrentSearchResult,
  showSpeakerTag, speakerMap, speakerColors, progress, isEditing,
  handleWordChange, handleSeek, handleSpeakerNameChange, handleReassignSpeakerForPhrase
}) => {
  const speakerColor = speakerColors[word.speaker] || SPEAKER_COLORS[0];
  const availableSpeakers = Object.keys(speakerMap);

  return (
    <span data-word-index={index}>
      {showSpeakerTag && (
        <div className="flex items-center gap-2 mt-4 mb-1 group">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: speakerColor }}
          />
          {isEditing ? (
            <div className="flex items-center gap-1">
              <Input
                value={speakerMap[word.speaker] || ''}
                onChange={(e) => handleSpeakerNameChange(word.speaker, e.target.value)}
                className="h-7 font-bold pl-1 pr-1 w-32"
                placeholder={`Speaker ${word.speaker}`}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    <UserPlus className="h-4 w-4 mr-1"/> Assign
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {availableSpeakers.map(speakerId => (
                    <DropdownMenuItem
                      key={speakerId}
                      onSelect={() => handleReassignSpeakerForPhrase(word.phraseId, parseInt(speakerId))}
                    >
                      Assign to {speakerMap[speakerId]}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onSelect={() => {
                    const newSpeakerId = Math.max(...availableSpeakers.map(Number), 0) + 1;
                    handleSpeakerNameChange(newSpeakerId, `Speaker ${newSpeakerId}`);
                    handleReassignSpeakerForPhrase(word.phraseId, newSpeakerId);
                  }}>
                    <UserPlus className="h-4 w-4 mr-2" /> Create New Speaker
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center">
              <strong className="text-primary" style={{ color: speakerColor }}>
                {speakerMap[word.speaker] || `Speaker ${word.speaker}`}
              </strong>
              {isEditing && (
                <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 opacity-0 group-hover:opacity-100" 
                  onClick={(e) => {
                    e.stopPropagation();
                    const newSpeakerId = Math.max(...availableSpeakers.map(Number), 0) + 1;
                    handleSpeakerNameChange(newSpeakerId, `Speaker ${newSpeakerId}`);
                    handleReassignSpeakerForPhrase(word.phraseId, newSpeakerId);
                  }}>
                  <UserPlus className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <span
        className={`relative cursor-pointer transition-colors duration-150 rounded-sm p-0.5 -m-0.5 group ${
          isCurrentSearchResult ? 'ring-2 ring-yellow-400 bg-yellow-200/80' : 
          isSearchResult ? 'bg-yellow-200/70' : ''
        } ${isActive ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}
        onClick={() => handleSeek(word.offsetInTicks / TICKS_PER_SECOND)}
      >
        {isActive && (
          <span
            className="absolute top-0 left-0 h-full bg-blue-500/30 rounded-sm"
            style={{ width: `${progress}%` }}
          />
        )}
        <span className={`relative z-10 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-300 font-medium' : ''}`}>
          {isEditing ? (
            <Input
              value={word.word}
              onChange={(e) => handleWordChange(index, e.target.value)}
              className="h-6 inline-flex w-auto p-1 relative z-10 bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-blue-500"
              onKeyDown={(e) => e.stopPropagation()}
            />
          ) : (
            word.word
          )}
        </span>
      </span>
      {' '}
    </span>
  );
});
WordItem.displayName = 'WordItem';

const TranscriptionPlayer = ({ item, transcriptJson: initialTranscriptJson }) => {
  const audioRef = useRef(null);
  const transcriptContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const progressIntervalRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editableWords, setEditableWords] = useState([]);
  const [speakerMap, setSpeakerMap] = useState({});
  const [speakerColors, setSpeakerColors] = useState({});
  
  const [editHistory, setEditHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);

  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  
  useEffect(() => {
    if (!initialTranscriptJson || !initialTranscriptJson.recognizedPhrases) return;

    let allWords = [];
    initialTranscriptJson.recognizedPhrases.forEach(phrase => {
      if (phrase.nBest?.[0]?.words) {
        allWords.push(...phrase.nBest[0].words.map(word => ({
          ...word,
          speaker: phrase.speaker || 1,
          phraseId: phrase.id || Math.random().toString(36).substr(2, 9)
        })));
      }
    });
    setEditableWords(allWords);

    // Create speaker map from transcript if available
    const initialSpeakerMap = initialTranscriptJson.speakerMap || {};
    
    // Find all unique speakers from words
    const speakers = [...new Set(allWords.map(w => w.speaker).filter(Boolean))].sort((a,b) => a-b);
    
    // Fill in missing speakers
    speakers.forEach(sp => {
      if (!(sp in initialSpeakerMap)) {
        initialSpeakerMap[sp] = `Speaker ${sp}`;
      }
    });
    
    setSpeakerMap(initialSpeakerMap);
    
    // Assign colors to speakers
    const initialSpeakerColors = {};
    speakers.forEach((sp, idx) => {
      initialSpeakerColors[sp] = SPEAKER_COLORS[idx % SPEAKER_COLORS.length];
    });
    setSpeakerColors(initialSpeakerColors);
    
    const initialState = { words: allWords, speakerMap: initialSpeakerMap };
    setEditHistory([initialState]);
    setHistoryIndex(0);

  }, [initialTranscriptJson]);

  // Update audio volume and playback rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.playbackRate = playbackRate;
    }
  }, [volume, isMuted, playbackRate]);

  const saveToHistory = useCallback((newWords, newSpeakerMap) => {
    const newState = { words: newWords, speakerMap: newSpeakerMap };
    const newHistory = [...editHistory.slice(0, historyIndex + 1), newState];
    setEditHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [editHistory, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const prevState = editHistory[newIndex];
      setEditableWords(prevState.words);
      setSpeakerMap(prevState.speakerMap);
      setHistoryIndex(newIndex);
    }
  }, [editHistory, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < editHistory.length - 1) {
      const newIndex = historyIndex + 1;
      const nextState = editHistory[newIndex];
      setEditableWords(nextState.words);
      setSpeakerMap(nextState.speakerMap);
      setHistoryIndex(newIndex);
    }
  }, [editHistory, historyIndex]);

  const handleSearch = useCallback(() => {
    if (!debouncedSearchTerm) {
      setSearchResults([]);
      setCurrentResultIndex(-1);
      return;
    }

    const flags = caseSensitive ? 'g' : 'gi';
    const pattern = wholeWord ? `\\b${debouncedSearchTerm}\\b` : debouncedSearchTerm;
    const searchRegex = new RegExp(pattern, flags);

    const results = editableWords.reduce((acc, word, index) => {
      if (word.word.match(searchRegex)) {
        acc.push(index);
      }
      return acc;
    }, []);

    setSearchResults(results);
    const newIndex = results.length > 0 ? 0 : -1;
    setCurrentResultIndex(newIndex);

    if (newIndex !== -1) {
      scrollToWord(results[newIndex]);
    }
  }, [debouncedSearchTerm, caseSensitive, wholeWord, editableWords]);
  
  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const scrollToWord = useCallback((wordIndex) => {
    const wordElement = transcriptContainerRef.current?.querySelector(`[data-word-index="${wordIndex}"]`);
    if (wordElement) {
      wordElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        const targetNode = e.target.nodeName.toUpperCase();
        if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(targetNode)) return;
        e.preventDefault();
        handlePlayPause();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); handleRedo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { 
        e.preventDefault(); 
        searchInputRef.current?.focus();
        setShowSearchPanel(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') { 
        e.preventDefault(); 
        setShowSearchPanel(!showSearchPanel);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, showSearchPanel]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      
      if (audio.ended) {
        setIsPlaying(false);
        clearInterval(progressIntervalRef.current);
      }
    };
    
    if (isPlaying) {
      progressIntervalRef.current = setInterval(updateProgress, 50);
    } else {
      clearInterval(progressIntervalRef.current);
    }
    
    return () => clearInterval(progressIntervalRef.current);
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleLoadedData = () => {
      setDuration(audio.duration);
    };
    
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('ended', () => setIsPlaying(false));
    
    return () => {
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, []);

  const handlePlayPause = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioRef.current?.play()
        .then(() => setIsPlaying(true))
        .catch(e => console.error("Playback failed:", e));
    }
  };

  const handleSeek = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleWordChange = (index, newWordText) => {
    const newEditableWords = [...editableWords];
    newEditableWords[index] = { ...newEditableWords[index], word: newWordText };
    setEditableWords(newEditableWords);
    saveToHistory(newEditableWords, speakerMap);
  };

  const handleSpeakerNameChange = (speakerId, newName) => {
    const newSpeakerMap = { ...speakerMap, [speakerId]: newName };
    setSpeakerMap(newSpeakerMap);
    saveToHistory(editableWords, newSpeakerMap);
  };
  
  const handleReassignSpeakerForPhrase = (phraseId, newSpeakerId) => {
    const newEditableWords = editableWords.map(word => 
      word.phraseId === phraseId ? { ...word, speaker: newSpeakerId } : word
    );
    setEditableWords(newEditableWords);
    saveToHistory(newEditableWords, speakerMap);
  };

  const navigateSearchResults = (direction) => {
    if (searchResults.length === 0) return;
    const newIndex = (currentResultIndex + direction + searchResults.length) % searchResults.length;
    setCurrentResultIndex(newIndex);
    scrollToWord(searchResults[newIndex]);
  };

  const handleReplace = () => {
    if (!replaceTerm || searchResults.length === 0 || currentResultIndex === -1) return;

    const flags = caseSensitive ? 'g' : 'gi';
    const searchRegex = new RegExp(searchTerm, flags);
    const wordIndexToReplace = searchResults[currentResultIndex];

    const newEditableWords = [...editableWords];
    const wordToUpdate = newEditableWords[wordIndexToReplace];
    newEditableWords[wordIndexToReplace] = { ...wordToUpdate, word: wordToUpdate.word.replace(searchRegex, replaceTerm) };
    
    setEditableWords(newEditableWords);
    saveToHistory(newEditableWords, speakerMap);
    
    const newSearchResults = searchResults.filter(i => i !== wordIndexToReplace);
    setSearchResults(newSearchResults);
    if (newSearchResults.length > 0) {
      const nextIndex = currentResultIndex < newSearchResults.length ? currentResultIndex : newSearchResults.length - 1;
      setCurrentResultIndex(nextIndex);
      scrollToWord(newSearchResults[nextIndex]);
    } else {
      setCurrentResultIndex(-1);
    }
  };
  
  const handleReplaceAll = () => {
    if (!searchTerm || !replaceTerm || searchResults.length === 0) return;

    const flags = caseSensitive ? 'g' : 'gi';
    const pattern = wholeWord ? `\\b${searchTerm}\\b` : searchTerm;
    const searchRegex = new RegExp(pattern, flags);

    const newEditableWords = editableWords.map(word => {
      if(word.word.match(searchRegex)) {
        return {...word, word: word.word.replace(searchRegex, replaceTerm)};
      }
      return word;
    });
    
    setEditableWords(newEditableWords);
    saveToHistory(newEditableWords, speakerMap);
    setSearchTerm("");
    setReplaceTerm("");
    setSearchResults([]);
    setCurrentResultIndex(-1);
  };

  const generateCurrentJson = () => {
    let wordsCopy = [...editableWords];
    const newRecognizedPhrases = initialTranscriptJson.recognizedPhrases.map(phrase => {
      const phraseWordCount = phrase.nBest[0].words.length;
      const currentPhraseWords = wordsCopy.splice(0, phraseWordCount);
      
      const newNBest = phrase.nBest.map(nBestItem => {
        const updatedWords = nBestItem.words.map((originalWord, index) => ({
          ...originalWord,
          word: currentPhraseWords[index].word,
        }));
        return {
          ...nBestItem,
          words: updatedWords,
          display: currentPhraseWords.map(w => w.word).join(' '),
          lexical: currentPhraseWords.map(w => w.word).join(' ').toLowerCase(),
        };
      });
      const speakerId = currentPhraseWords.length > 0 ? currentPhraseWords[0].speaker : phrase.speaker;
      return { ...phrase, speaker: speakerId, nBest: newNBest };
    });
    return { ...initialTranscriptJson, recognizedPhrases: newRecognizedPhrases, speakerMap };
  };
  
  const to_srt = (json) => {
    let srt = '';
    let count = 1;
    json.recognizedPhrases.forEach(phrase => {
      const words = phrase.nBest[0].words;
      if (words && words.length > 0) {
        const startTime = words[0].offsetInTicks / TICKS_PER_SECOND;
        const endTime = (words[words.length - 1].offsetInTicks + words[words.length - 1].durationInTicks) / TICKS_PER_SECOND;
        
        const formatSRTTime = (s) => {
          const date = new Date(s * 1000);
          return `${date.getUTCHours().toString().padStart(2, '0')}:` +
                 `${date.getUTCMinutes().toString().padStart(2, '0')}:` +
                 `${date.getUTCSeconds().toString().padStart(2, '0')},` +
                 `${Math.floor((s % 1) * 1000).toString().padStart(3, '0')}`;
        };
        
        const speakerName = json.speakerMap[phrase.speaker] || `Speaker ${phrase.speaker}`;
        
        srt += `${count++}\n`;
        srt += `${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}\n`;
        srt += `${speakerName}: ${phrase.nBest[0].display}\n\n`;
      }
    });
    return srt;
  };
  
  const to_plain_text = (json) => {
     return json.recognizedPhrases.map(phrase => {
        const speakerName = json.speakerMap[phrase.speaker] || `Speaker ${phrase.speaker}`;
        return `${speakerName}: ${phrase.nBest[0].display}`;
      }).join('\n');
  };

  const handleDownload = (format) => {
    const updatedJson = generateCurrentJson();
    let content, mimeType, extension;

    switch (format) {
      case 'txt':
        content = to_plain_text(updatedJson);
        mimeType = 'text/plain';
        extension = 'txt';
        break;
      case 'srt':
        content = to_srt(updatedJson);
        mimeType = 'text/plain';
        extension = 'srt';
        break;
      default:
        content = JSON.stringify(updatedJson, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${item.title.replace(/[^a-z0-9]/gi, '_') || 'transcript'}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      transcriptContainerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  if (!initialTranscriptJson || editableWords.length === 0) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (initialTranscriptJson.error) {
    return <div className="flex items-center justify-center h-96 text-red-500"><AlertCircle className="w-5 h-5 mr-2" />{initialTranscriptJson.error}</div>;
  }
  if (!item || !item.source_url) {
    return <div className="flex flex-col items-center justify-center p-8 text-center bg-muted rounded-lg h-96"><AlertTriangle className="w-12 h-12 text-amber-500 mb-4" /><h3 className="text-lg font-semibold">Source File Missing</h3><p className="text-muted-foreground text-sm">The original audio for this transcription is not available.</p></div>;
  }

  let lastSpeaker = null;

  return (
    <div className={cn("flex flex-col gap-4 h-full max-h-[85vh] p-1", isFullscreen && "fixed inset-0 z-50 bg-background p-4")}>
      <div className="flex items-center gap-2 border-b pb-2 flex-wrap">
        <Button variant={isEditing ? 'secondary' : 'outline'} size="sm" onClick={() => setIsEditing(!isEditing)}>
          <Edit className="w-4 h-4 mr-2" />{isEditing ? 'Finish Editing' : 'Edit Transcript'}
        </Button>
        {isEditing && (
          <div className="flex gap-1">
            <TooltipProvider><Tooltip><TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleUndo} disabled={historyIndex <= 0}><Undo2 className="w-4 h-4" /></Button>
            </TooltipTrigger><TooltipContent>Undo (Ctrl+Z)</TooltipContent></Tooltip></TooltipProvider>
            <TooltipProvider><Tooltip><TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleRedo} disabled={historyIndex >= editHistory.length - 1}><Redo2 className="w-4 h-4" /></Button>
            </TooltipTrigger><TooltipContent>Redo (Ctrl+Y)</TooltipContent></Tooltip></TooltipProvider>
          </div>
        )}
        
        <div className="flex gap-1 ml-auto">
          <Button variant="outline" size="sm" onClick={() => setShowSearchPanel(!showSearchPanel)}>
            <Search className="w-4 h-4 mr-2" /> Search (Ctrl+H)
          </Button>
          
          <Button variant="outline" size="icon" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {showSearchPanel && (
        <div className="p-3 bg-muted/50 rounded-lg flex flex-wrap gap-x-4 gap-y-2 items-center">
          <div className="relative flex-grow min-w-[250px]">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              ref={searchInputRef} 
              placeholder="Search transcript..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-8" 
            />
            {searchResults.length > 0 && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {currentResultIndex + 1}/{searchResults.length}
              </span>
            )}
          </div>
          
          <div className="flex">
            <TooltipProvider><Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigateSearchResults(-1)} disabled={searchResults.length === 0}><ChevronLeft className="h-4 w-4" /></Button>
            </TooltipTrigger><TooltipContent>Previous</TooltipContent></Tooltip></TooltipProvider>
            <TooltipProvider><Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigateSearchResults(1)} disabled={searchResults.length === 0}><ChevronRight className="h-4 w-4" /></Button>
            </TooltipTrigger><TooltipContent>Next</TooltipContent></Tooltip></TooltipProvider>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch id="case-sensitive" checked={caseSensitive} onCheckedChange={setCaseSensitive} />
            <Label htmlFor="case-sensitive">Case sensitive</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="whole-word" checked={wholeWord} onCheckedChange={setWholeWord} />
            <Label htmlFor="whole-word">Whole word</Label>
          </div>
          
          <Input placeholder="Replace with..." value={replaceTerm} onChange={(e) => setReplaceTerm(e.target.value)} className="h-9 max-w-[200px]" />
          
          <Button variant="outline" size="sm" onClick={handleReplace} disabled={!replaceTerm || searchResults.length === 0}>
            <Replace className="w-4 h-4 mr-2" />Replace
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleReplaceAll} disabled={!replaceTerm || searchResults.length === 0}>
            <RefreshCw className="w-4 h-4 mr-2" />Replace All
          </Button>
          
          <Button variant="ghost" size="icon" onClick={() => setShowSearchPanel(false)}>
            <ChevronsUpDown className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div 
        ref={transcriptContainerRef} 
        className="prose prose-sm max-w-none p-4 border rounded-lg overflow-y-auto bg-background flex-grow leading-relaxed"
        style={{ height: showSearchPanel ? 'calc(100% - 200px)' : 'calc(100% - 120px)' }}
      >
        {editableWords.map((word, index) => {
          const currentTicks = currentTime * TICKS_PER_SECOND;
          const isActive = currentTicks >= word.offsetInTicks && 
                          currentTicks < (word.offsetInTicks + word.durationInTicks);
          
          const progress = isActive ? 
            Math.min(100, ((currentTicks - word.offsetInTicks) / word.durationInTicks) * 100) : 
            0;
          
          const showSpeakerTag = word.speaker && word.speaker !== lastSpeaker;
          if (showSpeakerTag) lastSpeaker = word.speaker;

          return (
            <WordItem
              key={`${word.offsetInTicks}-${index}`}
              word={word} index={index} isActive={isActive}
              isSearchResult={searchResults.includes(index)}
              isCurrentSearchResult={searchResults[currentResultIndex] === index}
              showSpeakerTag={showSpeakerTag}
              speakerMap={speakerMap} speakerColors={speakerColors}
              progress={progress} isEditing={isEditing}
              handleWordChange={handleWordChange} handleSeek={handleSeek}
              handleSpeakerNameChange={handleSpeakerNameChange}
              handleReassignSpeakerForPhrase={handleReassignSpeakerForPhrase}
            />
          );
        })}
      </div>

      <div className="p-3 border bg-muted/50 rounded-lg flex flex-col gap-2">
        <div className="flex items-center gap-4 justify-between">
          <Button onClick={handlePlayPause} size="icon" className="w-10 h-10 flex-shrink-0">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>
          
          <div className="flex-1 flex items-center gap-3">
            <div className="text-sm font-mono text-muted-foreground min-w-[100px]">
              {formatTime(currentTime)}
            </div>
            
            <div className="flex-1">
              <Slider
                min={0}
                max={duration}
                step={0.1}
                value={[currentTime]}
                onValueChange={([val]) => handleSeek(val)}
                className="cursor-pointer"
              />
            </div>
            
            <div className="text-sm font-mono text-muted-foreground min-w-[100px] text-right">
              {formatTime(duration)}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={playbackRate.toString()} onValueChange={(value) => setPlaybackRate(parseFloat(value))}>
              <SelectTrigger className="w-20">
                <SelectValue placeholder="Speed" />
              </SelectTrigger>
              <SelectContent>
                {PLAYBACK_RATES.map(rate => (
                  <SelectItem key={rate} value={rate.toString()}>{rate}x</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)}>
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isMuted ? "Unmute" : "Mute"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {!isMuted && (
              <div className="w-24">
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[volume]}
                  onValueChange={([val]) => setVolume(val)}
                />
              </div>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9">
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleDownload('txt')}><FileText className="w-4 h-4 mr-2" /> Text (.txt)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('srt')}><LanguagesIcon className="w-4 h-4 mr-2" /> Subtitle (.srt)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('json')}><FileText className="w-4 h-4 mr-2" /> JSON (.json)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <audio ref={audioRef} src={item.source_url} className="hidden" />
    </div>
  );
};

export default TranscriptionPlayer;