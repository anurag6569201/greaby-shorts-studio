import React, { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardFooter, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clapperboard, Loader2, RefreshCw, Video, Mic, CheckCircle2, Download, Trash2, MoreHorizontal, Edit, Subtitles, AlertCircle, Play, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from 'framer-motion';

function truncateWords(text, wordLimit) {
  if (!text) return '';
  const words = text.split(' ');
  return words.length > wordLimit
    ? words.slice(0, wordLimit).join(' ') + '...'
    : text;
}

const AssetCard = ({ asset, type, onSelect, isSelected }) => {
  const isVideo = type === 'video';
  return (
    <div
      className={`p-3 border border-transparent rounded-lg cursor-pointer transition-all
  ${isSelected 
    ? 'ring-2 ring-inset ring-primary bg-primary/5' 
    : 'hover:ring-1 hover:ring-inset hover:ring-slate-400'}`}
      onClick={() => onSelect(asset.id)}
    >
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-md flex items-center justify-center ${isVideo ? 'bg-purple-100' : 'bg-emerald-100'}`}>
          {isVideo ? <Video className="h-5 w-5 text-purple-600" /> : <Mic className="h-5 w-5 text-emerald-600" />}
        </div>
        <div className="flex-grow overflow-hidden">
          <p className="text-sm font-medium truncate">{truncateWords(isVideo ? asset.prompt : asset.title, 10)}</p>
          <p className="text-xs text-muted-foreground">{new Date(asset.created_at).toLocaleDateString()}</p>
        </div>
        {isSelected && <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />}
      </div>
    </div>
  );
};

const ReelCard = ({ reel, onEdit, onDelete, onGenerateSubtitles }) => {
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const isSubtitleProcessing = reel.subtitle_status === 'pending';
  const isSubtitleReady = reel.subtitle_status === 'completed' && reel.subtitle_url;
  const [showOverlay, setShowOverlay] = useState(false);

  const handleDownload = (url, filename) => {
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(blobUrl);
      });
  };

  return (
    <Card className="design-background1 relative shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="design-background1 relative aspect-video w-full overflow-hidden">
        {/* ▶️ Video or Placeholder */}
        {reel.status === 'completed' && reel.result_url ? (
          shouldLoadVideo ? (
            <video
              src={reel.result_url}
              controls
              autoPlay
              muted
              loop
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <div
                className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer group"
                onClick={() => {
                  setShouldLoadVideo(true);
                }}
              >
                <div className="w-16 h-16 rounded-full bg-transparent backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform play-button-glow">
                  <Play className="h-8 w-8 text-white ml-1" />
                </div>
              </div>
              <div className="w-full h-full" style={{background:'rgb(0 0 0 / 0.4)'}} />
            </>
          )
        ) : (
          <div className="flex flex-col justify-center items-center h-full text-center px-4">
            {['pending', 'processing'].includes(reel.status) ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground capitalize">
                  {reel.status}...
                </p>
              </>
            ) : (
              <>
                <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                <p className="text-sm text-destructive font-semibold">
                  Failed
                </p>
              </>
            )}
          </div>
        )}

        {/* 🧠 Top Overlay (Header) */}
        <AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="absolute top-0 left-0 w-full z-20 bg-transparent px-4 py-3 flex items-start justify-between"
          >
            <div className="text-white overflow-hidden">
              <h3 className="text-sm font-semibold truncate">{reel.title}</h3>
              <p className="text-xs text-gray-300">{new Date(reel.created_at).toLocaleString()}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:text-grey bg-transparent hover:bg-transparent focus:bg-transparent focus:text-grey">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(reel)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit Title
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(reel)}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        </AnimatePresence>

        {/* 🎬 Bottom Overlay (Footer/Actions) */}
        <AnimatePresence>
          {showOverlay && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-0 left-0 w-full z-20 bg-transparent px-4 py-3 flex flex-wrap justify-left items-center gap-2"
            >
              {isSubtitleReady ? (
                <Button
                  size="sm"
                  variant=""
                  style={{ backgroundColor: '#7b39ed', padding: '0px 10px', color: 'white' }}
                  onClick={() => handleDownload(reel.subtitle_url, `${reel.id}.srt`)}
                >
                  <Subtitles className="" />
                  <Download className="" />

                </Button>
              ) : (
                <Button
                  size="sm"
                  variant=""
                  style={{ backgroundColor: '#7b39ed', padding: '0px 10px', color: 'white' }}
                  onClick={() => onGenerateSubtitles(reel.id)}
                  disabled={isSubtitleProcessing || reel.status !== 'completed'}
                >
                  {isSubtitleProcessing ? (
                    <Loader2 className=" animate-spin" />
                  ) : (
                    <Subtitles className="" />
                  )}
                  {isSubtitleProcessing ? '...' : ''}
                </Button>
              )}

              {reel.result_url && (
                <Button
                  size="sm"
                  variant=""
                  style={{ backgroundColor: '#7b39ed', padding: '0px 10px', color: 'white' }}
                  onClick={() => handleDownload(reel.result_url, `${reel.id}.mp4`)}
                >
                  <Download className="" />

                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center bg-white rounded-b-lg w-100 justify-center">
        <button
          onClick={() => setShowOverlay(prev => !prev)}
          className="text-grey hover:text-gray-300"
        >
          {showOverlay ? <ChevronUp className="w-6 h-6" style={{ color: '7b39ed' }} /> : <ChevronDown className="w-6 h-6" style={{ color: '7b39ed' }} />}
        </button>
      </div>
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
  const reelsCache = useRef([]);
  const { data: videoCreations, isLoading: isLoadingVideos } = useQuery({ queryKey: ['videoCreations'], queryFn: () => api.get('/videos/').then(res => res.data) });
  const { data: audioCreations, isLoading: isLoadingAudios } = useQuery({ queryKey: ['audioCreations'], queryFn: () => api.get('/audios/').then(res => res.data) });
  const { data: reels, isLoading: isLoadingReels, isFetching: isFetchingReels } = useQuery({
    queryKey: ['reels'],
    queryFn: () => api.get('/reels/').then(res => res.data),
    refetchInterval: (data) => Array.isArray(data) && data.some(c => ['pending', 'processing'].includes(c.status) || c.subtitle_status === 'pending') ? 5000 : false,
    onSuccess: (newData) => {
      newData.forEach(newReel => {
        const oldReel = reelsCache.current.find(r => r.id === newReel.id);
        if (oldReel && (oldReel.status === 'processing' || oldReel.status === 'pending') && newReel.status === 'completed') {
          toast.success(`Reel "${newReel.title}" is ready!`);
        }
      });
      reelsCache.current = newData;
    },
  });

  const { mutate: createReel, isLoading: isCreating } = useMutation({
    mutationFn: (newReel) => api.post('/reels/', newReel),
    onSuccess: () => {
      toast.success("Reel assembly started!", { description: "Your new reel is being created. This may take a moment." });
      queryClient.setQueryData(['reels'], (oldData = []) => [newReelData.data, ...oldData]);
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
      toast.success("Subtitle generation started!", { description: "Your .SRT file will be available shortly." });
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
      <Card className="bg-transparent shadow-none border border-none" style={{ border: 'none' }}>
        <CardHeader className="p-0">
          <CardTitle className="flex items-center text-2xl"><Clapperboard className="h-6 w-6 mr-3 text-primary" />Assemble a New Reel</CardTitle>
          <CardDescription>Combine a video and an audio clip to create your final masterpiece.</CardDescription>
        </CardHeader>
        <hr style={{ marginTop: '10px', marginBottom: '5px' }} />
        <CardContent className="space-y-6 p-0 pt-4">
          <div>
            <Label htmlFor="reel-title">Reel Title</Label>
            <Input id="reel-title" placeholder="e.g., My Awesome Panda Adventure" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isCreating} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <div className="space-y-2">
              <Label>1. Choose a Video</Label>
              <ScrollArea className="h-64 w-full rounded-md" style={completedVideos.length > 0 ? {} : {border: '2px dashed #e4e7eb'}}>
                {isLoadingAssets && <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>}
                {completedVideos.length > 0 ? (
                  <div className="space-y-3">
                    {completedVideos.map(v => {

                      return (
                        <AssetCard
                          key={v.id}
                          asset={v}
                          type="video"
                          onSelect={setSelectedVideo}
                          isSelected={selectedVideo === v.id}
                        />
                      );
                    })}
                  </div>
                ) : !isLoadingAssets && <p className="text-sm text-center text-muted-foreground pt-4 p-4">No completed videos available.</p>}
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <Label>2. Choose an Audio Track</Label>
              <ScrollArea className="h-64 w-full rounded-md" style={completedAudios.length > 0 ? {} : {border: '2px dashed #e4e7eb'}}>
                {isLoadingAssets && <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>}
                {completedAudios.length > 0 ? (
                  <div className="space-y-3">{completedAudios.map(a => <AssetCard key={a.id} asset={a} type="audio" onSelect={setSelectedAudio} isSelected={selectedAudio === a.id} />)}</div>
                ) : !isLoadingAssets && <p className="text-sm text-center text-muted-foreground pt-4 p-4">No completed audios available.</p>}
              </ScrollArea>
            </div>
          </div>
        </CardContent>
        <br />
        <CardFooter className="bg-muted/50 p-0 rounded-b-lg">
          <Button onClick={handleCreateReel} disabled={isCreating || !selectedVideo || !selectedAudio} size="lg" className="w-full" style={{ width: 'fit-content' }}>
            {isCreating ? <Loader2 className="mr-2 h-4 animate-spin" /> : null}
            Assemble Reel
          </Button>
        </CardFooter>
      </Card>
      <hr />

      <div>
        <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold">Reels Library</h2><Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['reels'] })} disabled={isFetchingReels}><RefreshCw className={`h-4 w-4 mr-2 ${isFetchingReels ? 'animate-spin' : ''}`} /> Refresh</Button></div>
        {isLoadingReels ? <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : reels?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">{reels.map(r => <ReelCard key={r.id} reel={r} onEdit={(reel) => { setEditingReel(reel); setNewTitle(reel.title); }} onDelete={setDeletingReel} onGenerateSubtitles={generateSubtitles} />)}</div>
        ) : <div className="text-center py-16 border-2 border-dashed rounded-xl p-4"><h3 className="text-xl font-semibold">Your library is empty</h3><p className="text-muted-foreground mt-2">Assembled reels will appear here.</p></div>}
      </div>

      <Dialog open={!!editingReel} onOpenChange={() => setEditingReel(null)}><DialogContent><DialogHeader><DialogTitle>Edit Reel Title</DialogTitle></DialogHeader><div className="py-4"><Label htmlFor="reel-new-title">Title</Label><Input id="reel-new-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setEditingReel(null)}>Cancel</Button><Button onClick={handleUpdateTitle} disabled={isUpdating}>{isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!deletingReel} onOpenChange={() => setDeletingReel(null)}><DialogContent><DialogHeader><DialogTitle>Are you sure?</DialogTitle><DialogDescription>This will permanently delete the reel titled "{deletingReel?.title}". This action cannot be undone.</DialogDescription></DialogHeader><DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button variant="destructive" onClick={() => deleteReel(deletingReel.id)} disabled={isDeleting}>{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
};

export default ReelGenerator;