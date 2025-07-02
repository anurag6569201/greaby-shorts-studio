// src/components/dashboard/TranscriptionGenerator.jsx

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { MicVocalIcon, UploadCloud, FileAudio, Loader2, CheckCircle2, AlertCircle, Trash2, Sparkles, MoreHorizontal, ChevronRight, Eye, FileText, Languages as LanguagesIcon, Download, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import api from "@/services/api";
import TranscriptionPlayer from "./components/TranscriptionPlayer";

const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const StagedFileCard = ({ file, onRemove, onConfigChange }) => (
    <motion.div layout initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="border rounded-lg p-4 flex flex-col md:flex-row items-center gap-4 bg-background">
        <div className="flex items-center gap-4 flex-1 w-full">
            <FileAudio className="h-8 w-8 text-primary flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
                <p className="font-medium truncate" title={file.file.name}>{file.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.file.size)}</p>
            </div>
        </div>
        <div className="flex items-center space-x-3 pt-4 md:pt-0 border-t md:border-none w-full md:w-auto justify-end">
            <Label htmlFor={`speaker-${file.id}`} className="text-sm flex-shrink-0">Speaker ID</Label>
            <Switch id={`speaker-${file.id}`} checked={file.config.enable_speaker_separation} onCheckedChange={(v) => onConfigChange(file.id, "enable_speaker_separation", v)} />
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 absolute top-2 right-2 md:relative md:top-auto md:right-auto flex-shrink-0" onClick={() => onRemove(file.id)}>
            <Trash2 className="h-4 w-4" />
        </Button>
    </motion.div>
);

const TranscriptionCard = ({ item, onViewDetails, onDelete }) => {
    const isProcessing = !['completed', 'failed'].includes(item.status);
    const liveStatus = item.live_status || `${item.status}...`;
    const progressMatch = liveStatus.match(/Step (\d+)\/(\d+)/);
    const progressPercentage = progressMatch ? (parseInt(progressMatch[1]) / parseInt(progressMatch[2])) * 100 : 0;

    return (
        <motion.div layout>
            <Card className="hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
                <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 overflow-hidden">
                            <CardTitle className="truncate text-base" title={item.title}>{item.title}</CardTitle>
                            <CardDescription className="text-xs">{new Date(item.created_at).toLocaleString()}</CardDescription>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" disabled={isProcessing}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onViewDetails(item)} disabled={item.status !== 'completed'}><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onDelete(item)} className="text-red-600 focus:text-red-600 focus:bg-red-50" disabled={isProcessing}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-2">
                    {isProcessing ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                <p className="text-sm font-medium text-muted-foreground capitalize">{liveStatus}</p>
                            </div>
                            {progressPercentage > 0 && <Progress value={progressPercentage} className="h-2" />}
                        </div>
                    ) : item.status === 'completed' ? (
                        <div className="flex items-center gap-3 text-green-600"><CheckCircle2 className="h-5 w-5" /><p className="text-sm font-medium">Completed</p></div>
                    ) : (
                        <div className="flex items-center gap-3 text-red-600"><AlertCircle className="h-5 w-5" /><p className="text-sm font-medium">Failed</p></div>
                    )}
                </CardContent>
                <CardFooter>
                     <Button variant="secondary" className="w-full" onClick={() => onViewDetails(item)} disabled={item.status !== 'completed'}>View Details <ChevronRight className="h-4 w-4 ml-2" /></Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
};

const TranscriptionGenerator = () => {
    const [stagedFiles, setStagedFiles] = useState([]);
    const [language, setLanguage] = useState("en-US");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedItemJson, setSelectedItemJson] = useState(null);
    const [deletingItem, setDeletingItem] = useState(null);
    const queryClient = useQueryClient();

    const { data: transcriptionData, isLoading, isFetching } = useQuery({
        queryKey: ["transcriptions", currentPage],
        queryFn: () => api.get(`/transcriptions/?page=${currentPage}`).then(res => res.data),
        keepPreviousData: true,
    });

    const createTranscriptionMutation = useMutation({
        mutationFn: (formData) => api.post('/transcriptions/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transcriptions"] });
            if(currentPage !== 1) setCurrentPage(1);
        },
        onError: (err) => toast.error("Submission Failed", { description: err.response?.data?.detail || "An unexpected error occurred." })
    });

    const { mutate: deleteTranscription, isLoading: isDeleting } = useMutation({
        mutationFn: (id) => api.delete(`/transcriptions/${id}/`),
        onSuccess: () => {
            toast.success("Transcription deleted successfully.");
            queryClient.invalidateQueries({ queryKey: ["transcriptions"] });
            setDeletingItem(null);
        },
        onError: (err) => toast.error("Deletion failed.", { description: err.response?.data?.detail || "Could not delete the item." })
    });

    const handleFileDrop = (e) => { e.preventDefault(); addFilesToStage(Array.from(e.dataTransfer.files)); };
    const handleFileSelect = (e) => { addFilesToStage(Array.from(e.target.files)); e.target.value = null; };

    const addFilesToStage = (files) => {
        const validFiles = files.filter(f => f.type.startsWith("audio/") || f.type.startsWith("video/"));
        if(validFiles.length !== files.length) {
            toast.warning("Some files were not supported.", { description: "Only audio and video files are allowed."});
        }
        const newStagedFiles = validFiles.map(file => ({
            id: `${file.name}-${file.size}-${Date.now()}`,
            file,
            config: { title: file.name.split('.').slice(0, -1).join('.') || file.name, enable_speaker_separation: false, duration_minutes: 1 }
        }));
        setStagedFiles(prev => [...prev, ...newStagedFiles]);
    };

    const handleConfigChange = (id, key, value) => setStagedFiles(prev => prev.map(f => f.id === id ? { ...f, config: { ...f.config, [key]: value } } : f));
    
    useEffect(() => {
        stagedFiles.forEach(staged => {
            if (staged.config.duration_minutes === 1 && staged.file) {
                const isVideo = staged.file.type.startsWith('video/');
                const mediaElement = document.createElement(isVideo ? 'video' : 'audio');
                mediaElement.src = URL.createObjectURL(staged.file);
                mediaElement.onloadedmetadata = () => {
                    const duration = Math.ceil(mediaElement.duration / 60) || 1;
                    handleConfigChange(staged.id, 'duration_minutes', duration);
                    URL.revokeObjectURL(mediaElement.src);
                };
                mediaElement.onerror = () => URL.revokeObjectURL(mediaElement.src);
            }
        });
    }, [stagedFiles]);

    const totalCost = useMemo(() => {
        const BASE_FEE = 1.0; const COST_PER_MINUTE = 0.25; const SPEAKER_SURCHARGE = 0.50;
        return stagedFiles.reduce((acc, item) => acc + BASE_FEE + (item.config.duration_minutes * COST_PER_MINUTE) + (item.config.enable_speaker_separation ? SPEAKER_SURCHARGE : 0), 0).toFixed(2);
    }, [stagedFiles]);

    const handleSubmit = () => {
        if (stagedFiles.length === 0) return toast.info("Please add at least one file to transcribe.");
        const submissionPromises = stagedFiles.map(sf => {
            const formData = new FormData();
            formData.append('source_file', sf.file);
            formData.append('title', sf.config.title);
            formData.append('source_language', language);
            formData.append('enable_speaker_separation', sf.config.enable_speaker_separation);
            formData.append('duration_minutes', sf.config.duration_minutes);
            return createTranscriptionMutation.mutateAsync(formData);
        });
        toast.promise(Promise.all(submissionPromises), { loading: "Submitting jobs...", success: "All jobs submitted successfully!", error: "Some jobs failed to submit." });
        setStagedFiles([]);
    };

    const handleViewDetails = async (item) => {
        setSelectedItem(item);
        setSelectedItemJson(null);
        try {
            const response = await api.get(`/transcriptions/${item.id}/download?format=json`);
            setSelectedItemJson(response.data);
        } catch (error) {
            toast.error("Failed to load data for the interactive player.");
            setSelectedItemJson({ error: "Could not load transcript data." });
        }
    };
    
    return (
        <div className="space-y-8">
            <Card className="shadow-none border-none bg-transparent">
                <CardHeader className="p-0"><CardTitle className="flex items-center text-2xl"><MicVocalIcon className="h-6 w-6 mr-3 text-primary" />AI Transcription</CardTitle><CardDescription>Upload audio or video files to generate accurate, time-stamped text.</CardDescription></CardHeader>
                <hr className="my-4" />
                <CardContent className="p-0 space-y-6">
                    <div onDrop={handleFileDrop} onDragOver={(e) => e.preventDefault()} className="relative border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors">
                        <UploadCloud className="h-12 w-12 text-muted-foreground" /><h3 className="mt-4 text-lg font-semibold">Drag & Drop Files Here</h3><p className="text-muted-foreground mt-1">or</p><Label htmlFor="file-upload" className="mt-2 inline-block"><div className="bg-primary text-primary-foreground px-4 py-2 rounded-md cursor-pointer hover:bg-primary/90">Browse Files</div></Label><Input id="file-upload" type="file" multiple className="sr-only" onChange={handleFileSelect} accept="audio/*,video/*" />
                    </div>
                    <AnimatePresence>{stagedFiles.length > 0 && <div className="space-y-4"><h3 className="font-semibold text-lg">Your Files</h3>{stagedFiles.map(file => <StagedFileCard key={file.id} file={file} onRemove={handleFileDrop} onConfigChange={handleConfigChange} />)}</div>}</AnimatePresence>
                </CardContent>
                {stagedFiles.length > 0 && (
                     <CardFooter className="p-0 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div><Label>Spoken Language</Label><Select value={language} onValueChange={setLanguage}><SelectTrigger className="w-[180px] mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="en-US">English (US)</SelectItem><SelectItem value="hi-IN">Hindi (India)</SelectItem><SelectItem value="es-ES">Spanish</SelectItem><SelectItem value="fr-FR">French</SelectItem><SelectItem value="de-DE">German</SelectItem></SelectContent></Select></div>
                         <div className="text-sm text-right"><span className="text-muted-foreground">Est. Total Cost: </span><span className="font-bold text-primary text-lg">{totalCost} Credits</span></div>
                         <Button onClick={handleSubmit} disabled={createTranscriptionMutation.isLoading} size="lg" className="w-full md:w-auto">{createTranscriptionMutation.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Transcribe {stagedFiles.length} File(s)</Button>
                     </CardFooter>
                )}
            </Card>

            <hr />
            <div className="space-y-4">
                <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Transcription Library</h2><Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['transcriptions', currentPage] })} disabled={isFetching}><RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} /> Refresh</Button></div>
                {(isLoading && !transcriptionData) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="animate-pulse bg-muted h-56"></Card>)}
                    </div>
                ) : transcriptionData?.results?.length > 0 ? (
                    <>
                        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" layout>
                             <AnimatePresence>
                                {transcriptionData.results.map(item => <TranscriptionCard key={item.id} item={item} onViewDetails={handleViewDetails} onDelete={setDeletingItem} />)}
                             </AnimatePresence>
                        </motion.div>
                        <PaginationControls currentPage={currentPage} totalPages={transcriptionData.total_pages} onPageChange={setCurrentPage} hasNext={!!transcriptionData.next} hasPrev={!!transcriptionData.previous} />
                    </>
                ) : (
                     <div className="col-span-full text-center py-16 border-2 border-dashed rounded-xl"><h3 className="text-xl font-semibold">Your library is empty</h3><p className="text-muted-foreground mt-2">Upload files above to begin transcribing.</p></div>
                )}
            </div>

            <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
                <DialogContent className="max-w-4xl w-full">
                    <DialogHeader>
                        <DialogTitle className="truncate">{selectedItem?.title}</DialogTitle>
                        <DialogDescription>Completed on {selectedItem && new Date(selectedItem.created_at).toLocaleString()}</DialogDescription>
                    </DialogHeader>
                    <TranscriptionPlayer key={selectedItem?.id} item={selectedItem} transcriptJson={selectedItemJson} />
                </DialogContent>
            </Dialog>
            
            <Dialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>This will permanently delete the transcription <strong className="mx-1">"{deletingItem?.title}"</strong> and its related files. This action cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingItem(null)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteTranscription(deletingItem.id)} disabled={isDeleting}>{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete Permanently</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TranscriptionGenerator;