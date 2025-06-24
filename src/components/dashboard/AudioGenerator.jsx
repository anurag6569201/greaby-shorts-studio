import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Mic, Loader2, RefreshCw, MoreHorizontal, Edit, Trash2, Sparkles, AlertCircle, Play } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

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
            <Button variant="outline" className="w-full h-10 design-background" onClick={() => setShouldLoadAudio(true)}>
              <Play className="h-4 w-4 mr-2" />
              Preview
            </Button>
          )
        ) : (
          <div className="text-center">
            {['pending', 'processing'].includes(audio.status) ? (
                <><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /><p className="text-xs text-muted-foreground mt-2 capitalize">{audio.status}...</p></>
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
    const format_costs = { 'flac': 0.2, 'wav': 0.2, 'pcm': 0.2 };
    const format_surcharge = format_costs[response_format] || 0.0;
    const total_cost = base_cost + character_cost + format_surcharge;
    return Math.max(0.5, total_cost).toFixed(2);
};

const AudioGenerator = () => {
    const [formData, setFormData] = useState({ title: "", text_input: "", voice: "alloy", response_format: "mp3", speed: 1.0 });
    const [editingAudio, setEditingAudio] = useState(null);
    const [deletingAudio, setDeletingAudio] = useState(null);
    const [newTitle, setNewTitle] = useState("");

    const queryClient = useQueryClient();
    const { fetchUserProfile } = useAuth();
    const navigate = useNavigate();

    const { data: audios, isLoading: isLoadingHistory, isFetching } = useQuery({
        queryKey: ['audioCreations'],
        queryFn: () => api.get('/audios/').then(res => res.data),
        refetchInterval: (data) => Array.isArray(data) && data.some(c => ['pending', 'processing'].includes(c.status)) ? 5000 : false,
    });
    
    const { mutate: generateAudio, isLoading: isGenerating } = useMutation({
        mutationFn: (newAudio) => api.post('/audios/', newAudio),
        onSuccess: () => {
            toast.success("Audio generation started!");
            queryClient.invalidateQueries({ queryKey: ['audioCreations'] });
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
                    <CardDescription>Generate a voiceover from text. This will be used for your reels.</CardDescription>
                </CardHeader>
                <hr style={{marginTop:'10px',marginBottom:'5px'}}/>
                <CardContent className="space-y-6 p-0 pt-4">
                    <div className="space-y-2"><Label>Title (Optional)</Label><Input placeholder="e.g., Intro Voiceover" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} disabled={isGenerating} /></div>
                    <div className="space-y-2" style={{marginTop:'15px'}}><Label htmlFor="prompt-area" className="text-base font-semibold">Script</Label><Textarea id="prompt-area" placeholder="Enter the text for your voiceover..." value={formData.text_input} onChange={(e) => handleChange('text_input', e.target.value)} className="min-h-[150px]" disabled={isGenerating} style={{minHeight:"200px"}}/></div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                        <div><Label>Voice</Label><Select value={formData.voice} onValueChange={(v) => handleChange('voice', v)} disabled={isGenerating}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="alloy">Alloy</SelectItem><SelectItem value="echo">Echo</SelectItem><SelectItem value="fable">Fable</SelectItem><SelectItem value="onyx">Onyx</SelectItem><SelectItem value="nova">Nova</SelectItem><SelectItem value="shimmer">Shimmer</SelectItem></SelectContent></Select></div>
                        <div><Label>Format</Label><Select value={formData.response_format} onValueChange={(v) => handleChange('response_format', v)} disabled={isGenerating}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mp3">MP3</SelectItem><SelectItem value="opus">Opus</SelectItem><SelectItem value="aac">AAC</SelectItem><SelectItem value="flac">FLAC</SelectItem></SelectContent></Select></div>
                        <div><Label>Speed</Label><div className="border border-input bg-background rounded-md px-3 py-2 flex flex-col gap-2"><div className="flex justify-between items-center"><span className="text-muted-foreground" style={{fontSize:'10px'}}>Adjust speed</span><span className="text-primary w-12 text-center" style={{fontSize:'10px'}}>{formData.speed.toFixed(2)}x</span></div><Slider value={[formData.speed]} onValueChange={(value) => handleChange('speed', value[0])} min={0.25} max={4.0} step={0.05} disabled={isGenerating}/></div></div>
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
                    <motion.div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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