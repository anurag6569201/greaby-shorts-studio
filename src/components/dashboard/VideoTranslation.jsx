import React, { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import axios from 'axios';
import { motion, AnimatePresence } from "framer-motion";
import { Film, Loader2, RefreshCw, UploadCloud, Video, X, AlertCircle, Download, Languages, Trash2, MoreHorizontal, PauseCircle, PlayCircle, RotateCw } from "lucide-react";

import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { useAuth } from "@/context/AuthContext";

// A card for displaying translations in the library
const TranslationCard = ({ translation, onDelete, onRetry }) => {
    const isProcessing = !['completed', 'failed'].includes(translation.status);
    let statusText = translation.live_status || translation.status.replace('_', ' ');

    return (
        <Card className="overflow-hidden flex flex-col h-full">
            <CardHeader className="flex-row items-start justify-between">
                <div className="space-y-1 flex-grow overflow-hidden pr-2">
                    <CardTitle className="text-base font-medium truncate" title={translation.title}>{translation.title}</CardTitle>
                    <CardDescription className="text-xs">{new Date(translation.created_at).toLocaleString()}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => onDelete(translation)} disabled={isProcessing}>
                    <Trash2 className="h-4 w-4 text-destructive"/>
                </Button>
            </CardHeader>
            <CardContent className="flex-grow flex items-center justify-center p-4">
                {translation.status === 'completed' && translation.result_video_url ? (
                    <div className="w-full space-y-2">
                        <video controls src={translation.result_video_url} className="w-full rounded-md bg-muted" preload="metadata" />
                        {translation.result_subtitle_url && (
                             <Button asChild variant="outline" size="sm" className="w-full">
                                <a href={translation.result_subtitle_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4 mr-2" /> Download Subtitles</a>
                            </Button>
                        )}
                    </div>
                ) : isProcessing ? (
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                        <p className="text-sm text-muted-foreground mt-2 capitalize">{statusText}...</p>
                    </div>
                ) : translation.status === 'upload_pending' ? (
                     <div className="text-center">
                        <UploadCloud className="h-8 w-8 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground mt-2 capitalize">Waiting for upload...</p>
                    </div>
                ) : (
                    <div className="text-center text-destructive">
                        <AlertCircle className="h-8 w-8 mx-auto" />
                        <p className="text-sm font-semibold mt-2">Failed</p>
                        <p className="text-xs mt-1 max-w-xs mx-auto">{translation.error_message}</p>
                                                <Button variant="outline" size="sm" className="mt-4" onClick={() => onRetry(translation)}>
                            <RotateCw className="h-4 w-4 mr-2" />
                            Retry Processing
                        </Button>
                    </div>
                )}
            </CardContent>
             <CardFooter className="text-xs text-muted-foreground justify-center">
                {translation.source_locale} → {translation.target_locale}
            </CardFooter>
        </Card>
    );
};

// Main Component
const VideoTranslation = () => {
    const [page, setPage] = useState(1);
    const [file, setFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        source_locale: "en-US",
        target_locale: "hi-IN",
        speaker_count: "",
        embed_subtitles: true,
    });
    
    // To handle upload cancellation
    const uploadCancelToken = useRef(null);
    const queryClient = useQueryClient();

    const { data: translationsData, isLoading, isFetching } = useQuery({
        queryKey: ["translations", page],
        queryFn: () => api.get(`/translations/?page=${page}`).then((res) => res.data),
        keepPreviousData: true,
    });

    const { data: localeOptions } = useQuery({
        queryKey: ["localeOptions"],
        queryFn: () => api.get("/translations/locale-options/").then((res) => res.data),
        staleTime: Infinity,
    });

    const { mutate: retryTranslation, isLoading: isRetrying } = useMutation({
        mutationFn: (translationId) => api.post(`/translations/${translationId}/retry/`),
        onSuccess: (response) => {
            toast.success("Retrying translation...", { description: "The job has been re-queued for processing." });
            // Optimistically update the UI with the new pending status
            const updatedTranslation = response.data;
            queryClient.setQueryData(["translations", page], (oldData) => {
                if (!oldData) return oldData;
                const newResults = oldData.results.map(t => t.id === updatedTranslation.id ? updatedTranslation : t);
                return { ...oldData, results: newResults };
            });
        },
        onError: (error) => {
            toast.error("Retry Failed", { description: error.response?.data?.detail || "Could not re-queue the job." });
        }
    });

    const onDrop = useCallback((acceptedFiles) => {
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
        }
    }, [formData.title]);

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
        setIsUploading(false);
        setUploadProgress(0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return toast.warning("Please select a video file.");
        if (!formData.title.trim()) return toast.warning("Please provide a title.");

        setIsUploading(true);
        setUploadProgress(0);
        uploadCancelToken.current = axios.CancelToken.source();

        let temporaryTranslationId = null;

        try {
            // Step 1: Get permission and SAS URL from our backend
            const initiateResponse = await api.post("/translations/initiate-upload/", {
                ...formData,
                filename: file.name,
            });

            const { translationId, uploadUrl, translationData } = initiateResponse.data;
            temporaryTranslationId = translationId;

            // Optimistically add the 'upload_pending' item to the UI
            queryClient.setQueryData(["translations", 1], (oldData) => {
                 const newResults = [translationData, ...(oldData?.results || [])];
                 return { ...oldData, count: (oldData?.count || 0) + 1, results: newResults };
            });
            if (page !== 1) setPage(1);
            
            // Step 2: Upload the file DIRECTLY to Azure Blob Storage
            await axios.put(uploadUrl, file, {
                headers: { 'x-ms-blob-type': 'BlockBlob' },
                cancelToken: uploadCancelToken.current.token,
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percent);
                },
            });

            // Step 3: Notify our backend that the upload is done
            await api.post(`/translations/${translationId}/finalize-upload/`);
            
            toast.success("Upload Complete!", { description: "Translation is now in the queue." });
            // Invalidate to get the final 'pending' status from the server
            queryClient.invalidateQueries({ queryKey: ["translations"] });
            
        } catch (error) {
            if (axios.isCancel(error)) {
                // If the upload was canceled, we need to delete the placeholder record
                if(temporaryTranslationId) {
                    await api.delete(`/translations/${temporaryTranslationId}/`);
                    queryClient.invalidateQueries({ queryKey: ["translations"] });
                }
            } else {
                console.error("Translation process failed:", error);
                toast.error("Process Failed", {
                    description: error.response?.data?.detail || "An unexpected error occurred.",
                });
                // Also clean up if initiation succeeded but something else failed
                if(temporaryTranslationId) {
                    await api.delete(`/translations/${temporaryTranslationId}/`);
                    queryClient.invalidateQueries({ queryKey: ["translations"] });
                }
            }
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            setFile(null);
            setFormData(prev => ({...prev, title: ""})); // Clear title for next upload
        }
    };
    
    const handleDelete = async (translation) => {
        toast("Are you sure?", {
            description: `This will permanently delete "${translation.title}".`,
            action: {
                label: "Delete",
                onClick: async () => {
                    try {
                        await api.delete(`/translations/${translation.id}/`);
                        toast.success("Translation deleted.");
                        queryClient.invalidateQueries({queryKey: ["translations"]});
                    } catch {
                        toast.error("Failed to delete translation.");
                    }
                }
            },
            cancel: { label: "Cancel" }
        })
    };
const handleRetry = (translation) => {
        retryTranslation(translation.id);
    };

    return (
        <div className="space-y-8">
            <Card className="shadow-none border-none">
                <CardHeader className="p-0">
                    <CardTitle className="flex items-center text-2xl"><Languages className="h-6 w-6 mr-3 text-primary" />Video Translation</CardTitle>
                    <CardDescription>Upload a video to translate its audio into another language with a synthetic voice.</CardDescription>
                </CardHeader>
                <hr className="my-4" />
                <form onSubmit={handleSubmit}>
                    <CardContent className="p-0 space-y-6">
                        <div {...getRootProps()} className={`relative p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-input hover:border-primary/50'} ${isUploading ? 'border-primary' : ''}`}>
                            <input {...getInputProps()} />
                            {isUploading ? (
                                <div className="space-y-3">
                                    <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                                    <p className="font-semibold">Uploading: {file?.name}</p>
                                    <div className="w-full bg-muted rounded-full h-2.5">
                                        <div className="bg-primary h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                                    </div>
                                    <p className="text-sm font-bold text-primary">{uploadProgress}%</p>
                                    <Button variant="destructive" size="sm" onClick={handleCancelUpload}>Cancel Upload</Button>
                                </div>
                            ) : file ? (
                                <div className="flex items-center justify-center gap-3 text-lg font-semibold text-primary">
                                    <Video className="h-8 w-8" />
                                    <span>{file.name}</span>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                                        <X className="h-5 w-5" />
                                    </Button>
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
                            {/* Form Inputs remain the same, just disabled during upload */}
                            <div className="space-y-2"><Label htmlFor="title">Title</Label><Input id="title" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} required disabled={isUploading} /></div>
                            <div className="space-y-2"><Label>Source Language</Label><Select value={formData.source_locale} onValueChange={(v) => handleChange('source_locale', v)} disabled={!localeOptions || isUploading}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{localeOptions?.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                            <div className="space-y-2"><Label>Target Language</Label><Select value={formData.target_locale} onValueChange={(v) => handleChange('target_locale', v)} disabled={!localeOptions || isUploading}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{localeOptions?.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                            <div className="space-y-2"><Label htmlFor="speaker_count">Number of Speakers (Optional)</Label><Input id="speaker_count" type="number" min="1" placeholder="e.g., 2" value={formData.speaker_count} onChange={(e) => handleChange('speaker_count', e.target.value)} disabled={isUploading} /></div>
                        </div>
                        <div className="flex items-center space-x-2 pt-2"><Checkbox id="embed_subtitles" checked={formData.embed_subtitles} onCheckedChange={(c) => handleChange('embed_subtitles', c)} disabled={isUploading} /><label htmlFor="embed_subtitles" className="text-sm font-medium">Embed subtitles in translated video</label></div>
                    </CardContent>
                    <CardFooter className="p-0 pt-6 flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">Cost is based on video duration.</p>
                        <Button type="submit" size="lg" disabled={isUploading || !file}>
                            <Film className="mr-2 h-4 w-4" /> Upload & Translate
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            <hr />
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Translation Library</h2>
                    <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["translations"] })} disabled={isFetching || isLoading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${(isFetching || isLoading) ? "animate-spin" : ""}`} />Refresh
                    </Button>
                </div>
                {isLoading ? (
                    <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
                ) : translationsData?.results?.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <AnimatePresence>
                                {translationsData.results.map((t) => (
                                    <motion.div key={t.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                                        <TranslationCard translation={t} onDelete={handleDelete} onRetry={handleRetry} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                        <PaginationControls currentPage={page} totalPages={translationsData.total_pages} onPageChange={setPage} hasNext={!!translationsData.next} hasPrev={!!translationsData.previous} />
                    </>
                ) : (
                    <div className="text-center py-16 border-2 border-dashed rounded-xl p-4">
                        <h3 className="text-xl font-semibold">Your library is empty</h3>
                        <p className="text-muted-foreground mt-2">Upload a video to start your first translation.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoTranslation;