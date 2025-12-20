import React, { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import axios from 'axios';
import { motion, AnimatePresence } from "framer-motion";
import { 
    Film, Loader2, RefreshCw, UploadCloud, Video, X, 
    AlertCircle, Download, Languages, Trash2, MoreHorizontal, 
    Play, RotateCw, Settings2 
} from "lucide-react";

import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PaginationControls } from "@/components/ui/PaginationControls"; // Assuming you have this component
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

/**
 * FancyTranslationCard: A visually rich card to display a single translation job.
 * It handles displaying status, video playback, and actions like download/retry/delete.
 */
const FancyTranslationCard = ({ translation, onDelete, onRetry }) => {
    const [shouldLoadVideo, setShouldLoadVideo] = useState(false);

    const forceDownload = async (url, filename, fileDescription) => {
        const toastId = toast.loading(`Preparing ${fileDescription}...`, {
            description: "Please wait while the file is being fetched.",
        });
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                window.URL.revokeObjectURL(blobUrl);
                document.body.removeChild(a);
            }, 100);
            toast.success("Download started!", { id: toastId });
        } catch (error) {
            console.error("Download failed:", error);
            toast.error("Download Failed", {
                id: toastId,
                description: `Could not download the ${fileDescription}. Please try again.`,
            });
        }
    };

    const handleDelete = (e) => { e.stopPropagation(); onDelete(translation); };
    const handleRetry = (e) => { e.stopPropagation(); onRetry(translation); };
    const handleDownloadVideo = (e) => {
        e.stopPropagation();
        const filename = `${translation.title || 'translated-video'}.mp4`;
        forceDownload(translation.result_video_url, filename, "video");
    };
    const handleDownloadSubtitles = (e) => {
        e.stopPropagation();
        const cleanUrl = translation.result_subtitle_url.split('?')[0];
        const extension = cleanUrl.split('.').pop() || 'srt';
        const filename = `${translation.title || 'translated-subtitles'}.${extension}`;
        forceDownload(translation.result_subtitle_url, filename, "subtitles");
    };

    const isProcessing = !['completed', 'failed'].includes(translation.status);
    let statusText = translation.live_status || translation.status.replace('_', ' ');
    const cardClassName = `fancy-card variant-1`;

    const renderMedia = () => {
        if (translation.status === 'completed' && translation.result_video_url) {
            return shouldLoadVideo ? (
                <video key={translation.id} src={translation.result_video_url} controls autoPlay muted loop className="absolute inset-0 w-full h-full object-cover bg-black" />
            ) : (
                <>
                    <div className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer group" onClick={() => setShouldLoadVideo(true)} style={{ backgroundImage: translation.thumbnail_url ? `url(${translation.thumbnail_url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                        <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Play className="h-8 w-8 text-white ml-1" />
                        </div>
                    </div>
                </>
            );
        }
        if (isProcessing || translation.status === 'upload_pending') {
            const text = translation.status === 'upload_pending' ? 'Waiting for upload...' : `${statusText}...`
            const icon = translation.status === 'upload_pending' ? <UploadCloud className="h-8 w-8 text-primary mx-auto mb-2" /> : <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />;
            return (
                <div className="w-full h-full flex items-center justify-center text-center p-4">
                    <div>
                        {icon}
                        <p className="text-sm text-slate-600 font-medium capitalize">{text}</p>
                    </div>
                </div>
            );
        }
        return (
            <div className="w-full h-full flex items-center justify-center text-center p-4">
                <div>
                    <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-red-600 font-semibold">Failed</p>
                </div>
            </div>
        );
    };

    return (
        <motion.div layout>
            <motion.div className={cardClassName} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                <div className="fancy-card__view aspect-video relative group" style={{width:'-webkit-fill-available'}}>
                    {renderMedia()}
                    <div className="absolute top-2 right-2 transition-opacity z-20">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="icon" className="h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 text-white hover:text-white focus-visible:ring-offset-0 focus-visible:ring-ring:none">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {translation.status === 'completed' && (
                                    <>
                                        <DropdownMenuItem onClick={handleDownloadVideo}><Download className="mr-2 h-4 w-4" /> Download Video</DropdownMenuItem>
                                        {translation.result_subtitle_url && (<DropdownMenuItem onClick={handleDownloadSubtitles}><Download className="mr-2 h-4 w-4" /> Download Subtitles</DropdownMenuItem>)}
                                    </>
                                )}
                                {translation.status === 'failed' && (<DropdownMenuItem onClick={handleRetry}><RotateCw className="mr-2 h-4 w-4" /> Retry</DropdownMenuItem>)}
                                <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50" disabled={isProcessing}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div className="fancy-card__content">
                    <div>
                        <p className="text-sm font-medium line-clamp-2 text-gray-800" title={translation.title}>{translation.title}</p>
                        {translation.status === 'failed' && translation.error_message && (<p className="text-xs text-red-600 mt-1 line-clamp-2" title={translation.error_message}>Error: {translation.error_message}</p>)}
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                        <span>{translation.source_locale} → {translation.target_locale}</span>
                        <span>{new Date(translation.created_at).toLocaleString([], { year: '2-digit', month: 'short', day: 'numeric' })}</span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};


/**
 * Main VideoTranslation component for the page.
 */
const VideoTranslation = () => {
    const [page, setPage] = useState(1);
    const [file, setFile] = useState(null);
    const [estimatedCost, setEstimatedCost] = useState(null);
    const [isCalculatingCost, setIsCalculatingCost] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        source_locale: "en-US",
        target_locale: "es-ES", // Changed default to Spanish for variety
        speaker_count: "",
        embed_subtitles: true,
        adjust_video_speed: false,
        use_ocr_correction: false,
    });

    const uploadCancelToken = useRef(null);
    const queryClient = useQueryClient();

    // Fetch translations for the current page
    const { data: translationsData, isLoading, isFetching } = useQuery({
        queryKey: ["videoTranslations", page],
        queryFn: () => api.get(`/translations/?page=${page}`).then((res) => res.data),
        keepPreviousData: true,
    });

    // Fetch locale options once and cache them
    const { data: localeOptions } = useQuery({
        queryKey: ["localeOptions"],
        queryFn: () => api.get("/translations/locale-options/").then((res) => res.data),
        staleTime: Infinity,
    });

    // Mutation to retry a failed translation
    const { mutate: retryTranslation } = useMutation({
        mutationFn: (translationId) => api.post(`/translations/${translationId}/retry/`),
        onSuccess: () => {
            toast.success("Retrying translation...", { description: "The job has been re-queued for processing." });
            queryClient.invalidateQueries({ queryKey: ["videoTranslations"] });
        },
        onError: (error) => {
            toast.error("Retry Failed", { description: error.response?.data?.detail || "Could not re-queue the job." });
        }
    });

    // Utility to get video duration from a file
    const getVideoDuration = useCallback((videoFile) => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => { window.URL.revokeObjectURL(video.src); resolve(video.duration); };
            video.onerror = () => reject("Could not load video metadata. The file might be invalid.");
            video.src = URL.createObjectURL(videoFile);
        });
    }, []);

    // Handle file drop, validate, and calculate cost
    const onDrop = useCallback(async (acceptedFiles) => {
        const videoFile = acceptedFiles[0];
        if (videoFile) {
            if (videoFile.size > 500 * 1024 * 1024) { // 500MB limit
                toast.error("File is too large", { description: "Please upload a video smaller than 500MB." });
                return;
            }
            setFile(videoFile);
            if (!formData.title) {
                setFormData(prev => ({ ...prev, title: videoFile.name.replace(/\.[^/.]+$/, "") }));
            }
            
            setEstimatedCost(null);
            setIsCalculatingCost(true);
            try {
                const duration = await getVideoDuration(videoFile);
                const response = await api.get(`/translations/calculate-cost/?duration_seconds=${duration}`);
                setEstimatedCost(response.data.estimated_cost);
            } catch (error) {
                setEstimatedCost(null);
                toast.error("Could not calculate cost", { description: "The video file may be unreadable." });
            } finally {
                setIsCalculatingCost(false);
            }
        }
    }, [formData.title, getVideoDuration]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'video/*': ['.mp4', '.mov', '.webm', '.mkv'] },
        multiple: false,
        disabled: isUploading,
    });

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleCancelUpload = () => {
        if (uploadCancelToken.current) {
            uploadCancelToken.current.cancel("Upload canceled by user.");
            toast.info("Upload Canceled");
        }
    };

    const resetForm = useCallback(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setFile(null);
        setFormData(prev => ({
            ...prev, 
            title: "",
            speaker_count: "",
            // Keep language preferences
        }));
        setEstimatedCost(null);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return toast.warning("Please select a video file.");
        if (!formData.title.trim()) return toast.warning("Please provide a title.");
        
        setIsUploading(true);
        setUploadProgress(0);
        uploadCancelToken.current = axios.CancelToken.source();
        let temporaryTranslationId = null;

        try {
            const apiFormData = new FormData();
            Object.keys(formData).forEach(key => apiFormData.append(key, formData[key]));
            apiFormData.append('filename', file.name);

            const initiateResponse = await api.post("/translations/initiate-upload/", apiFormData);
            const { translationId, uploadUrl, translationData } = initiateResponse.data;
            temporaryTranslationId = translationId;

            // Optimistically add to the UI
            queryClient.setQueryData(["videoTranslations", 1], (oldData) => {
                 if (!oldData) return { results: [translationData], count: 1 };
                 const newResults = [translationData, ...oldData.results];
                 return { ...oldData, count: (oldData.count || 0) + 1, results: newResults };
            });
            if (page !== 1) setPage(1);

            await axios.put(uploadUrl, file, {
                headers: { 'x-ms-blob-type': 'BlockBlob' },
                cancelToken: uploadCancelToken.current.token,
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percent);
                },
            });

            await api.post(`/translations/${translationId}/finalize-upload/`);
            toast.success("Upload Complete!", { description: "Your translation is in the queue." });
            resetForm();

        } catch (error) {
            if (axios.isCancel(error)) {
                if (temporaryTranslationId) {
                    await api.delete(`/translations/${temporaryTranslationId}/`);
                    queryClient.invalidateQueries({ queryKey: ["videoTranslations"] });
                }
            } else {
                toast.error("Process Failed", { description: error.response?.data?.detail || "An unexpected error occurred during submission." });
                if (temporaryTranslationId) {
                    await api.delete(`/translations/${temporaryTranslationId}/`);
                    queryClient.invalidateQueries({ queryKey: ["videoTranslations"] });
                }
            }
            resetForm();
        }
    };
    
    // Prompts for confirmation before deleting a translation.
    const handleDelete = (translation) => {
        toast("Are you sure?", {
            description: `This will permanently delete "${translation.title}". This action cannot be undone.`,
            action: {
                label: "Delete",
                onClick: async () => {
                    try {
                        await api.delete(`/translations/${translation.id}/`);
                        toast.success("Translation deleted.");
                        queryClient.invalidateQueries({ queryKey: ["videoTranslations"] });
                    } catch { toast.error("Failed to delete translation."); }
                }
            },
            cancel: { label: "Cancel" }
        });
    };
    
    const handleRetry = (translation) => {
        retryTranslation(translation.id);
    };

    return (
        <div className="space-y-8">
            <Card className="shadow-none border-none bg-transparent">
                <CardHeader className="p-0">
                    <CardTitle className="flex items-center text-2xl"><Languages className="h-6 w-6 mr-3 text-primary" />Video Translation</CardTitle>
                    <CardDescription>Upload a video and get its audio translated with a synthetic voice. Processing takes up to 1 hour, and we’ll notify you by email when it’s ready.</CardDescription>
                </CardHeader>
                <hr className="my-4" />
                <form onSubmit={handleSubmit}>
                    <CardContent className="p-0 space-y-6">
                        <div {...getRootProps()} className={`relative p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-input hover:border-primary/50'} ${isUploading ? 'border-primary bg-primary/5' : ''}`}>
                            <input {...getInputProps()} />
                            {isUploading ? (
                                <div className="space-y-3">
                                    <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                                    <p className="font-semibold">Uploading: {file?.name}</p>
                                    <div className="w-full bg-muted rounded-full h-2.5"><div className="bg-primary h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div></div>
                                    <p className="text-sm font-bold text-primary">{uploadProgress}%</p>
                                    <Button variant="destructive" size="sm" onClick={handleCancelUpload}>Cancel Upload</Button>
                                </div>
                            ) : file ? (
                                <div className="flex items-center justify-center gap-3 text-lg font-semibold text-primary">
                                    <Video className="h-8 w-8" />
                                    <span>{file.name}</span>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => { e.stopPropagation(); setFile(null); setEstimatedCost(null); }}><X className="h-5 w-5" /></Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <UploadCloud className="h-12 w-12 mx-auto text-muted-foreground" />
                                    <p className="font-semibold">{isDragActive ? "Drop the video here..." : "Drag & drop video, or click to select"}</p>
                                    <p className="text-xs text-muted-foreground">Max file size 500MB</p>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="title">Title</Label><Input id="title" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} required disabled={isUploading} /></div>
                            <div className="space-y-2"><Label htmlFor="speaker_count">Number of Speakers (Optional)</Label><Input id="speaker_count" type="number" min="1" placeholder="e.g., 2" value={formData.speaker_count} onChange={(e) => handleChange('speaker_count', e.target.value)} disabled={isUploading} /></div>
                            <div className="space-y-2"><Label>Source Language</Label><Select value={formData.source_locale} onValueChange={(v) => handleChange('source_locale', v)} disabled={!localeOptions || isUploading}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{localeOptions?.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                            <div className="space-y-2"><Label>Target Language</Label><Select value={formData.target_locale} onValueChange={(v) => handleChange('target_locale', v)} disabled={!localeOptions || isUploading}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{localeOptions?.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                        
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger><div className="flex items-center text-sm font-medium"><Settings2 className="mr-2 h-4 w-4" />Advanced Options</div></AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    <div className="flex items-center space-x-2"><Checkbox id="embed_subtitles" checked={formData.embed_subtitles} onCheckedChange={(c) => handleChange('embed_subtitles', !!c)} disabled={isUploading} /><label htmlFor="embed_subtitles" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Embed subtitles in translated video</label></div>
                                    <div className="flex items-center space-x-2"><Checkbox id="adjust_video_speed" checked={formData.adjust_video_speed} onCheckedChange={(c) => handleChange('adjust_video_speed', !!c)} disabled={isUploading} /><label htmlFor="adjust_video_speed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Adjust video speed for better audio sync</label></div>
                                    <div className="flex items-center space-x-2"><Checkbox id="use_ocr_correction" checked={formData.use_ocr_correction} onCheckedChange={(c) => handleChange('use_ocr_correction', !!c)} disabled={isUploading} /><label htmlFor="use_ocr_correction" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Improve accuracy using existing video subtitles (OCR)</label></div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>

                    <CardFooter className="p-0 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                            {isCalculatingCost ? (
                                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Calculating cost...</span>
                            ) : estimatedCost !== null ? (
                                <span>Estimated Cost: <strong className="text-primary">{estimatedCost} credits</strong></span>
                            ) : (
                                <span>Cost is based on video duration.</span>
                            )}
                        </div>
                        <Button type="submit" size="lg" disabled={isUploading || !file}><Film className="mr-2 h-4 w-4" /> Upload & Translate</Button>
                    </CardFooter>
                </form>
            </Card>

            <hr />
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Translation Library</h2>
                    <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["videoTranslations"] })} disabled={isFetching || isLoading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${(isFetching && !isLoading) ? "animate-spin" : ""}`} />Refresh
                    </Button>
                </div>
                {isLoading ? (
                    <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
                ) : translationsData?.results?.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <AnimatePresence>
                                {translationsData.results.map((t) => (
                                    <FancyTranslationCard key={t.id} translation={t} onDelete={handleDelete} onRetry={handleRetry} />
                                ))}
                            </AnimatePresence>
                        </div>
                        <PaginationControls currentPage={page} totalPages={translationsData.total_pages} onPageChange={setPage} hasNext={!!translationsData.next} hasPrev={!!translationsData.previous} />
                    </>
                ) : (
                    <div className="text-center py-16 border-2 border-dashed rounded-xl p-4 bg-slate-50/70">
                        <h3 className="text-xl font-semibold">Your library is empty</h3>
                        <p className="text-muted-foreground mt-2">Upload a video to start your first translation.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoTranslation;