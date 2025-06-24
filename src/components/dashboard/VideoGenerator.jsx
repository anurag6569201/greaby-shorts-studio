import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Play, RefreshCw, AlertCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FancyCreationCard } from "./fancy/FancyCreationCard"; // Assuming this is a custom component for displaying creations

const listVariants = {
  visible: { transition: { staggerChildren: 0.07 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const CreationCard = React.memo(({ creation }) => {
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);

  const getAspectRatioClass = (aspectRatio) => {
    if (aspectRatio === "9:16") return "aspect-[9/16]";
    if (aspectRatio === "1:1") return "aspect-square";
    return "aspect-video";
  };

  const handleDownload = (e) => {
    e.stopPropagation(); // Prevent triggering the play button
    const link = document.createElement('a');
    link.href = creation.result_url;
    link.setAttribute('download', `${creation.id}.mp4`);
    link.setAttribute('target', '_blank'); // Open in new tab for direct download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div layout variants={cardVariants}>
      <Card className="overflow-hidden flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div className={`bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative ${getAspectRatioClass(creation.aspect_ratio)}`}>
            {creation.status === 'completed' && creation.result_url ? (
              <>
                {shouldLoadVideo ? (
                  <video key={creation.id} src={creation.result_url} controls autoPlay muted loop className="w-full h-full object-cover bg-black" />
                ) : (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 cursor-pointer group" onClick={() => setShouldLoadVideo(true)}>
                    <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="h-8 w-8 text-white ml-1" />
                    </div>
                  </div>
                )}
                {/* Placeholder image/thumbnail could go here, under the play button overlay */}
                <div className="w-full h-full bg-slate-200" />
              </>
            ) : (
              <div className="text-center p-4">
                {['pending', 'processing'].includes(creation.status) ? (
                  <><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" /><p className="text-sm text-muted-foreground capitalize">{creation.status}...</p></>
                ) : (
                  <><AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" /><p className="text-sm text-destructive font-semibold">Failed</p></>
                )}
              </div>
            )}
          </div>
        </CardContent>
        <div className="p-4 space-y-2 border-t mt-auto bg-card flex-grow">
          <p className="text-sm font-medium line-clamp-2 text-foreground" title={creation.prompt}>{creation.prompt}</p>
        </div>
        <CardFooter className="p-4 pt-0 flex justify-between items-center">
          <p className="text-xs text-muted-foreground">{new Date(creation.created_at).toLocaleString()}</p>
          {creation.status === 'completed' && (
            <Button size="sm" variant="ghost" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
});

const calculateVideoCost = (resolution, duration, n_variants) => {
  const base_cost = 2.0;
  const resolution_costs = { '480p': 1.0, '720p': 1.5, '1080p': 2.5 };
  const resolution_multiplier = resolution_costs[resolution] || 1.0;
  const duration_cost = duration * 0.5;
  const total_cost = (base_cost + (duration_cost * resolution_multiplier)) * n_variants;
  return total_cost.toFixed(2);
};

const VideoGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [settings, setSettings] = useState({ aspectRatio: "1:1", resolution: "480p", duration: 5, n_variants: 1 });
  const queryClient = useQueryClient();
  const { fetchUserProfile } = useAuth();
  const navigate = useNavigate();

  const { data: creations, isLoading: isLoadingHistory, isFetching } = useQuery({
    queryKey: ['videoCreations'],
    queryFn: () => api.get('/videos/').then(res => res.data),
    refetchInterval: (data) => Array.isArray(data) && data.some(c => ['pending', 'processing'].includes(c.status)) ? 5000 : false,
  });

  const { mutate: generateVideo, isLoading: isGenerating } = useMutation({
    mutationFn: (newCreation) => api.post('/videos/', newCreation),
    onSuccess: (response) => {
      toast.success("Video generation started!", { description: "Your new creation will appear in your library shortly." });

      // Manually update the react-query cache to add the new "pending" creation instantly
      queryClient.setQueryData(['videoCreations'], (oldData = []) => {
        // The backend returns the new creation object in the response.data
        return [response.data, ...oldData];
      });

      // We still invalidate other queries and refetch the user profile
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      fetchUserProfile();
      setPrompt("");
    },
    onError: (error) => {
      if (error.response?.status === 402) {
        toast.error("Insufficient Credits", {
          description: error.response?.data?.detail || "Please purchase more credits to continue.",
          action: { label: "Buy Credits", onClick: () => navigate('/pricing') }
        });
      } else {
        toast.error("Generation Failed", { description: error.response?.data?.detail || "An unexpected error occurred." });
      }
    },
  });

  const estimatedCost = useMemo(() => {
    return calculateVideoCost(settings.resolution, settings.duration, settings.n_variants);
  }, [settings]);

  const handleSubmit = () => {
    if (!prompt.trim()) return toast.warning("Please enter a prompt to begin.");
    generateVideo({ prompt, ...settings });
  };

  return (
    <div className="space-y-8">
      <Card className="bg-transparent shadow-none border border-none" style={{ border: 'none' }}>
        <CardHeader className="p-0">
          <CardTitle className="text-2xl flex items-center"><Sparkles className="h-6 w-6 mr-3 text-primary" />Video Generation</CardTitle>
          <CardDescription>Describe your vision, choose your settings, and let our AI bring it to life.</CardDescription>
        </CardHeader>
        <hr style={{ marginTop: '10px', marginBottom: '5px' }} />
        <CardContent className="space-y-6 p-0 pt-4">
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
        <br />
        <CardFooter className="flex items-center justify-between p-0 rounded-b-lg">
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
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['videoCreations'] })} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
        {isLoadingHistory ? (
          <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
        ) : (
          <AnimatePresence>
            {creations?.length > 0 ? (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4"
                variants={listVariants}
                initial="hidden"
                animate="visible"
              >
                {creations.map((creation, index) => (
                  <FancyCreationCard
                    key={creation.id}
                    creation={creation}
                    cardVariants={cardVariants} // Pass down the animation variants
                    variant={(index % 2) + 1} // Cycle through 5 color variants dynamically
                  />
                ))}
              </motion.div>
            ) : (
              <div className="text-center py-16 border-2 border-dashed rounded-xl p-4">
                <h3 className="text-xl font-semibold">Your gallery is empty</h3>
                <p className="text-muted-foreground mt-2">Use the controls above to create your first video.</p>
              </div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default VideoGenerator;