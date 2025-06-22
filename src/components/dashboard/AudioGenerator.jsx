// src/components/dashboard/AudioGenerator.jsx

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, Loader2, Lock, RefreshCw, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";

const AudioCard = ({ audio, onEdit, onDelete }) => {
  return (
    <Card className="overflow-hidden flex flex-col">
      <CardHeader className="flex-row items-start justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base truncate" title={audio.title}>{audio.title}</CardTitle>
          <CardDescription className="text-xs">{new Date(audio.created_at).toLocaleString()}</CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(audio)}><Edit className="mr-2 h-4 w-4" /> Edit Title</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(audio)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center">
        {audio.status === 'completed' && audio.result_url ? (
          <audio controls src={audio.result_url} className="w-full h-10" />
        ) : (
          <div className="text-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground mt-2 capitalize">{audio.status}...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AudioGenerator = () => {
    const [textInput, setTextInput] = useState("");
    const [settings, setSettings] = useState({ voice: "alloy", speed: "1.0" });
    const [editingAudio, setEditingAudio] = useState(null);
    const [deletingAudio, setDeletingAudio] = useState(null);
    const [newTitle, setNewTitle] = useState("");

    const queryClient = useQueryClient();
    const { subscription } = useAuth();
    const plan = subscription?.plan;

    const { data: audios, isLoading: isLoadingHistory, isFetching } = useQuery({
        queryKey: ['audioCreations'],
        queryFn: () => api.get('/audio/').then(res => res.data),
        refetchInterval: (data) => data?.some(c => ['pending', 'processing'].includes(c.status)) ? 5000 : false,
    });
    
    const { mutate: generateAudio, isLoading: isGenerating } = useMutation({
        mutationFn: (newAudio) => api.post('/audio/generate/', newAudio),
        onSuccess: () => {
            toast.success("Audio generation started!");
            queryClient.invalidateQueries({ queryKey: ['audioCreations'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            setTextInput("");
        },
        onError: (error) => toast.error("Generation Failed", { description: error.response?.data?.detail || "An unexpected error occurred." }),
    });

    const { mutate: updateAudio, isLoading: isUpdating } = useMutation({
      mutationFn: ({ id, title }) => api.patch(`/audio/${id}/`, { title }),
      onSuccess: () => {
        toast.success("Audio updated successfully!");
        queryClient.invalidateQueries({ queryKey: ['audioCreations'] });
        setEditingAudio(null);
      },
      onError: (error) => toast.error("Update Failed", { description: error.response?.data?.detail }),
    });

    const { mutate: deleteAudio, isLoading: isDeleting } = useMutation({
      mutationFn: (id) => api.delete(`/audio/${id}/`),
      onSuccess: () => {
        toast.success("Audio deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ['audioCreations'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        setDeletingAudio(null);
      },
      onError: (error) => toast.error("Delete Failed", { description: error.response?.data?.detail }),
    });

    const handleSubmit = () => {
      if (!textInput.trim()) return toast.warning("Please enter some text.");
      if (textInput.length > plan.max_audio_characters) {
        return toast.error("Text is too long for your current plan.");
      }
      generateAudio({ text_input: textInput, settings });
    };

    const handleUpdateTitle = () => {
      if (!newTitle.trim() || !editingAudio) return;
      updateAudio({ id: editingAudio.id, title: newTitle });
    };

    const isVoiceDisabled = (voice) => !plan?.available_voices?.includes(voice);
    const allVoices = [{ value: "alloy", label: "Alloy" }, { value: "echo", label: "Echo" }, { value: "fable", label: "Fable" }, { value: "onyx", label: "Onyx" }, { value: "nova", label: "Nova" }, { value: "shimmer", label: "Shimmer" }];

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Mic className="h-5 w-5 mr-2 text-primary" />Create Audio</CardTitle>
                    <CardDescription>Generate a voiceover from text. Choose from a variety of voices and speeds.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea placeholder="Enter the text for your voiceover..." value={textInput} onChange={(e) => setTextInput(e.target.value)} className="min-h-32" disabled={isGenerating} />
                    <div className="flex justify-end text-sm text-muted-foreground">
                        <span className={textInput.length > plan?.max_audio_characters ? 'text-red-500 font-medium' : ''}>
                           {textInput.length} / {plan?.max_audio_characters || 0} characters
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><Label>Voice</Label><Select value={settings.voice} onValueChange={(v) => setSettings(s => ({...s, voice: v}))} disabled={isGenerating}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allVoices.map(v => <SelectItem key={v.value} value={v.value} disabled={isVoiceDisabled(v.value)}>{v.label}{isVoiceDisabled(v.value) && <Lock className="h-4 w-4 ml-2 inline-block" />}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Speed</Label><Select value={settings.speed} onValueChange={(v) => setSettings(s => ({...s, speed: v}))} disabled={isGenerating}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0.75">Slow</SelectItem><SelectItem value="1.0">Normal</SelectItem><SelectItem value="1.25">Fast</SelectItem></SelectContent></Select></div>
                    </div>
                    <Button onClick={handleSubmit} disabled={isGenerating || !textInput.trim()} className="w-full">
                        {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : "Generate Audio"}
                    </Button>
                </CardContent>
            </Card>

            <div>
                <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold">Your Audio Library</h2><Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['audioCreations'] })} disabled={isFetching}><RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} /> Refresh</Button></div>
                {isLoadingHistory ? <p className="text-muted-foreground">Loading audio library...</p> : audios?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{audios.map(a => <AudioCard key={a.id} audio={a} onEdit={(audio) => { setEditingAudio(audio); setNewTitle(audio.title); }} onDelete={setDeletingAudio} />)}</div>
                ) : <p className="text-muted-foreground text-center py-8">Your generated audios will appear here.</p>}
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingAudio} onOpenChange={() => setEditingAudio(null)}><DialogContent><DialogHeader><DialogTitle>Edit Audio Title</DialogTitle><DialogDescription>Give your audio a new title to easily identify it later.</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><Label htmlFor="title">Title</Label><Input id="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setEditingAudio(null)}>Cancel</Button><Button onClick={handleUpdateTitle} disabled={isUpdating}>{isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes</Button></DialogFooter></DialogContent></Dialog>
            
            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletingAudio} onOpenChange={() => setDeletingAudio(null)}><DialogContent><DialogHeader><DialogTitle>Are you sure?</DialogTitle><DialogDescription>This action cannot be undone. This will permanently delete the audio titled "{deletingAudio?.title}".</DialogDescription></DialogHeader><DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button variant="destructive" onClick={() => deleteAudio(deletingAudio.id)} disabled={isDeleting}>{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete</Button></DialogFooter></DialogContent></Dialog>
        </div>
    );
};

export default AudioGenerator;