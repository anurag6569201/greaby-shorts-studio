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
import { PaginationControls } from "@/components/ui/PaginationControls";

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
      className={`p-3 border rounded-lg cursor-pointer transition-all ${isSelected
        ? 'ring-2 ring-inset ring-primary bg-primary/5'
        : 'border-muted hover:bg-muted/50'}`}
      onClick={() => onSelect(asset.id)}
    >
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-md flex items-center justify-center ${isVideo ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
          {isVideo ? <Video className="h-5 w-5 text-purple-600 dark:text-purple-400" /> : <Mic className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
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

// IMPROVED ReelCard: Merged visual best practices from both versions
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
    <Card className="fancy-card-reel shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
      <div className="relative aspect-video w-full overflow-hidden bg-transparent">
        {reel.status === 'completed' && reel.result_url ? (
          shouldLoadVideo ? (
            <video src={reel.result_url} controls autoPlay muted loop className="w-full h-full object-cover" />
          ) : (
            <>
              <div className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer" onClick={() => setShouldLoadVideo(true)}>
          <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
            <Play className="h-8 w-8 text-white ml-1" />
          </div>
              </div>
              <div className="w-full h-full " />
            </>
          )
        ) : (
          <div className="flex flex-col justify-center items-center h-full text-center px-4 text-white">
            {['pending', 'processing'].includes(reel.status) ? (
              <><Loader2 className="h-8 w-8 animate-spin text-primary mb-2" /><p className="text-sm capitalize">{reel.status}...</p></>
            ) : (
              <><AlertCircle className="h-8 w-8 text-destructive mb-2" /><p className="text-sm text-destructive font-semibold">Failed</p></>
            )}
          </div>
        )}

        <div className="absolute top-0 left-0 w-full z-20 bg-gradient-to-b to-transparent p-3 flex items-start justify-between">
            <div className="text-white overflow-hidden">
              <h3 className="text-sm text-gray-800 font-semibold truncate">{reel.title}</h3>
              <p className="text-xs text-gray-500">{new Date(reel.created_at).toLocaleString()}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-800 hover:bg-white/10 h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(reel)}><Edit className="mr-2 h-4 w-4" /> Edit Title</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(reel)} className="text-red-600 focus:text-red-600 focus:bg-red-50"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>

        <AnimatePresence>
          {showOverlay && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="absolute bottom-0 left-0 w-full z-20 bg-gradient-to-t from-black/60 to-transparent p-3 flex items-center gap-2">
              {isSubtitleReady ? (
                <Button size="sm" variant="secondary" onClick={() => handleDownload(reel.subtitle_url, `${reel.id}.srt`)}><Download className="h-4 w-4 mr-2" /> Download .SRT</Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => onGenerateSubtitles(reel.id)} disabled={isSubtitleProcessing || reel.status !== 'completed'} className="bg-[#bc9bf5] hover:bg-[#a97bf0] text-white">
                  {isSubtitleProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Subtitles className="h-4 w-4 mr-2" />}
                  {isSubtitleProcessing ? 'Generating...' : 'Get Subtitles'}
                </Button>
              )}
              {reel.result_url && <Button className="bg-[#bc9bf5] hover:bg-[#a97bf0] text-white" size="sm" variant="secondary" onClick={() => handleDownload(reel.result_url, `${reel.id}.mp4`)}><Download className="h-4 w-4 mr-2" /> Video</Button>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <button onClick={() => setShowOverlay(prev => !prev)} className="w-full bg-card hover:bg-muted py-1 flex justify-center items-center text-muted-foreground hover:text-foreground transition-colors" style={{zIndex:'10',position:'relative'}}>
        {showOverlay ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
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

  const [videoPickerPage, setVideoPickerPage] = useState(1);
  const [audioPickerPage, setAudioPickerPage] = useState(1);
  const [reelsListPage, setReelsListPage] = useState(1);

  const queryClient = useQueryClient();
  const { fetchUserProfile } = useAuth();
  const navigate = useNavigate();
  // UX FEATURE: Add back the cache reference for smart notifications
  const reelsCache = useRef([]);

  const { data: videoData, isLoading: isLoadingVideos } = useQuery({
    queryKey: ['videoCreationsPicker', videoPickerPage],
    queryFn: () => api.get(`/videos/?page=${videoPickerPage}`).then(res => res.data),
    keepPreviousData: true,
  });

  const { data: audioData, isLoading: isLoadingAudios } = useQuery({
    queryKey: ['audioCreationsPicker', audioPickerPage],
    queryFn: () => api.get(`/audios/?page=${audioPickerPage}`).then(res => res.data),
    keepPreviousData: true,
  });

  // UX FEATURE: Re-introduce automatic polling and smart notifications
  const { data: reels, isLoading: isLoadingReels, isFetching: isFetchingReels } = useQuery({
    queryKey: ['reels', reelsListPage],
    queryFn: () => api.get(`/reels/?page=${reelsListPage}`).then(res => res.data),
    keepPreviousData: true,
    // This function checks the fetched data. If any item is still processing,
    // it tells React Query to refetch again in 5 seconds.
    refetchInterval: (data) =>
      data?.results?.some(
        c => ['pending', 'processing'].includes(c.status) || c.subtitle_status === 'pending'
      ) ? 5000 : false,
    // This function runs every time the query successfully fetches data.
    // It compares new data with the cached old data to find completed jobs.
    onSuccess: (newData) => {
      newData?.results?.forEach(newReel => {
        const oldReel = reelsCache.current.find(r => r.id === newReel.id);
        if (oldReel && (oldReel.status !== 'completed' && newReel.status === 'completed')) {
          toast.success(`Reel "${newReel.title}" is ready!`);
        }
        if (oldReel && (oldReel.subtitle_status !== 'completed' && newReel.subtitle_status === 'completed')) {
          toast.success(`Subtitles for "${newReel.title}" are ready!`);
        }
      });
      // Update the cache with the latest data
      if(newData?.results) {
         reelsCache.current = newData.results;
      }
    },
  });

  const { mutate: createReel, isLoading: isCreating } = useMutation({
    mutationFn: (newReel) => api.post('/reels/', newReel),
    onSuccess: () => {
      toast.success("Reel assembly started!", { description: "Your new reel is being created." });
      // Go back to the first page to see the new reel being created
      if (reelsListPage !== 1) setReelsListPage(1);
      // Invalidate query to refetch and show the new pending item
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
      queryClient.invalidateQueries({ queryKey: ['reels', reelsListPage] });
      setEditingReel(null);
    },
    onError: (error) => toast.error("Update Failed", { description: error.response?.data?.detail }),
  });

  const { mutate: deleteReel, isLoading: isDeleting } = useMutation({
    mutationFn: (id) => api.delete(`/reels/${id}/`),
    onSuccess: () => {
      toast.success("Reel deleted successfully!");
      // We invalidate the whole 'reels' key to ensure pagination is recalculated correctly
      queryClient.invalidateQueries({ queryKey: ['reels'] });
      setDeletingReel(null);
    },
    onError: (error) => toast.error("Delete Failed", { description: error.response?.data?.detail }),
  });

  const { mutate: generateSubtitles } = useMutation({
    mutationFn: (reelId) => api.post(`/reels/${reelId}/generate-subtitles/`),
    onSuccess: () => {
      toast.info("Subtitle generation started!", { description: "Your .SRT file will be available shortly." });
      // Invalidate to trigger the polling mechanism
      queryClient.invalidateQueries({ queryKey: ['reels', reelsListPage] });
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

  const completedVideos = useMemo(() => videoData?.results?.filter(v => v.status === 'completed') || [], [videoData]);
  const completedAudios = useMemo(() => audioData?.results?.filter(a => a.status === 'completed') || [], [audioData]);

  return (
    <div className="space-y-8">
      <Card className="bg-transparent shadow-none border-none">
        <CardHeader className="p-0">
          <CardTitle className="flex items-center text-2xl"><Clapperboard className="h-6 w-6 mr-3 text-primary" />Assemble a New Reel</CardTitle>
          <CardDescription>Combine a video and an audio clip to create your final masterpiece.</CardDescription>
        </CardHeader>
        <hr className="my-4" />
        <CardContent className="space-y-6 p-0">
          <div>
            <Label htmlFor="reel-title">Reel Title</Label>
            <Input id="reel-title" placeholder="e.g., My Awesome Panda Adventure" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isCreating} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="space-y-2">
              <Label>1. Choose a Video</Label>
              <div className="border rounded-md flex flex-col h-[26rem]">
                <ScrollArea className="flex-grow p-3">
                  {isLoadingVideos && <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>}
                  <div className="space-y-3">
                    {completedVideos.map(v => <AssetCard key={v.id} asset={v} type="video" onSelect={setSelectedVideo} isSelected={selectedVideo === v.id} />)}
                  </div>
                  {!isLoadingVideos && completedVideos.length === 0 && <p className="text-sm text-center text-muted-foreground pt-4">No completed videos found.</p>}
                </ScrollArea>
                <div className="p-1 border-t">
                    <PaginationControls currentPage={videoPickerPage} totalPages={videoData?.total_pages || 1} onPageChange={setVideoPickerPage} hasNext={!!videoData?.next} hasPrev={!!videoData?.previous}/>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>2. Choose an Audio Track</Label>
              <div className="border rounded-md flex flex-col h-[26rem]">
                <ScrollArea className="flex-grow p-3">
                  {isLoadingAudios && <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>}
                  <div className="space-y-3">
                    {completedAudios.map(a => <AssetCard key={a.id} asset={a} type="audio" onSelect={setSelectedAudio} isSelected={selectedAudio === a.id} />)}
                  </div>
                  {!isLoadingAudios && completedAudios.length === 0 && <p className="text-sm text-center text-muted-foreground pt-4">No completed audios found.</p>}
                </ScrollArea>
                <div className="p-1 border-t">
                    <PaginationControls currentPage={audioPickerPage} totalPages={audioData?.total_pages || 1} onPageChange={setAudioPickerPage} hasNext={!!audioData?.next} hasPrev={!!audioData?.previous}/>
                </div>
              </div>
            </div>

          </div>
        </CardContent>
        <CardFooter className="p-0 pt-6">
          <Button onClick={handleCreateReel} disabled={isCreating || !selectedVideo || !selectedAudio} size="lg">
            {isCreating ? <Loader2 className="mr-2 h-4 animate-spin" /> : <Clapperboard className="mr-2 h-4 w-4" />}
            Assemble Reel
          </Button>
        </CardFooter>
      </Card>
      <hr />

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Reels Library</h2>
          {/* Note: The refresh button is still useful for manual triggers, even with polling */}
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['reels'] })} disabled={isFetchingReels}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetchingReels && !isLoadingReels ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
        {isLoadingReels && !reels ? <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : reels?.results?.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{reels.results.map(r => <ReelCard key={r.id} reel={r} onEdit={(reel) => { setEditingReel(reel); setNewTitle(reel.title); }} onDelete={setDeletingReel} onGenerateSubtitles={generateSubtitles} />)}</div>
            <PaginationControls className="mt-6" currentPage={reelsListPage} totalPages={reels.total_pages} onPageChange={setReelsListPage} hasNext={!!reels.next} hasPrev={!!reels.previous}/>
          </>
        ) : <div className="text-center py-16 border-2 border-dashed rounded-xl p-4"><h3 className="text-xl font-semibold">Your library is empty</h3><p className="text-muted-foreground mt-2">Assembled reels will appear here.</p></div>}
      </div>

      <Dialog open={!!editingReel} onOpenChange={() => setEditingReel(null)}><DialogContent><DialogHeader><DialogTitle>Edit Reel Title</DialogTitle></DialogHeader><div className="py-4"><Label htmlFor="reel-new-title">Title</Label><Input id="reel-new-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setEditingReel(null)}>Cancel</Button><Button onClick={handleUpdateTitle} disabled={isUpdating}>{isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!deletingReel} onOpenChange={() => setDeletingReel(null)}><DialogContent><DialogHeader><DialogTitle>Are you sure?</DialogTitle><DialogDescription>This will permanently delete the reel titled "{deletingReel?.title}". This action cannot be undone.</DialogDescription></DialogHeader><DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button variant="destructive" onClick={() => deleteReel(deletingReel.id)} disabled={isDeleting}>{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
};

export default ReelGenerator;