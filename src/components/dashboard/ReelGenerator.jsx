import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardFooter, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clapperboard, Loader2, RefreshCw, Video, Mic, CheckCircle2, Download, Trash2, MoreHorizontal, Edit, Subtitles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const AssetCard = ({ asset, type, onSelect, isSelected }) => {
  const isVideo = type === 'video';
  return (
    <div 
      className={`p-3 border rounded-lg cursor-pointer transition-all ${isSelected ? 'border-primary ring-2 ring-primary bg-primary/5' : 'hover:border-slate-400'}`}
      onClick={() => onSelect(asset.id)}
    >
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-md flex items-center justify-center ${isVideo ? 'bg-purple-100' : 'bg-emerald-100'}`}>
          {isVideo ? <Video className="h-5 w-5 text-purple-600" /> : <Mic className="h-5 w-5 text-emerald-600" />}
        </div>
        <div className="flex-grow overflow-hidden">
          <p className="text-sm font-medium truncate">{isVideo ? asset.prompt : asset.title}</p>
          <p className="text-xs text-muted-foreground">{new Date(asset.created_at).toLocaleDateString()}</p>
        </div>
        {isSelected && <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />}
      </div>
    </div>
  );
};

const ReelCard = ({ reel, onEdit, onDelete, onGenerateSubtitles }) => {
    const isSubtitleProcessing = reel.subtitle_status === 'pending';
    const isSubtitleReady = reel.subtitle_status === 'completed' && reel.subtitle_url;

    return (
        <Card className="overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex-row items-start justify-between">
                <div className="space-y-1 flex-grow overflow-hidden pr-2">
                    <CardTitle className="text-base truncate" title={reel.title}>{reel.title}</CardTitle>
                    <CardDescription className="text-xs">{new Date(reel.created_at).toLocaleString()}</CardDescription>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="flex-shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(reel)}><Edit className="mr-2 h-4 w-4" /> Edit Title</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(reel)} className="text-red-600 focus:text-red-600 focus:bg-red-50"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="flex-grow flex items-center justify-center p-0">
                <div className="aspect-video w-full bg-slate-100 flex items-center justify-center">
                    {reel.status === 'completed' && reel.result_url ? (
                        <video src={reel.result_url} controls muted loop className="w-full h-full object-cover bg-black" />
                    ) : (
                        <div className="text-center p-4">
                            {['pending', 'processing'].includes(reel.status) ? (
                                <><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" /><p className="text-sm text-muted-foreground capitalize">{reel.status}...</p></>
                            ) : (
                                <><AlertCircle className="h-8 w-8 text-destructive mx-auto" /><p className="text-sm text-destructive mt-2 font-semibold">Failed</p></>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="p-4 flex flex-wrap gap-2 justify-between items-center bg-muted/50">
                {isSubtitleReady ? (
                     <Button size="sm" variant="outline" onClick={() => window.open(reel.subtitle_url, '_blank')}><Download className="h-4 w-4 mr-2" />Download SRT</Button>
                ) : (
                     <Button size="sm" variant="secondary" onClick={() => onGenerateSubtitles(reel.id)} disabled={isSubtitleProcessing || reel.status !== 'completed'}>
                        {isSubtitleProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Subtitles className="h-4 w-4 mr-2" />}
                        {isSubtitleProcessing ? "Generating..." : "Add Subtitles"}
                    </Button>
                )}
                {reel.result_url && <Button size="sm" onClick={() => window.open(reel.result_url, '_blank')}><Download className="h-4 w-4 mr-2" />Download Reel</Button>}
            </CardFooter>
        </Card>
    );
};

const ReelGenerator = () => {
    const [title, setTitle] = useState("");
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [selectedAudio, setSelectedAudio] = useState(null);
    const [editingReel, setEditingReel] = useState(null);
    const [deletingReel, setDeletingReel] = useState(null);
    const [newTitle, setNewTitle] = useState("");
    
    const queryClient = useQueryClient();
    const { fetchUserProfile } = useAuth();
    const navigate = useNavigate();

    const { data: videoCreations, isLoading: isLoadingVideos } = useQuery({ queryKey: ['videoCreations'], queryFn: () => api.get('/videos/').then(res => res.data) });
    const { data: audioCreations, isLoading: isLoadingAudios } = useQuery({ queryKey: ['audioCreations'], queryFn: () => api.get('/audios/').then(res => res.data) });
    const { data: reels, isLoading: isLoadingReels, isFetching: isFetchingReels } = useQuery({
        queryKey: ['reels'],
        queryFn: () => api.get('/reels/').then(res => res.data),
        refetchInterval: (data) => Array.isArray(data) && data.some(c => ['pending', 'processing'].includes(c.status) || c.subtitle_status === 'pending') ? 8000 : false,
    });
    
    const { mutate: createReel, isLoading: isCreating } = useMutation({
        mutationFn: (newReel) => api.post('/reels/', newReel),
        onSuccess: () => {
            toast.success("Reel assembly started!", { description: "Your new reel is being created. This may take a moment." });
            queryClient.invalidateQueries({ queryKey: ['reels'] });
            setTitle("");
            setSelectedVideo(null);
            setSelectedAudio(null);
        },
        onError: (error) => toast.error("Assembly Failed", { description: error.response?.data?.detail || "An unexpected error occurred." }),
    });

    const { mutate: updateReel, isLoading: isUpdating } = useMutation({
      mutationFn: ({ id, title }) => api.patch(`/reels/${id}/`, { title }),
      onSuccess: () => {
        toast.success("Reel updated successfully!");
        queryClient.invalidateQueries({ queryKey: ['reels'] });
        setEditingReel(null);
      },
      onError: (error) => toast.error("Update Failed", { description: error.response?.data?.detail }),
    });

    const { mutate: deleteReel, isLoading: isDeleting } = useMutation({
      mutationFn: (id) => api.delete(`/reels/${id}/`),
      onSuccess: () => {
        toast.success("Reel deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ['reels'] });
        setDeletingReel(null);
      },
      onError: (error) => toast.error("Delete Failed", { description: error.response?.data?.detail }),
    });

    const { mutate: generateSubtitles } = useMutation({
        mutationFn: (reelId) => api.post(`/reels/${reelId}/generate-subtitles/`),
        onSuccess: () => {
            toast.success("Subtitle generation started!", { description: "Your .SRT file will be available shortly."});
            queryClient.invalidateQueries({ queryKey: ['reels'] });
            fetchUserProfile();
        },
        onError: (error) => {
            if (error.response?.status === 402) {
                toast.error("Insufficient Credits", { 
                    description: error.response?.data?.detail,
                    action: { label: "Buy Credits", onClick: () => navigate('/pricing') }
                });
            } else {
                toast.error("Subtitle Generation Failed", { description: error.response?.data?.detail || "An unexpected error occurred." });
            }
        },
    });

    const handleCreateReel = () => {
        if (!title.trim() || !selectedVideo || !selectedAudio) {
            return toast.warning("Please provide a title and select one video and one audio asset.");
        }
        createReel({ title, video_creation_id: selectedVideo, audio_creation_id: selectedAudio });
    };

    const handleUpdateTitle = () => {
      if (!newTitle.trim() || !editingReel) return;
      updateReel({ id: editingReel.id, title: newTitle });
    };

    const completedVideos = useMemo(() => videoCreations?.filter(v => v.status === 'completed') || [], [videoCreations]);
    const completedAudios = useMemo(() => audioCreations?.filter(a => a.status === 'completed') || [], [audioCreations]);
    const isLoadingAssets = isLoadingVideos || isLoadingAudios;

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-2xl"><Clapperboard className="h-6 w-6 mr-3 text-primary" />Assemble a New Reel</CardTitle>
                    <CardDescription>Combine a video and an audio clip to create your final masterpiece.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label htmlFor="reel-title">Reel Title</Label>
                        <Input id="reel-title" placeholder="e.g., My Awesome Panda Adventure" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isCreating} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>1. Choose a Video</Label>
                            <ScrollArea className="h-64 w-full rounded-md border p-4">
                                {isLoadingAssets && <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>}
                                {completedVideos.length > 0 ? (
                                    <div className="space-y-3">{completedVideos.map(v => <AssetCard key={v.id} asset={v} type="video" onSelect={setSelectedVideo} isSelected={selectedVideo === v.id} />)}</div>
                                ) : !isLoadingAssets && <p className="text-sm text-center text-muted-foreground pt-4">No completed videos available.</p>}
                            </ScrollArea>
                        </div>
                        <div className="space-y-2">
                            <Label>2. Choose an Audio Track</Label>
                            <ScrollArea className="h-64 w-full rounded-md border p-4">
                                {isLoadingAssets && <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>}
                                {completedAudios.length > 0 ? (
                                    <div className="space-y-3">{completedAudios.map(a => <AssetCard key={a.id} asset={a} type="audio" onSelect={setSelectedAudio} isSelected={selectedAudio === a.id} />)}</div>
                                ) : !isLoadingAssets && <p className="text-sm text-center text-muted-foreground pt-4">No completed audios available.</p>}
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/50 p-4 rounded-b-lg">
                    <Button onClick={handleCreateReel} disabled={isCreating || !selectedVideo || !selectedAudio} size="lg" className="w-full">
                        {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Assemble Reel
                    </Button>
                </CardFooter>
            </Card>

            <div>
                <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold">Reels Library</h2><Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['reels'] })} disabled={isFetchingReels}><RefreshCw className={`h-4 w-4 mr-2 ${isFetchingReels ? 'animate-spin' : ''}`} /> Refresh</Button></div>
                {isLoadingReels ? <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : reels?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{reels.map(r => <ReelCard key={r.id} reel={r} onEdit={(reel) => { setEditingReel(reel); setNewTitle(reel.title); }} onDelete={setDeletingReel} onGenerateSubtitles={generateSubtitles}/>)}</div>
                ) : <div className="text-center py-16 border-2 border-dashed rounded-xl"><h3 className="text-xl font-semibold">Your library is empty</h3><p className="text-muted-foreground mt-2">Assembled reels will appear here.</p></div>}
            </div>

            <Dialog open={!!editingReel} onOpenChange={() => setEditingReel(null)}><DialogContent><DialogHeader><DialogTitle>Edit Reel Title</DialogTitle></DialogHeader><div className="py-4"><Label htmlFor="reel-new-title">Title</Label><Input id="reel-new-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setEditingReel(null)}>Cancel</Button><Button onClick={handleUpdateTitle} disabled={isUpdating}>{isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes</Button></DialogFooter></DialogContent></Dialog>
            <Dialog open={!!deletingReel} onOpenChange={() => setDeletingReel(null)}><DialogContent><DialogHeader><DialogTitle>Are you sure?</DialogTitle><DialogDescription>This will permanently delete the reel titled "{deletingReel?.title}". This action cannot be undone.</DialogDescription></DialogHeader><DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button variant="destructive" onClick={() => deleteReel(deletingReel.id)} disabled={isDeleting}>{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete</Button></DialogFooter></DialogContent></Dialog>
        </div>
    );
};

export default ReelGenerator;