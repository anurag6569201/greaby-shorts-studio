import React, { useState } from "react";
import { useInView } from 'react-intersection-observer';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Wand2, Loader2, Play, Download, Lock, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from "@/context/AuthContext";
import { useCachedVideo } from "@/hooks/useCachedVideo";
import api from "@/services/api";

/**
 * The definitive, memoized, "Click-to-Load" component for displaying creations.
 */
const CreationCard = React.memo(({ creation }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [wantsToLoad, setWantsToLoad] = useState(false);

  const { ref } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { source, isLoading, error } = useCachedVideo(wantsToLoad ? creation.content_url : null);

  const getAspectRatioClass = (aspectRatio) => {
    if (aspectRatio === "9:16") return "aspect-[9/16]";
    if (aspectRatio === "1:1") return "aspect-square";
    return "aspect-video";
  };
  
  const handleLoadVideo = () => {
    if (!wantsToLoad) setWantsToLoad(true);
  };

  const handleDownload = async () => {
    if (!creation.content_url || isDownloading) return;
    setIsDownloading(true);
    const toastId = `dl-${creation.id}`;

    try {
      const downloadUrl = `${creation.content_url}&download=true`;
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`Server responded with ${response.status}`);
      if (!response.body) throw new Error("Response body is not available.");
      
      const contentLength = response.headers.get('Content-Length');
      const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
      
      // --- THE TEE() SOLUTION ---
      // Split the stream into two identical, independent streams
      const [streamForBlob, streamForToast] = response.body.tee();

      // --- Promise 1: Update the toast with progress ---
      const toastPromise = new Promise((resolve, reject) => {
        const reader = streamForToast.getReader();
        let loaded = 0;
        
        toast(
            <div className="flex flex-col gap-2 w-full"><p className="font-semibold">Downloading...</p><Progress value={0} /><p className="text-xs text-muted-foreground">Starting...</p></div>,
            { id: toastId, duration: 999999 }
        );

        async function read() {
            try {
                const { done, value } = await reader.read();
                if (done) return resolve();
                loaded += value.length;
                if (totalSize > 0) {
                    const percent = Math.round((loaded / totalSize) * 100);
                    toast(
                        <div className="flex flex-col gap-2 w-full"><p className="font-semibold">Downloading... {percent}%</p><Progress value={percent} /><p className="text-xs text-muted-foreground">{(loaded / 1024 / 1024).toFixed(1)}MB / {(totalSize / 1024 / 1024).toFixed(1)}MB</p></div>,
                        { id: toastId }
                    );
                }
                read();
            } catch (e) { reject(e); }
        }
        read();
      });
      
      // --- Promise 2: Create the blob for download ---
      const blobPromise = new Response(streamForBlob).blob();

      // --- Execute concurrently ---
      const [blob] = await Promise.all([blobPromise, toastPromise]);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${creation.id}.mp4`;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Download complete!", { id: toastId, duration: 4000 });
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Download failed", { description: "Please check the console.", id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card ref={ref} className="overflow-hidden flex flex-col">
      <CardContent className="p-0">
        <div className={`bg-slate-100 flex items-center justify-center relative ${getAspectRatioClass(creation.settings.aspectRatio)} min-h-[200px]`}>
          {creation.status === 'completed' ? (
            <>
              {!source && !isLoading && (
                <button onClick={handleLoadVideo} className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity focus:opacity-100">
                  <Play className="h-12 w-12 text-white drop-shadow-lg" />
                </button>
              )}
              {isLoading && (
                <div className="p-4"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>
              )}
              {error && (
                <div className="p-4 text-center text-red-600"><AlertCircle className="mx-auto mb-2" /><p className="text-xs">Could not load video.</p></div>
              )}
              {source && (
                <video key={creation.id} src={source} controls autoPlay preload="auto" className="w-full h-full object-cover bg-black" />
              )}
            </>
          ) : (
            <div className="text-center p-4">
              {['pending', 'processing'].includes(creation.status) ? (
                <><Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-2" /><p className="text-sm text-slate-600 capitalize">{creation.status}...</p></>
              ) : (
                <p className="text-sm text-red-600 font-semibold">Generation Failed</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <div className="p-4 space-y-2 border-t mt-auto">
        <p className="text-sm font-medium truncate text-slate-800" title={creation.prompt}>{creation.prompt}</p>
        <div className="flex justify-between items-center">
          <p className="text-xs text-slate-500">{new Date(creation.created_at).toLocaleString()}</p>
          {creation.content_url && (
            <Button size="sm" variant="outline" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
              Download
            </Button>
          )}
        </div>
        {creation.status === 'failed' && creation.error_message && (
          <p className="text-xs text-red-600 bg-red-50 p-2 rounded-md truncate" title={creation.error_message}>Error: {creation.error_message}</p>
        )}
      </div>
    </Card>
  );
});
CreationCard.displayName = 'CreationCard';

/**
 * The main component for generating and viewing video creations.
 */
const VideoGenerator = () => {
    const [prompt, setPrompt] = useState("");
    const [settings, setSettings] = useState({ aspectRatio: "1:1", resolution: "480p", duration: "5s" });
    const queryClient = useQueryClient();
    const { subscription } = useAuth();
    const plan = subscription?.plan;

    const { data: creations, isLoading: isLoadingHistory, isFetching: isFetchingHistory } = useQuery({
        queryKey: ['creations'],
        queryFn: () => api.get('/creations/history/').then(res => res.data),
        refetchInterval: (query) => {
            const data = query.state.data;
            const hasPendingTasks = Array.isArray(data) && data.some(c => ['pending', 'processing'].includes(c.status));
            return hasPendingTasks ? 5000 : false;
        },
        staleTime: 60 * 1000,
    });
    
    const { mutate: generateVideo, isLoading: isGenerating } = useMutation({
        mutationFn: (newCreation) => api.post('/creations/generate/video/', newCreation),
        onSuccess: () => {
            toast.success("Generation started!", { description: "Your new video is being created." });
            queryClient.invalidateQueries({ queryKey: ['creations'] });
            setPrompt("");
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.detail || "An unexpected error occurred.";
            toast.error("Generation Failed", { description: errorMsg });
        }
    });

    const handleGenerateClick = () => {
        if (!prompt.trim()) {
            toast.warning("Please enter a prompt to generate a video.");
            return;
        }
        generateVideo({ prompt, settings });
    };
    
    const handleRefreshClick = () => {
        queryClient.invalidateQueries({ queryKey: ['creations'] });
    };

    const allResolutions = [{ value: "480p", label: "480p (SD)" }, { value: "720p", label: "720p (HD)" }, { value: "1080p", label: "1080p (Full HD)" }];
    const allAspectRatios = [{ value: "1:1", label: "1:1 (Square)" }, { value: "9:16", label: "9:16 (Portrait)" }, { value: "16:9", label: "16:9 (Landscape)" }];
    const allDurations = [{ value: "5s", label: "5s" }, { value: "10s", label: "10s" }, { value: "15s", label: "15s" }, { value: "20s", label: "20s" }];

    const isOptionDisabled = (type, value) => {
        if (!plan) return true;
        if (type === 'resolution') return !plan.allowed_resolutions.includes(value);
        if (type === 'aspectRatio') return !plan.allowed_aspect_ratios.includes(value);
        if (type === 'duration') return parseInt(value.replace('s', '')) > plan.max_duration;
        return false;
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Video Generator</h1>
                <p className="text-slate-600">Transform your ideas into stunning video content in seconds.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Wand2 className="h-5 w-5 mr-2 text-purple-600" />Create Your Video</CardTitle>
                    <CardDescription>Describe the video you want to see and choose your settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Textarea id="prompt" placeholder="A panda flying through space with a rainbow trail, cinematic lighting, 4K quality..." value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-24" disabled={isGenerating} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SelectControl label="Aspect Ratio" value={settings.aspectRatio} onValueChange={(v) => setSettings(s => ({ ...s, aspectRatio: v }))} options={allAspectRatios} isDisabled={isGenerating} isOptionDisabled={(v) => isOptionDisabled('aspectRatio', v)} />
                        <SelectControl label="Resolution" value={settings.resolution} onValueChange={(v) => setSettings(s => ({ ...s, resolution: v }))} options={allResolutions} isDisabled={isGenerating} isOptionDisabled={(v) => isOptionDisabled('resolution', v)} />
                        <SelectControl label="Duration" value={settings.duration} onValueChange={(v) => setSettings(s => ({ ...s, duration: v }))} options={allDurations} isDisabled={isGenerating} isOptionDisabled={(v) => isOptionDisabled('duration', v)} />
                    </div>
                    <Button onClick={handleGenerateClick} disabled={isGenerating} className="w-full bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-700 hover:to-emerald-700">
                        {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : "Generate Video"}
                    </Button>
                </CardContent>
            </Card>
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-800">Your Creations</h2>
                    <Button variant="outline" size="sm" onClick={handleRefreshClick} disabled={isFetchingHistory}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isFetchingHistory ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
                {isLoadingHistory && !creations ? (
                    <p className="text-slate-500">Loading your creation history...</p>
                ) : creations?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {creations.map(c => <CreationCard key={c.id} creation={c} />)}
                    </div>
                ) : (
                    <p className="text-slate-500">You haven't generated any videos yet. Create one above!</p>
                )}
            </div>
        </div>
    );
};

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
                            {isOptionDisabled(opt.value) && <Lock className="h-4 w-4 ml-2 text-slate-400" />}
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
);

export default VideoGenerator;