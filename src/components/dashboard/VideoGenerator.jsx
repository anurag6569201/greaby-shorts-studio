// src/components/dashboard/VideoGenerator.jsx

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Wand2, Loader2, Play, Download, Lock, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from "@/context/AuthContext";
import { useCachedVideo } from "@/hooks/useCachedVideo";
import api from "@/services/api";

const CreationCard = React.memo(({ creation }) => {
  const [wantsToLoad, setWantsToLoad] = useState(false);
  const { source, isLoading: isVideoLoading, error } = useCachedVideo(wantsToLoad ? creation.content_url : null);

  const getAspectRatioClass = (aspectRatio) => {
    if (aspectRatio === "9:16") return "aspect-[9/16]";
    if (aspectRatio === "1:1") return "aspect-square";
    return "aspect-video"; // 16:9
  };

  const handleDownload = () => {
    if (!creation.content_url) return;
    // The download parameter is handled by the proxy view on the backend
    const downloadUrl = `${creation.content_url}&download=true`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <Card className="overflow-hidden flex flex-col">
      <CardContent className="p-0">
        <div className={`bg-slate-100 flex items-center justify-center relative ${getAspectRatioClass(creation.settings.aspectRatio)} min-h-[200px]`}>
          {creation.status === 'completed' && creation.content_url ? (
            <>
              {isVideoLoading && <div className="p-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
              {error && <div className="p-4 text-center text-destructive"><AlertCircle className="mx-auto mb-2" /><p className="text-xs">Could not load video.</p></div>}
              {source && <video key={creation.id} src={source} controls autoPlay muted loop className="w-full h-full object-cover bg-black" />}
              {!source && !isVideoLoading && (
                <button onClick={() => setWantsToLoad(true)} className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity focus:opacity-100">
                  <Play className="h-12 w-12 text-white drop-shadow-lg" />
                </button>
              )}
            </>
          ) : (
            <div className="text-center p-4">
              {['pending', 'processing'].includes(creation.status) ? (
                <><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" /><p className="text-sm text-muted-foreground capitalize">{creation.status}...</p></>
              ) : (
                <p className="text-sm text-destructive font-semibold">Generation Failed</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <div className="p-4 space-y-2 border-t mt-auto">
        <p className="text-sm font-medium truncate text-foreground" title={creation.prompt}>{creation.prompt}</p>
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">{new Date(creation.created_at).toLocaleString()}</p>
          {creation.content_url && (
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-3 w-3 mr-1" /> Download
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
});

const SelectControl = ({ label, value, onValueChange, options, isDisabled, isOptionDisabled }) => (
  <div>
    <Label>{label}</Label>
    <Select value={value} onValueChange={onValueChange} disabled={isDisabled}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value} disabled={isOptionDisabled(opt.value)}>
            <div className="flex items-center justify-between w-full">
              <span>{opt.label || opt.value}</span>
              {isOptionDisabled(opt.value) && <Lock className="h-4 w-4 ml-2 text-muted-foreground" />}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const VideoGenerator = () => {
    const [prompt, setPrompt] = useState("");
    const [settings, setSettings] = useState({ aspectRatio: "1:1", resolution: "480p", duration: "5s" });
    const queryClient = useQueryClient();
    const { subscription } = useAuth();
    const plan = subscription?.plan;

    const { data: creations, isLoading: isLoadingHistory, isFetching } = useQuery({
        queryKey: ['videoCreations'],
        queryFn: () => api.get('/creations/history/').then(res => res.data),
        refetchInterval: (data) => data?.some(c => ['pending', 'processing'].includes(c.status)) ? 5000 : false,
    });
    
    const { mutate: generateVideo, isLoading: isGenerating } = useMutation({
        mutationFn: (newCreation) => api.post('/creations/generate/video/', newCreation),
        onSuccess: () => {
            toast.success("Video generation started!", { description: "Your new video is being created and will appear below." });
            queryClient.invalidateQueries({ queryKey: ['videoCreations'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            setPrompt("");
        },
        onError: (error) => toast.error("Generation Failed", { description: error.response?.data?.detail || "An unexpected error occurred." }),
    });

    const handleGenerateClick = () => {
        if (!prompt.trim()) return toast.warning("Please enter a prompt.");
        generateVideo({ prompt, settings });
    };

    const isOptionDisabled = (type, value) => {
        if (!plan) return true;
        if (type === 'resolution') return !plan.video_resolutions.includes(value);
        if (type === 'aspectRatio') return !plan.video_aspect_ratios.includes(value);
        if (type === 'duration') return parseInt(value.replace('s', '')) > plan.max_video_duration;
        return false;
    };

    const allResolutions = [{ value: "480p", label: "480p (SD)" }, { value: "720p", label: "720p (HD)" }, { value: "1080p", label: "1080p (Full HD)" }];
    const allAspectRatios = [{ value: "1:1", label: "Square" }, { value: "9:16", label: "Portrait" }, { value: "16:9", label: "Landscape" }];
    const allDurations = [{ value: "5s", label: "5s" }, { value: "10s", label: "10s" }, { value: "15s", label: "15s" }, { value: "20s", label: "20s" }];

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Wand2 className="h-5 w-5 mr-2 text-primary" />Create a Video</CardTitle>
                    <CardDescription>Describe the video you want to see. The more detailed, the better!</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Textarea placeholder="A panda flying through space with a rainbow trail, cinematic lighting, 4K..." value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-24" disabled={isGenerating} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SelectControl label="Aspect Ratio" value={settings.aspectRatio} onValueChange={(v) => setSettings(s => ({ ...s, aspectRatio: v }))} options={allAspectRatios} isDisabled={isGenerating} isOptionDisabled={(v) => isOptionDisabled('aspectRatio', v)} />
                        <SelectControl label="Resolution" value={settings.resolution} onValueChange={(v) => setSettings(s => ({ ...s, resolution: v }))} options={allResolutions} isDisabled={isGenerating} isOptionDisabled={(v) => isOptionDisabled('resolution', v)} />
                        <SelectControl label="Duration" value={settings.duration} onValueChange={(v) => setSettings(s => ({ ...s, duration: v }))} options={allDurations} isDisabled={isGenerating} isOptionDisabled={(v) => isOptionDisabled('duration', v)} />
                    </div>
                    <Button onClick={handleGenerateClick} disabled={isGenerating} className="w-full">
                        {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : "Generate Video"}
                    </Button>
                </CardContent>
            </Card>
            
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Your Videos</h2>
                    <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['videoCreations'] })} disabled={isFetching}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                </div>
                {isLoadingHistory ? (
                    <p className="text-muted-foreground">Loading your video history...</p>
                ) : creations?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {creations.map(c => <CreationCard key={c.id} creation={c} />)}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-8">You haven't generated any videos yet.</p>
                )}
            </div>
        </div>
    );
};

export default VideoGenerator;