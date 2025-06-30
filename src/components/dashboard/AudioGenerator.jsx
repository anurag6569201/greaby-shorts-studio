import React, { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardFooter,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Mic,
  Loader2,
  RefreshCw,
  MoreHorizontal,
  Edit,
  Sparkles,
  AlertCircle,
  Play,
  ChevronDown,
  X,
  Star,
  Zap,
  IndianRupee,
  Info,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { VOICE_OPTIONS as STATIC_VOICE_DETAILS } from "./components/voices";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PaginationControls } from "@/components/ui/PaginationControls";

// --- Helper Components (Unchanged) ---
const GENDER_OPTIONS = [
  { value: "all", label: "All Genders" },
  { value: "Female", label: "Female" },
  { value: "Male", label: "Male" },
  { value: "Child", label: "Child" },
];
const LANGUAGE_GROUPS = [
  { value: "all", label: "All Languages" },
  ...Array.from(new Set(STATIC_VOICE_DETAILS.map((v) => v.group))).map(
    (group) => ({ value: group, label: group })
  ),
];
const getTierFromMultiplier = (multiplier) => {
    if (multiplier <= 0.0) return { name: "Free", label: "Free", icon: <Star className="h-3 w-3 mr-1" />, multiplier: "0x", };
    if (multiplier <= 1.0) return { name: "Local Pro", label: "Local Pro", icon: <IndianRupee className="h-3 w-3 mr-1" />, multiplier: "1x", };
    if (multiplier <= 1.5) return { name: "Global", label: "Global", icon: null, multiplier: "1.5x" };
    if (multiplier < 4.0) return { name: "Premium AI", label: "Premium AI", icon: <Sparkles className="h-3 w-3 mr-1" />, multiplier: `${multiplier}x`, };
    return { name: "Ultra HD", label: "Ultra HD", icon: <Zap className="h-3 w-3 mr-1" />, multiplier: `${multiplier}x`, };
};
const VoiceCard = ({ voice, isSelected, onSelect, onPreview, isPreviewing }) => {
    const tier = getTierFromMultiplier(voice.multiplier);
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`border rounded-lg p-3 cursor-pointer transition-all relative ${isSelected
            ? "border-primary bg-primary/10"
            : "border-muted hover:border-primary/30"
          }`}
        onClick={() => onSelect(voice.value)}
      >
        <div className="flex items-start gap-3">
          <div className="text-2xl">{voice.flag}</div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <h4 className="font-medium pr-1">{voice.label}</h4>
              <Button
                style={voice.audio ? {} : { pointerEvents: "none", opacity: 0.3 }}
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0 play-button-glow"
                onClick={(e) => { e.stopPropagation(); onPreview(voice); }}
              >
                {isPreviewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{voice.accent}</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground"></span>
              <span>{voice.gender}</span>
            </div>
            <Badge variant="outline" className="mt-2 h-5 font-normal text-xs">{tier.icon}{tier.label} ({tier.multiplier})</Badge>
          </div>
        </div>
      </motion.div>
    );
};
const VoiceSelector = ({ value, onChange, disabled, voiceOptions, isLoading }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [previewingVoice, setPreviewingVoice] = useState(null);
    const [genderFilter, setGenderFilter] = useState("all");
    const [groupFilter, setGroupFilter] = useState("all");
    const [tierFilter, setTierFilter] = useState("all");
    const audioRef = useRef(null);
    const TIER_OPTIONS = useMemo(() => {
      if (!voiceOptions) return [{ value: "all", label: "All Tiers" }];
      const tierNames = { 0: "Free", 1: "Local Pro", 1.5: "Global", 2.5: "Premium AI", 4: "Ultra HD" };
      const multipliers = [...new Set(voiceOptions.map((v) => v.multiplier))].sort((a, b) => a - b);
      return [{ value: "all", label: "All Tiers" }, ...multipliers.map((m) => ({ value: m, label: tierNames[m] || `${m}x` }))];
    }, [voiceOptions]);
    const stopPreview = () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } setPreviewingVoice(null); };
    const handlePreview = (voice) => {
      if (!voice.audio) { toast.info("Preview not available for this voice."); return; }
      if (previewingVoice === voice.value) { stopPreview(); return; }
      stopPreview();
      try {
        const audio = new Audio(`/voice-previews/${voice.audio}`);
        audioRef.current = audio;
        setPreviewingVoice(voice.value);
        audio.play().catch(() => { toast.error("Preview audio not available"); stopPreview(); });
        audio.onended = stopPreview;
        audio.onerror = stopPreview;
      } catch { stopPreview(); }
    };
    useEffect(() => { return () => stopPreview(); }, []);
    const filteredVoices = useMemo(() => {
      if (!voiceOptions) return [];
      let result = voiceOptions;
      if (search.trim()) { const searchLower = search.toLowerCase(); result = result.filter((v) => v.label.toLowerCase().includes(searchLower) || v.group.toLowerCase().includes(searchLower) || v.accent.toLowerCase().includes(searchLower)); }
      if (genderFilter !== "all") { result = result.filter((v) => v.gender === genderFilter); }
      if (groupFilter !== "all") { result = result.filter((v) => v.group === groupFilter); }
      if (tierFilter !== "all") { result = result.filter((v) => v.multiplier === Number(tierFilter)); }
      return result;
    }, [search, genderFilter, groupFilter, tierFilter, voiceOptions]);
    const activeFilterCount = [groupFilter, genderFilter, tierFilter].filter((f) => f !== "all").length;
    const selectedVoice = voiceOptions.find((v) => v.value === value);
    return (
      <div>
        <Label>Voice</Label>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={isOpen} className="w-full justify-between" disabled={disabled || isLoading}>
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading Voices...</> : selectedVoice ? <div className="flex items-center gap-2 truncate"><span className="text-lg">{selectedVoice.flag}</span><span className="truncate">{selectedVoice.label}</span><span className="text-muted-foreground text-xs ml-2 truncate">({selectedVoice.accent}, {selectedVoice.gender})</span></div> : "Select a voice..."}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] md:w-[600px] p-0" style={{ maxHeight: "80vh", overflowX: "hidden" }}>
            <div className="flex flex-col h-full">
              <div className="p-3 border-b sticky top-0 z-10 bg-background">
                <div className="flex flex-col md:flex-row gap-2" >
                  <Input placeholder="Search voices..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1"/>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full md:w-auto relative">
                        <Filter className="h-4 w-4 mr-2" />Filters
                        {activeFilterCount > 0 && <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">{activeFilterCount}</Badge>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px]">
                      <div className="space-y-4">
                        <div className="space-y-2"><Label>Language</Label><Select value={groupFilter} onValueChange={setGroupFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LANGUAGE_GROUPS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Gender</Label><Select value={genderFilter} onValueChange={setGenderFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GENDER_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Tier</Label><Select value={String(tierFilter)} onValueChange={setTierFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIER_OPTIONS.map((o) => (<SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>))}</SelectContent></Select></div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                {previewingVoice && (<div className="flex items-center gap-2 text-sm bg-muted rounded-md px-3 py-2 mt-3"><Play className="h-4 w-4 text-primary" /><span className="truncate">Previewing: {voiceOptions.find((v) => v.value === previewingVoice)?.label}</span><Button variant="ghost" size="sm" className="ml-auto h-6 w-6" onClick={stopPreview}><X className="h-4 w-4" /></Button></div>)}
              </div>
              <div className="overflow-y-auto flex-1 p-3">
                {filteredVoices.length === 0 ? (<div className="text-center py-8"><div className="text-muted-foreground mb-2">No voices found</div><Button variant="outline" onClick={() => { setSearch(""); setGenderFilter("all"); setGroupFilter("all"); setTierFilter("all"); }}>Clear filters</Button></div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">{filteredVoices.map((voice) => (<VoiceCard key={voice.value} voice={voice} isSelected={value === voice.value} onSelect={(v) => { onChange(v); setIsOpen(false); }} onPreview={handlePreview} isPreviewing={previewingVoice === voice.value}/>))}</div>)}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
};
const AudioCard = ({ audio, onEdit }) => {
    const [shouldLoadAudio, setShouldLoadAudio] = useState(false);
    const audioRef = React.useRef(null);
    useEffect(() => { if (shouldLoadAudio && audioRef.current) { audioRef.current.play(); } }, [shouldLoadAudio]);
    const isProcessing = !['completed', 'failed'].includes(audio.status);
    
    let statusText = audio.status;
    if (isProcessing && typeof audio.status === "string" && audio.status && !['pending', 'processing'].includes(audio.status.toLowerCase())) {
        statusText = `Processing (${audio.status})...`;
    } else if (isProcessing) {
        statusText = `${audio.status}...`
    }

    return (
      <Card className="overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow audio-card-fancy">
        <CardHeader className="flex-row items-start justify-between" style={{zIndex: 1}}>
          <div className="space-y-1 flex-grow overflow-hidden pr-2">
            <CardTitle className="text-sm font-medium line-clamp-2 text-gray-800 truncate" title={audio.title}>{audio.title}</CardTitle>
            <CardDescription className="text-xs">{new Date(audio.created_at).toLocaleString()}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="flex-shrink-0" disabled={isProcessing}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onEdit(audio)}><Edit className="mr-2 h-4 w-4" /> Edit Title</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center p-4 pt-0 mt-0" style={{zIndex: 1,color:'#8a8aa4'}}>
          {audio.status === 'completed' && audio.result_url ? (shouldLoadAudio ? (<audio ref={audioRef} controls src={audio.result_url} className="w-full h-10" />) : (<Button variant="outline" className="w-full h-10 bg-white/30" onClick={() => setShouldLoadAudio(true)}><Play className="h-4 w-4 mr-2" />Preview</Button>)) : (isProcessing ? (<div className="text-center"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /><p className="text-xs text-muted-foreground mt-2 capitalize">{statusText}</p></div>) : (<div className="text-center"><AlertCircle className="h-6 w-6 text-destructive mx-auto" /><p className="text-xs text-destructive mt-2 font-semibold">Failed</p></div>))}
        </CardContent>
      </Card>
    );
};

// --- CORRECTED COST CALCULATION FUNCTION ---
const calculateAudioCostBreakdown = (text_input, response_format, voiceId, voiceOptions) => {
    const PLATFORM_FEE = 0.5;
    const DEFAULT_MULTIPLIER = 1.5;

    if (!voiceOptions || !text_input) {
      return {
        total: PLATFORM_FEE.toFixed(2),
        breakdown: { platformFee: PLATFORM_FEE, baseCharacterCost: 0, premiumVoiceCost: 0, formatSurcharge: 0 },
      };
    }
    const selectedVoice = voiceOptions.find((v) => v.id === voiceId);
    const voiceMultiplier = selectedVoice ? selectedVoice.multiplier : DEFAULT_MULTIPLIER;
    
    // NEW: Base character cost applies to ALL generations
    const baseCharacterCost = text_input.length / 1000.0;
    
    // NEW: Premium cost is an *additional* cost for non-free voices
    const premiumVoiceCost = baseCharacterCost * voiceMultiplier;
    
    const formatCosts = { flac: 0.2, wav: 0.2 };
    const formatSurcharge = formatCosts[response_format] || 0.0;
    
    // NEW: The formula now matches the backend logic exactly
    const totalCost = PLATFORM_FEE + baseCharacterCost + premiumVoiceCost + formatSurcharge;
    
    const finalCost = Math.max(Math.round(totalCost * 100) / 100, PLATFORM_FEE);

    return {
      total: finalCost.toFixed(2),
      // NEW: The breakdown object is updated for the new formula
      breakdown: { 
          platformFee: PLATFORM_FEE, 
          baseCharacterCost: baseCharacterCost,
          premiumVoiceCost: premiumVoiceCost, 
          formatSurcharge: formatSurcharge 
      },
    };
};


// --- Main Generator Component ---
const AudioGenerator = () => {
  const [formData, setFormData] = useState({
    title: "", text_input: "", voice: "hi-IN-SwaraNeural", response_format: "mp3", speed: 1.0,
  });
  const [editingAudio, setEditingAudio] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();
  const { fetchUserProfile } = useAuth();
  const navigate = useNavigate();
  const submissionLock = useRef(false);

  const { data: audiosData, isLoading: isLoadingHistory, isFetching } = useQuery({
    queryKey: ["audioCreations", currentPage],
    queryFn: () => api.get(`/audios/?page=${currentPage}`).then((res) => res.data),
    keepPreviousData: true,
  });

  const { data: voiceOptionsData, isLoading: isLoadingVoices } = useQuery({
    queryKey: ["voiceOptions"],
    queryFn: () => api.get("/audios/voice-options/").then((res) => res.data),
    staleTime: 1000 * 60 * 60,
  });

  const enrichedVoiceOptions = useMemo(() => {
    if (!voiceOptionsData) return [];
    const multiplierMap = new Map(voiceOptionsData.map((v) => [v.id, v.multiplier]));
    return STATIC_VOICE_DETAILS.map((voice) => ({
      ...voice,
      multiplier: multiplierMap.get(voice.value) ?? 1.5,
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [voiceOptionsData]);

  const { mutate: generateAudio, isLoading: isGenerating } = useMutation({
    mutationFn: (newAudio) => api.post("/audios/", newAudio),
    onSuccess: (response) => {
        const newlyCreatedAudio = response.data;
        toast.info("Your audio is being created!", {
          description: "It will update in your library in real-time.",
        });
        
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
        
        const queryKey = ["audioCreations", 1];
        
        queryClient.setQueryData(queryKey, (oldData) => {
            const oldResults = oldData?.results ?? [];
            return {
                ...oldData,
                count: (oldData?.count ?? 0) + 1,
                results: [newlyCreatedAudio, ...oldResults]
            };
        });
        
        setFormData((prev) => ({ ...prev, title: "", text_input: "" }));
        fetchUserProfile();
        queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
    onError: (error) => {
        if (error.response?.status === 402) {
            toast.error("Insufficient Credits", {
                description: error.response?.data?.detail,
                action: { label: "Buy Credits", onClick: () => navigate("/pricing") },
            });
        } else {
            toast.error("Generation Failed", {
                description: error.response?.data?.detail || "An unexpected error occurred.",
            });
        }
    },
    onSettled: () => {
        submissionLock.current = false;
    },
  });

  const { mutate: updateAudio, isLoading: isUpdating } = useMutation({
    mutationFn: ({ id, title }) => api.patch(`/audios/${id}/`, { title }),
    onSuccess: (response, variables) => {
      const updatedAudio = response.data;
      toast.success("Audio updated successfully!");
      const queryKey = ["audioCreations", currentPage];
      queryClient.setQueryData(queryKey, (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            results: oldData.results.map(a => a.id === variables.id ? updatedAudio : a),
          };
      });
      setEditingAudio(null);
    },
    onError: (error) => toast.error("Update Failed", { description: error.response?.data?.detail }),
  });

  const handleChange = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));
  
  const cost = useMemo(() =>
      calculateAudioCostBreakdown(formData.text_input, formData.response_format, formData.voice, voiceOptionsData),
    [formData.text_input, formData.response_format, formData.voice, voiceOptionsData]
  );
  
  const handleSubmit = async () => {
    const action_btn = document.querySelector(".action-button");
    action_btn?.classList.add("freeze-btn");
    if (submissionLock.current) {
        return;
    }
    if (!formData.text_input.trim()) {
        return toast.warning("Please enter some text to generate audio.");
    }
    submissionLock.current = true;
    const payload = {...formData};
    if (!payload.title.trim()) {
        payload.title = `Audio for: "${payload.text_input.substring(0, 30)}..."`;
    }
    try {
      await generateAudio(payload); // assuming this is async
    } finally {
      action_btn?.classList.remove("freeze-btn"); // ✅ Remove class
      submissionLock.current = false;
    }
  };
  
  const handleUpdateTitle = () => {
    if (!newTitle.trim() || !editingAudio) return;
    updateAudio({ id: editingAudio.id, title: newTitle });
  };
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-8">
      <Card className="bg-transparent shadow-none border-none">
        <CardHeader className="p-0">
          <CardTitle className="flex items-center text-2xl"><Mic className="h-6 w-6 mr-3 text-primary" />Audio Generation</CardTitle>
          <CardDescription>Generate a voiceover from text using a wide range of professional voices.</CardDescription>
        </CardHeader>
        <hr className="my-4" />
        <CardContent className="space-y-6 p-0">
          <div className="space-y-2"><Label>Title (Optional)</Label><Input placeholder="e.g., Intro Voiceover" value={formData.title} onChange={(e) => handleChange("title", e.target.value)} disabled={isGenerating}/></div>
          <div className="space-y-2 mt-4">
            <Label htmlFor="prompt-area" className="text-base font-semibold">Script</Label>
            <Textarea id="prompt-area" placeholder="Enter the text for your voiceover..." value={formData.text_input} onChange={(e) => handleChange("text_input", e.target.value)} className="min-h-[200px]" disabled={isGenerating}/>
            <div className="text-right text-xs text-muted-foreground tabular-nums">{formData.text_input.length} / 5000 characters</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="md:col-span-2"><VoiceSelector value={formData.voice} onChange={(v) => handleChange("voice", v)} disabled={isGenerating} voiceOptions={enrichedVoiceOptions} isLoading={isLoadingVoices}/></div>
            <div><Label>Format</Label><Select value={formData.response_format} onValueChange={(v) => handleChange("response_format", v)} disabled={isGenerating}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mp3">MP3</SelectItem><SelectItem value="opus">Opus</SelectItem><SelectItem value="aac">AAC</SelectItem><SelectItem value="flac">FLAC (Costs More)</SelectItem></SelectContent></Select></div>
            <div className="md:col-span-3">
              <Label>Speed</Label>
              <div className="border border-input bg-background rounded-md px-3 py-2 flex flex-col gap-2">
                <div className="flex justify-between items-center"><span className="text-muted-foreground text-xs">Slower</span><span className="text-primary w-12 text-center font-semibold tabular-nums">{formData.speed.toFixed(2)}x</span><span className="text-muted-foreground text-xs">Faster</span></div>
                <Slider value={[formData.speed]} onValueChange={(v) => handleChange("speed", v[0])} min={0.25} max={4.0} step={0.05} disabled={isGenerating}/>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between p-0 pt-6">
          <div className="text-sm flex items-center gap-2">
            <span className="text-muted-foreground">Est. Cost: </span><span className="font-bold text-primary">{cost.total} Credits</span>
            <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-4 w-4 text-muted-foreground cursor-pointer" /></TooltipTrigger>
                {/* --- CORRECTED TOOLTIP --- */}
                <TooltipContent className="text-xs">
                  <div className="space-y-1 p-1 font-medium"><p>Breakdown:</p>
                    <div className="pl-2 font-normal text-muted-foreground">
                        <div>Platform Fee: {cost.breakdown.platformFee?.toFixed(2)}</div>
                        <div>Base Usage: {cost.breakdown.baseCharacterCost?.toFixed(2)}</div>
                        {cost.breakdown.premiumVoiceCost > 0 && <div>Voice Premium: {cost.breakdown.premiumVoiceCost?.toFixed(2)}</div>}
                        {cost.breakdown.formatSurcharge > 0 && <div>Format Fee: {cost.breakdown.formatSurcharge?.toFixed(2)}</div>}
                    </div><hr className="my-1" /><p>Total: {cost.total}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={isGenerating || !formData.text_input.trim()} 
            size="lg"
            className="action-button"
          >
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{" "}Generate Audio
          </Button>
        </CardFooter>
      </Card>
      <hr />
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Audio Library</h2>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["audioCreations", currentPage] })} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}/>Refresh
          </Button>
        </div>
        {isLoadingHistory && !audiosData ? (
          <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
        ) : audiosData?.results?.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {audiosData.results.map((a) => (
                  <motion.div
                    key={a.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, type: "spring" }}
                  >
                    <AudioCard audio={a} onEdit={(audio) => { setEditingAudio(audio); setNewTitle(audio.title); }}/>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <PaginationControls
              currentPage={currentPage}
              totalPages={audiosData.total_pages}
              onPageChange={handlePageChange}
              hasNext={!!audiosData.next}
              hasPrev={!!audiosData.previous}
            />
          </>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-xl p-4">
            <h3 className="text-xl font-semibold">Your library is empty</h3>
            <p className="text-muted-foreground mt-2">Generated audios will appear here.</p>
          </div>
        )}
      </div>
      <Dialog open={!!editingAudio} onOpenChange={() => setEditingAudio(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Audio Title</DialogTitle><DialogDescription>Give your audio a new title to easily identify it later.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4"><Label htmlFor="title">Title</Label><Input id="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}/></div>
          <DialogFooter><Button variant="outline" onClick={() => setEditingAudio(null)}>Cancel</Button><Button onClick={handleUpdateTitle} disabled={isUpdating}>{isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}Save Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AudioGenerator;