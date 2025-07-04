import React, { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FancyCreationCard } from "./fancy/FancyCreationCard";
import { PaginationControls } from "@/components/ui/PaginationControls";

const listVariants = { visible: { transition: { staggerChildren: 0.07 } } };
const cardVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const calculateVideoCost = (resolution, duration, n_variants) => {
  const base_cost = 3.0;
  const resolution_costs = { '480p': 1.0, '720p': 1.5, '1080p': 2.0 };
  const resolution_multiplier = resolution_costs[resolution] || 1.0;
  const duration_cost = duration * 0.2;
  const total_cost = (base_cost + (duration_cost * resolution_multiplier)) * n_variants;
  return total_cost.toFixed(2);
};

const VideoList = ({ data, isLoading, onDelete, currentPage, onPageChange }) => {
    if (isLoading && !data) {
        return <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
    }
    if (data?.results?.length > 0) {
        return (
            <>
                <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" variants={listVariants} initial="hidden" animate="visible">
                    <AnimatePresence>
                        {data.results.map((creation, index) => (
                            <FancyCreationCard key={creation.id} creation={creation} cardVariants={cardVariants} variant={(index % 5) + 1} onDelete={onDelete} />
                        ))}
                    </AnimatePresence>
                </motion.div>
                <PaginationControls currentPage={currentPage} totalPages={data.total_pages} onPageChange={onPageChange} hasNext={!!data.next} hasPrev={!!data.previous} />
            </>
        );
    }
    return (
        <div className="text-center py-16 border-2 border-dashed rounded-xl p-4">
            <h3 className="text-xl font-semibold">Your gallery is empty</h3>
            <p className="text-muted-foreground mt-2">No items to display in this view.</p>
        </div>
    );
};

const VideoGenerator = () => {
    const [prompt, setPrompt] = useState("");
    const [settings, setSettings] = useState({ aspectRatio: "1:1", resolution: "480p", duration: 5, n_variants: 1 });
    const [deletingVideo, setDeletingVideo] = useState(null);
    const [view, setView] = useState('active');
    const [activePage, setActivePage] = useState(1);
    const [failedPage, setFailedPage] = useState(1);
    const queryClient = useQueryClient();
    const { fetchUserProfile } = useAuth();
    const navigate = useNavigate();
    const submissionLock = useRef(false);

    const { data: activeVideosData, isLoading: isLoadingActive, isFetching: isFetchingActive } = useQuery({
        queryKey: ['videoCreations', activePage],
        queryFn: () => api.get(`/videos/?page=${activePage}`).then(res => res.data),
        keepPreviousData: true,
    });

    const { data: failedVideosData, isLoading: isLoadingFailed, isFetching: isFetchingFailed } = useQuery({
        queryKey: ['failedVideoCreations', failedPage],
        queryFn: () => api.get(`/videos/failed/?page=${failedPage}`).then(res => res.data),
        keepPreviousData: true,
        enabled: view === 'failed',
    });

    const { mutate: generateVideo, isLoading: isGenerating } = useMutation({
        mutationFn: (newCreation) => api.post('/videos/', newCreation),
        onSuccess: (response) => {
            const newCreation = response.data;
            toast.success("Video generation started!", { description: "Your new creation will appear in your library shortly." });
            queryClient.setQueryData(['videoCreations', 1], (oldData) => {
                const oldResults = oldData?.results ?? [];
                return { ...oldData, count: (oldData?.count ?? 0) + 1, results: [newCreation, ...oldResults] };
            });
            if (activePage !== 1) setActivePage(1);
            if (view !== 'active') setView('active');
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            fetchUserProfile();
            setPrompt("");
        },
        onError: (error) => {
            if (error.response?.status === 402) {
                toast.error("Insufficient Credits", { description: error.response?.data?.detail || "Please purchase more credits to continue.", action: { label: "Buy Credits", onClick: () => navigate('/dashboard?tab=pricing') } });
            } else {
                toast.error("Generation Failed", { description: error.response?.data?.detail || "An unexpected error occurred." });
            }
        },
        onSettled: () => { submissionLock.current = false; }
    });
    
    const { mutate: deleteVideo, isLoading: isDeleting } = useMutation({
        mutationFn: (videoId) => api.delete(`/videos/${videoId}/`),
        onSuccess: (data, videoId) => {
            toast.success("Video deleted successfully!");
            const queryKey = view === 'active' ? ["videoCreations", activePage] : ["failedVideoCreations", failedPage];
            queryClient.setQueryData(queryKey, (oldData) => {
                if (!oldData) return oldData;
                const newResults = oldData.results.filter(v => v.id !== videoId);
                return { ...oldData, count: oldData.count - 1, results: newResults };
            });
            setDeletingVideo(null);
        },
        onError: (error) => { toast.error("Deletion Failed", { description: error.response?.data?.detail || "An unexpected error occurred." }); },
    });

    const estimatedCost = useMemo(() => calculateVideoCost(settings.resolution, settings.duration, settings.n_variants), [settings]);
    const handleSubmit = () => { if (submissionLock.current) return; if (!prompt.trim()) return toast.warning("Please enter a prompt to begin."); submissionLock.current = true; generateVideo({ prompt, ...settings }); };
    const handleDeleteConfirm = () => { if (!deletingVideo) return; deleteVideo(deletingVideo.id); };

    return (
        <div className="space-y-8">
            <Card className="bg-transparent shadow-none border-none">
                <CardHeader className="p-0">
                    <CardTitle className="text-2xl flex items-center"><Sparkles className="h-6 w-6 mr-3 text-primary" />Video Generation</CardTitle>
                    <CardDescription>Describe your vision, choose your settings, and let our AI bring it to life.</CardDescription>
                </CardHeader>
                <hr className="my-4" />
                <CardContent className="space-y-6 p-0">
                    <div className="space-y-2">
                        <Label htmlFor="prompt-area" className="text-base font-semibold">Prompt</Label>
                        <Textarea id="prompt-area" placeholder="A hyper-realistic video of a cat DJing at a party..." value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-[120px] text-base" disabled={isGenerating} style={{ minHeight: "200px" }} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div><Label>Aspect Ratio</Label><Select value={settings.aspectRatio} onValueChange={(v) => setSettings(s => ({ ...s, aspectRatio: v }))} disabled={isGenerating}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1:1">Square (1:1)</SelectItem><SelectItem value="16:9">Landscape (16:9)</SelectItem><SelectItem value="9:16">Portrait (9:16)</SelectItem></SelectContent></Select></div>
                        <div><Label>Resolution</Label><Select value={settings.resolution} onValueChange={(v) => setSettings(s => ({ ...s, resolution: v }))} disabled={isGenerating}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="480p">480p</SelectItem><SelectItem value="720p">720p</SelectItem><SelectItem value="1080p">1080p</SelectItem></SelectContent></Select></div>
                        <div><Label>Duration</Label><Select value={String(settings.duration)} onValueChange={(v) => setSettings(s => ({ ...s, duration: Number(v) }))} disabled={isGenerating}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="5">5s</SelectItem><SelectItem value="10">10s</SelectItem><SelectItem value="15">15s</SelectItem><SelectItem value="20">20s</SelectItem></SelectContent></Select></div>
                        <div><Label>Variants</Label><Select value={String(settings.n_variants)} onValueChange={(v) => setSettings(s => ({ ...s, n_variants: Number(v) }))} disabled={isGenerating}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem></SelectContent></Select></div>
                    </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between p-0 pt-6">
                    <div className="text-sm p-0">
                        <span className="text-muted-foreground">Estimated Cost: </span>
                        <span className="font-bold text-primary">{estimatedCost} Credits</span>
                    </div>
                    <Button onClick={handleSubmit} disabled={!prompt.trim() || isGenerating} size="lg">
                        {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                        Generate
                    </Button>
                </CardFooter>
            </Card>
            <hr />
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Video Library</h2>
                    <Button variant="outline" size="sm" onClick={() => { view === 'active' ? queryClient.invalidateQueries({ queryKey: ['videoCreations'] }) : queryClient.invalidateQueries({ queryKey: ['failedVideoCreations'] }) }} disabled={view === 'active' ? isFetchingActive : isFetchingFailed}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${(view === 'active' ? isFetchingActive : isFetchingFailed) ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                </div>
                <div className="flex border-b">
                    <Button variant="ghost" onClick={() => setView('active')} className={`rounded-none border-b-2 ${view === 'active' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Active</Button>
                    <Button variant="ghost" onClick={() => setView('failed')} className={`rounded-none border-b-2 ${view === 'failed' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Failed & Refunded</Button>
                </div>
                {view === 'active' && (
                    <VideoList data={activeVideosData} isLoading={isLoadingActive} onDelete={(video) => setDeletingVideo(video)} currentPage={activePage} onPageChange={setActivePage} />
                )}
                {view === 'failed' && (
                    <VideoList data={failedVideosData} isLoading={isLoadingFailed} onDelete={(video) => setDeletingVideo(video)} currentPage={failedPage} onPageChange={setFailedPage} />
                )}
            </div>
            <Dialog open={!!deletingVideo} onOpenChange={() => setDeletingVideo(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete the video and its file from storage.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setDeletingVideo(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default VideoGenerator;