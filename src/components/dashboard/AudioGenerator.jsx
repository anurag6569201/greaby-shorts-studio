import React, { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Mic, Loader2, RefreshCw, MoreHorizontal, Edit, Trash2, Sparkles, AlertCircle, Play, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

const VOICE_OPTIONS = [
    // English Voices
    { value: 'en-US-AvaMultilingualNeural', label: 'Ava', group: 'English (US)', accent: 'US', gender: 'Female', flag: '🇺🇸' },
    { value: 'en-US-AndrewMultilingualNeural', label: 'Andrew', group: 'English (US)', accent: 'US', gender: 'Male', flag: '🇺🇸' },
    { value: 'en-US-JennyNeural', label: 'Jenny', group: 'English (US)', accent: 'US', gender: 'Female', flag: '🇺🇸' },
    { value: 'en-US-GuyNeural', label: 'Guy', group: 'English (US)', accent: 'US', gender: 'Male', flag: '🇺🇸' },
    { value: 'en-US-AriaNeural', label: 'Aria', group: 'English (US)', accent: 'US', gender: 'Female', flag: '🇺🇸' },
    { value: 'en-US-AnaNeural', label: 'Ana', group: 'English (US)', accent: 'US', gender: 'Child', flag: '🇺🇸' },
    { value: 'en-GB-SoniaNeural', label: 'Sonia', group: 'English (UK)', accent: 'UK', gender: 'Female', flag: '🇬🇧' },
    { value: 'en-GB-RyanNeural', label: 'Ryan', group: 'English (UK)', accent: 'UK', gender: 'Male', flag: '🇬🇧' },
    { value: 'en-GB-LibbyNeural', label: 'Libby', group: 'English (UK)', accent: 'UK', gender: 'Female', flag: '🇬🇧' },
    { value: 'en-GB-MaisieNeural', label: 'Maisie', group: 'English (UK)', accent: 'UK', gender: 'Child', flag: '🇬🇧' },
    { value: 'en-AU-NatashaNeural', label: 'Natasha', group: 'English (Australia)', accent: 'AU', gender: 'Female', flag: '🇦🇺' },
    { value: 'en-AU-WilliamNeural', label: 'William', group: 'English (Australia)', accent: 'AU', gender: 'Male', flag: '🇦🇺' },
    { value: 'en-IN-NeerjaNeural', label: 'Neerja', group: 'English (India)', accent: 'IN', gender: 'Female', flag: '🇮🇳' },
    { value: 'en-IN-PrabhatNeural', label: 'Prabhat', group: 'English (India)', accent: 'IN', gender: 'Male', flag: '🇮🇳' },

    // Spanish Voices
    { value: 'es-MX-DaliaNeural', label: 'Dalia', group: 'Spanish (Mexico)', accent: 'MX', gender: 'Female', flag: '🇲🇽' },
    { value: 'es-MX-JorgeNeural', label: 'Jorge', group: 'Spanish (Mexico)', accent: 'MX', gender: 'Male', flag: '🇲🇽' },
    { value: 'es-ES-ElviraNeural', label: 'Elvira', group: 'Spanish (Spain)', accent: 'ES', gender: 'Female', flag: '🇪🇸' },
    { value: 'es-ES-AlvaroNeural', label: 'Alvaro', group: 'Spanish (Spain)', accent: 'ES', gender: 'Male', flag: '🇪🇸' },
    { value: 'es-US-PalomaNeural', label: 'Paloma', group: 'Spanish (US)', accent: 'US', gender: 'Female', flag: '🇺🇸' },
    { value: 'es-US-AlonsoNeural', label: 'Alonso', group: 'Spanish (US)', accent: 'US', gender: 'Male', flag: '🇺🇸' },

    // French Voices
    { value: 'fr-FR-DeniseNeural', label: 'Denise', group: 'French', accent: 'FR', gender: 'Female', flag: '🇫🇷' },
    { value: 'fr-FR-HenriNeural', label: 'Henri', group: 'French', accent: 'FR', gender: 'Male', flag: '🇫🇷' },
    { value: 'fr-CA-SylvieNeural', label: 'Sylvie', group: 'French (Canada)', accent: 'CA', gender: 'Female', flag: '🇨🇦' },
    { value: 'fr-CA-JeanNeural', label: 'Jean', group: 'French (Canada)', accent: 'CA', gender: 'Male', flag: '🇨🇦' },

    // German Voices
    { value: 'de-DE-KatjaNeural', label: 'Katja', group: 'German', accent: 'DE', gender: 'Female', flag: '🇩🇪' },
    { value: 'de-DE-ConradNeural', label: 'Conrad', group: 'German', accent: 'DE', gender: 'Male', flag: '🇩🇪' },
    { value: 'de-AT-IngridNeural', label: 'Ingrid', group: 'German (Austria)', accent: 'AT', gender: 'Female', flag: '🇦🇹' },
    { value: 'de-CH-LeniNeural', label: 'Leni', group: 'German (Switzerland)', accent: 'CH', gender: 'Female', flag: '🇨🇭' },

    // Chinese Voices
    { value: 'zh-CN-XiaoxiaoNeural', label: 'Xiaoxiao', group: 'Chinese (Mandarin)', accent: 'CN', gender: 'Female', flag: '🇨🇳' },
    { value: 'zh-CN-YunxiNeural', label: 'Yunxi', group: 'Chinese (Mandarin)', accent: 'CN', gender: 'Male', flag: '🇨🇳' },
    { value: 'zh-HK-HiuMaanNeural', label: 'HiuMaan', group: 'Chinese (Cantonese)', accent: 'HK', gender: 'Female', flag: '🇭🇰' },
    { value: 'zh-TW-HsiaoChenNeural', label: 'HsiaoChen', group: 'Chinese (Taiwan)', accent: 'TW', gender: 'Female', flag: '🇹🇼' },

    // Japanese Voices
    { value: 'ja-JP-NanamiNeural', label: 'Nanami', group: 'Japanese', accent: 'JP', gender: 'Female', flag: '🇯🇵' },
    { value: 'ja-JP-KeitaNeural', label: 'Keita', group: 'Japanese', accent: 'JP', gender: 'Male', flag: '🇯🇵' },

    // Hindi Voices
    { value: 'hi-IN-SwaraNeural', label: 'Swara', group: 'Hindi', accent: 'IN', gender: 'Female', flag: '🇮🇳' },
    { value: 'hi-IN-MadhurNeural', label: 'Madhur', group: 'Hindi', accent: 'IN', gender: 'Male', flag: '🇮🇳' },

    // Other Popular Languages
    { value: 'pt-BR-FranciscaNeural', label: 'Francisca', group: 'Portuguese (Brazil)', accent: 'BR', gender: 'Female', flag: '🇧🇷' },
    { value: 'pt-BR-AntonioNeural', label: 'Antonio', group: 'Portuguese (Brazil)', accent: 'BR', gender: 'Male', flag: '🇧🇷' },
    { value: 'it-IT-ElsaNeural', label: 'Elsa', group: 'Italian', accent: 'IT', gender: 'Female', flag: '🇮🇹' },
    { value: 'it-IT-DiegoNeural', label: 'Diego', group: 'Italian', accent: 'IT', gender: 'Male', flag: '🇮🇹' },
    { value: 'ru-RU-SvetlanaNeural', label: 'Svetlana', group: 'Russian', accent: 'RU', gender: 'Female', flag: '🇷🇺' },
    { value: 'ru-RU-DmitryNeural', label: 'Dmitry', group: 'Russian', accent: 'RU', gender: 'Male', flag: '🇷🇺' },
    { value: 'ar-EG-SalmaNeural', label: 'Salma', group: 'Arabic (Egypt)', accent: 'EG', gender: 'Female', flag: '🇪🇬' },
    { value: 'ar-EG-ShakirNeural', label: 'Shakir', group: 'Arabic (Egypt)', accent: 'EG', gender: 'Male', flag: '🇪🇬' },
    { value: 'ko-KR-SunHiNeural', label: 'Sun-Hi', group: 'Korean', accent: 'KR', gender: 'Female', flag: '🇰🇷' },
    { value: 'ko-KR-InJoonNeural', label: 'In-Joon', group: 'Korean', accent: 'KR', gender: 'Male', flag: '🇰🇷' },
];

const GENDER_OPTIONS = [
  { value: 'all', label: 'All Genders' },
  { value: 'Female', label: 'Female' },
  { value: 'Male', label: 'Male' },
  { value: 'Child', label: 'Child' },
];

const GROUP_OPTIONS = [
  { value: 'all', label: 'All Languages' },
  ...Array.from(new Set(VOICE_OPTIONS.map(v => v.group))).map(group => ({
    value: group,
    label: group
  }))
];

const groupedVoices = VOICE_OPTIONS.reduce((acc, voice) => {
  (acc[voice.group] = acc[voice.group] || []).push(voice);
  return acc;
}, {});

const VoiceCard = ({ voice, isSelected, onSelect, onPreview, isPreviewing }) => (
  <motion.div 
    whileHover={{ scale: 1.02 }}
    className={`border rounded-lg p-3 cursor-pointer transition-all ${
      isSelected ? 'border-primary bg-primary/10' : 'border-muted hover:border-primary/30'
    }`}
    onClick={() => onSelect(voice.value)}
  >
    <div className="flex items-start gap-3">
      <div className="text-2xl">{voice.flag}</div>
      <div className="flex-1">
        <div className="flex justify-between">
          <h4 className="font-medium">{voice.label}</h4>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(voice);
            }}
          >
            {isPreviewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{voice.accent}</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground"></span>
          <span>{voice.gender}</span>
        </div>
      </div>
    </div>
  </motion.div>
);

const VoiceSelector = ({ value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [previewingVoice, setPreviewingVoice] = useState(null);
  const [genderFilter, setGenderFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const audioRef = useRef(null);

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPreviewingVoice(null);
  };

  const handlePreview = (voice) => {
    if (previewingVoice === voice.value) {
      stopPreview();
      return;
    }
    
    stopPreview();
    
    try {
      const audio = new Audio(`/voice-previews/${voice.value}.mp3`);
      audioRef.current = audio;
      setPreviewingVoice(voice.value);
      
      audio.play().catch(err => {
        console.error("Audio preview failed:", err);
        toast.error("Preview audio not available");
        stopPreview();
      });
      
      audio.onended = stopPreview;
      audio.onerror = stopPreview;
    } catch (err) {
      console.error("Error creating audio:", err);
      stopPreview();
    }
  };

  useEffect(() => {
    return () => stopPreview();
  }, []);

  const filteredVoices = useMemo(() => {
    let result = VOICE_OPTIONS;
    
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(voice => 
        voice.label.toLowerCase().includes(searchLower) || 
        voice.group.toLowerCase().includes(searchLower) ||
        voice.accent.toLowerCase().includes(searchLower)
      );
    }
    
    if (genderFilter !== 'all') {
      result = result.filter(voice => voice.gender === genderFilter);
    }
    
    if (groupFilter !== 'all') {
      result = result.filter(voice => voice.group === groupFilter);
    }
    
    return result;
  }, [search, genderFilter, groupFilter]);

  const selectedVoice = VOICE_OPTIONS.find(v => v.value === value);

  return (
    <div>
      <Label>Voice</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <Button 
            variant="outline" 
            role="combobox" 
            aria-expanded={isOpen}
            className="w-full justify-between"
          >
            {selectedVoice ? (
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedVoice.flag}</span>
                <span>{selectedVoice.label}</span>
                <span className="text-muted-foreground text-xs ml-2">
                  ({selectedVoice.accent}, {selectedVoice.gender})
                </span>
              </div>
            ) : (
              "Select a voice..."
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[600px] p-0 max-h-[70vh]" style={{overflowX: 'hidden'}}>
          <div className="flex flex-col h-full">
            <div className="p-3 border-b">
              <div className="flex gap-2 mb-3">
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by language" />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter by gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Input 
                  placeholder="Search voices..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1"
                />
              </div>
              
              {previewingVoice && (
                <div className="flex items-center gap-2 text-sm bg-muted rounded-md px-3 py-2">
                  <Play className="h-4 w-4 text-primary" />
                  <span className="truncate">Previewing: {VOICE_OPTIONS.find(v => v.value === previewingVoice)?.label}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-auto h-6 w-6"
                    onClick={stopPreview}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="overflow-y-auto flex-1 p-3">
              {filteredVoices.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-2">No voices found</div>
                  <Button variant="outline" onClick={() => {
                    setSearch('');
                    setGenderFilter('all');
                    setGroupFilter('all');
                  }}>
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredVoices.map(voice => (
                    <VoiceCard
                      key={voice.value}
                      voice={voice}
                      isSelected={value === voice.value}
                      onSelect={(voiceValue) => {
                        onChange(voiceValue);
                        setIsOpen(false);
                      }}
                      onPreview={handlePreview}
                      isPreviewing={previewingVoice === voice.value}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const AudioCard = ({ audio, onEdit, onDelete }) => {
  const [shouldLoadAudio, setShouldLoadAudio] = useState(false);
  const audioRef = React.useRef(null);

  useEffect(() => {
    if (shouldLoadAudio && audioRef.current) {
      audioRef.current.play();
    }
  }, [shouldLoadAudio]);

  return (
    <Card className="overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex-row items-start justify-between">
        <div className="space-y-1 flex-grow overflow-hidden pr-2">
          <CardTitle className="text-base truncate" title={audio.title}>{audio.title}</CardTitle>
          <CardDescription className="text-xs">{new Date(audio.created_at).toLocaleString()}</CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="flex-shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(audio)}><Edit className="mr-2 h-4 w-4" /> Edit Title</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(audio)} className="text-red-600 focus:text-red-600 focus:bg-red-50"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center p-4 min-h-[88px]">
        {audio.status === 'completed' && audio.result_url ? (
          shouldLoadAudio ? (
            <audio ref={audioRef} controls src={audio.result_url} className="w-full h-10" />
          ) : (
            <Button variant="outline" className="w-full h-10" onClick={() => setShouldLoadAudio(true)}>
              <Play className="h-4 w-4 mr-2" />
              Preview
            </Button>
          )
        ) : (
          <div className="text-center">
            {['pending', 'processing'].includes(audio.status) || !['completed', 'failed'].includes(audio.status) ? (
                <><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /><p className="text-xs text-muted-foreground mt-2 capitalize">{audio.status}</p></>
            ) : (
                <><AlertCircle className="h-6 w-6 text-destructive mx-auto" /><p className="text-xs text-destructive mt-2 font-semibold">Failed</p></>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const calculateAudioCost = (text_input, response_format) => {
    const base_cost = 0.5;
    const character_cost = text_input.length / 1000.0;
    const format_costs = { 'flac': 0.2, 'wav': 0.2 };
    const format_surcharge = format_costs[response_format] || 0.0;
    const total_cost = base_cost + character_cost + format_surcharge;
    return Math.max(0.5, total_cost).toFixed(2);
};

const AudioGenerator = () => {
    const [formData, setFormData] = useState({ 
      title: "", 
      text_input: "", 
      voice: "en-US-JennyNeural", 
      response_format: "mp3", 
      speed: 1.0 
    });
    const [editingAudio, setEditingAudio] = useState(null);
    const [deletingAudio, setDeletingAudio] = useState(null);
    const [newTitle, setNewTitle] = useState("");

    const queryClient = useQueryClient();
    const { fetchUserProfile } = useAuth();
    const navigate = useNavigate();

    const { data: audios, isLoading: isLoadingHistory, isFetching } = useQuery({
        queryKey: ['audioCreations'],
        queryFn: () => api.get('/audios/').then(res => res.data),
    });
    
    const { mutate: generateAudio, isLoading: isGenerating } = useMutation({
        mutationFn: (newAudio) => api.post('/audios/', newAudio),
        onSuccess: (response) => {
            toast.success("Audio generation started!");
            queryClient.setQueryData(['audioCreations'], (oldData = []) => [response.data, ...oldData]);
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            fetchUserProfile();
            setFormData(prev => ({ ...prev, title: "", text_input: "" }));
        },
        onError: (error) => {
             if (error.response?.status === 402) {
                toast.error("Insufficient Credits", { 
                    description: error.response?.data?.detail,
                    action: { label: "Buy Credits", onClick: () => navigate('/pricing') }
                });
            } else {
                toast.error("Generation Failed", { description: error.response?.data?.detail || "An unexpected error occurred." });
            }
        },
    });

    const { mutate: updateAudio, isLoading: isUpdating } = useMutation({
      mutationFn: ({ id, title }) => api.patch(`/audios/${id}/`, { title }),
      onSuccess: () => {
        toast.success("Audio updated successfully!");
        queryClient.invalidateQueries({ queryKey: ['audioCreations'] });
        setEditingAudio(null);
      },
      onError: (error) => toast.error("Update Failed", { description: error.response?.data?.detail }),
    });

    const { mutate: deleteAudio, isLoading: isDeleting } = useMutation({
      mutationFn: (id) => api.delete(`/audios/${id}/`),
      onSuccess: () => {
        toast.success("Audio deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ['audioCreations'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        setDeletingAudio(null);
      },
      onError: (error) => toast.error("Delete Failed", { description: error.response?.data?.detail }),
    });

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const estimatedCost = useMemo(() => {
        return calculateAudioCost(formData.text_input, formData.response_format);
    }, [formData.text_input, formData.response_format]);

    const handleSubmit = () => {
      if (!formData.text_input.trim()) return toast.warning("Please enter some text.");
      generateAudio(formData);
    };

    const handleUpdateTitle = () => {
      if (!newTitle.trim() || !editingAudio) return;
      updateAudio({ id: editingAudio.id, title: newTitle });
    };

    return (
        <div className="space-y-8">
            <Card className="bg-transparent shadow-none border border-none" style={{border:'none'}}>
                <CardHeader className="p-0">
                    <CardTitle className="flex items-center text-2xl"><Mic className="h-6 w-6 mr-3 text-primary" />Audio Generation</CardTitle>
                    <CardDescription>Generate a voiceover from text using a wide range of professional voices.</CardDescription>
                </CardHeader>
                <hr style={{marginTop:'10px',marginBottom:'5px'}}/>
                <CardContent className="space-y-6 p-0 pt-4">
                    <div className="space-y-2"><Label>Title (Optional)</Label><Input placeholder="e.g., Intro Voiceover" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} disabled={isGenerating} /></div>
                    <div className="space-y-2" style={{marginTop:'15px'}}><Label htmlFor="prompt-area" className="text-base font-semibold">Script</Label><Textarea id="prompt-area" placeholder="Enter the text for your voiceover..." value={formData.text_input} onChange={(e) => handleChange('text_input', e.target.value)} className="min-h-[150px]" disabled={isGenerating} style={{minHeight:"200px"}}/></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="md:col-span-2">
                          <VoiceSelector 
                            value={formData.voice} 
                            onChange={(v) => handleChange('voice', v)} 
                            disabled={isGenerating} 
                          />
                        </div>
                        <div><Label>Format</Label><Select value={formData.response_format} onValueChange={(v) => handleChange('response_format', v)} disabled={isGenerating}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mp3">MP3</SelectItem><SelectItem value="opus">Opus</SelectItem><SelectItem value="aac">AAC</SelectItem><SelectItem value="flac">FLAC</SelectItem></SelectContent></Select></div>
                        <div className="md:col-span-3"><Label>Speed</Label><div className="border border-input bg-background rounded-md px-3 py-2 flex flex-col gap-2"><div className="flex justify-between items-center"><span className="text-muted-foreground" style={{fontSize:'10px'}}>Slower</span><span className="text-primary w-12 text-center font-semibold">{formData.speed.toFixed(2)}x</span><span className="text-muted-foreground" style={{fontSize:'10px'}}>Faster</span></div><Slider value={[formData.speed]} onValueChange={(value) => handleChange('speed', value[0])} min={0.25} max={4.0} step={0.05} disabled={isGenerating}/></div></div>
                    </div>
                </CardContent>
                <br />
                <CardFooter className="flex items-center justify-between p-0 rounded-b-lg">
                    <div className="text-sm"><span className="text-muted-foreground">Estimated Cost: </span><span className="font-bold text-primary">{estimatedCost} Credits</span></div>
                    <Button onClick={handleSubmit} disabled={isGenerating || !formData.text_input.trim()} size="lg">
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Generate Audio
                    </Button>
                </CardFooter>
            </Card>
      <hr />
            <div className="space-y-4">
                <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Audio Library</h2><Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['audioCreations'] })} disabled={isFetching}><RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} /> Refresh</Button></div>
                {isLoadingHistory ? <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div> : audios?.length > 0 ? (
                    <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {audios.map(a => <AudioCard key={a.id} audio={a} onEdit={(audio) => { setEditingAudio(audio); setNewTitle(audio.title); }} onDelete={setDeletingAudio} />)}
                    </motion.div>
                ) : <div className="text-center py-16 border-2 border-dashed rounded-xl p-4"><h3 className="text-xl font-semibold">Your library is empty</h3><p className="text-muted-foreground mt-2">Generated audios will appear here.</p></div>}
            </div>

            <Dialog open={!!editingAudio} onOpenChange={() => setEditingAudio(null)}><DialogContent><DialogHeader><DialogTitle>Edit Audio Title</DialogTitle><DialogDescription>Give your audio a new title to easily identify it later.</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><Label htmlFor="title">Title</Label><Input id="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setEditingAudio(null)}>Cancel</Button><Button onClick={handleUpdateTitle} disabled={isUpdating}>{isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes</Button></DialogFooter></DialogContent></Dialog>
            <Dialog open={!!deletingAudio} onOpenChange={() => setDeletingAudio(null)}><DialogContent><DialogHeader><DialogTitle>Are you sure?</DialogTitle><DialogDescription>This will permanently delete the audio titled "{deletingAudio?.title}". This action cannot be undone.</DialogDescription></DialogHeader><DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button variant="destructive" onClick={() => deleteAudio(deletingAudio.id)} disabled={isDeleting}>{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete</Button></DialogFooter></DialogContent></Dialog>
        </div>
    );
};

export default AudioGenerator;