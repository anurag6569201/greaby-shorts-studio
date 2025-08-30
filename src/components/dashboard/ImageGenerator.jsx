import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
    Button
} from "@/components/ui/button";
import {
    Card,
    CardFooter,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Textarea
} from "@/components/ui/textarea";
import {
    Label
} from "@/components/ui/label";
import {
    Input
} from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipProvider,
    TooltipContent,
    TooltipTrigger
} from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import {
    PaginationControls
} from "@/components/ui/PaginationControls";

import {
    UploadCloud,
    Image as ImageIcon,
    Sparkles,
    Loader2,
    Info,
    X,
    RefreshCw,
    MoreHorizontal,
    AlertCircle,
    Download,
    Trash2,
    Play,
    View
} from "lucide-react";

import {
    toast
} from "sonner";
import {
    useQuery,
    useMutation,
    useQueryClient
} from "@tanstack/react-query";
import {
    motion,
    AnimatePresence
} from "framer-motion";

import api from "@/services/api";
import PropTypes from 'prop-types';
import BeforeAfter from '../ui/BeforAfter';


const ImageCard = ({
    creation,
    onDelete
}) => {
    const isProcessing = !['completed', 'failed'].includes(creation.status);
    const renderEditComparison = () => (
        <div className="relative group overflow-hidden rounded-md w-full" style={{ height: '180px', aspectRatio: 'inherit' }}>
            <BeforeAfter
                beforeImage={creation.source_image_url}
                afterImage={creation.result_url}
            />
        </div>
    );
    const handleDownload = async () => {
        try {
            const response = await fetch(creation.result_url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `generated_image_${creation.id}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error("Download failed.");
            console.error("Error downloading image:", error);
        }
    };

    const renderStatus = () => {
        const liveStatus = creation.live_status || creation.status;

        if (!['completed', 'failed'].includes(creation.status)) {
            return (
                <div className="text-center p-4 flex flex-col items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2 capitalize">{liveStatus || creation.status}...</p>
                </div>
            );
        }

        switch (creation.status) {
            case 'completed':
                if (!creation.result_url) {
                    return (
                        <div className="text-center p-4 flex flex-col items-center justify-center h-full">
                            <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
                            <p className="text-sm text-muted-foreground mt-2">Image file not found.</p>
                        </div>
                    );
                }

                if (creation.operation === 'edit' && creation.source_image_url) {
                    return renderEditComparison();
                }

                return (
                    <div className="relative group overflow-hidden rounded-md w-full" style={{ height: '180px', aspectRatio: 'inherit' }}>
                        <img src={creation.result_url} alt={creation.prompt || 'Generated image'} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 gap-2">
                            <a href={creation.result_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                                <Button style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'white',height:'26px',width:'26px',border:'none',borderRadius:'4px' }} variant="outline" size="icon" className="w-full h-8"><View className="h-4 w-4" /></Button>
                            </a>
                            <a>
                            <Button
                                onClick={handleDownload}
                                style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'white',height:'26px',width:'26px',border:'none',borderRadius:'4px' }}
                                variant="outline"
                                size="icon"
                                className="flex-1 h-8"
                            ><Download className="h-4 w-4" /></Button>
                            </a>
                        </div>
                    </div>
                );
            case 'failed':
                return (
                    <div className="text-center p-4 flex flex-col items-center justify-center h-full">
                        <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                        <p className="text-sm text-destructive mt-2 font-semibold">Generation Failed</p>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3 cursor-pointer">{creation.error_message}</p>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    <p>{creation.error_message}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                );
            default:
                return (
                    <div className="text-center p-4 flex flex-col items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                        <p className="text-sm text-muted-foreground mt-2 capitalize">{creation.status}...</p>
                    </div>
                );
        }
    };

    return (
        <Card className="overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow h-full">
            <CardHeader className="flex-row items-start justify-between p-2">
                <div className="space-y-1 flex-grow overflow-hidden pr-2">
                    <CardTitle
                        className="text-sm font-medium text-gray-800 overflow-hidden whitespace-nowrap text-ellipsis max-w-[200px]"
                        title={creation.prompt || (creation.operation === 'edit' ? 'Image Edit' : 'Image Generation')}
                    >
                        <ImageIcon className="h-4 w-4 mr-2 inline-block text-muted-foreground" />
                        {creation.prompt
                            ? (creation.prompt.length > 30 ? creation.prompt.slice(0, 30) + "..." : creation.prompt)
                            : (creation.operation === 'edit' ? 'Image Edit' : 'Image Generation')}
                    </CardTitle>
                    <CardDescription className="text-xs">{new Date(creation.created_at).toLocaleString()}</CardDescription>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="flex-shrink-0" disabled={isProcessing}>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onDelete(creation)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="flex-grow flex items-center justify-center p-0 pt-0">
                <div className="w-full">
                    {renderStatus()}
                </div>
            </CardContent>
        </Card>
    );
};
ImageCard.propTypes = {
    creation: PropTypes.shape({
        id: PropTypes.any.isRequired,
        status: PropTypes.string.isRequired,
        live_status: PropTypes.string,
        result_url: PropTypes.string,
        source_image_url: PropTypes.string,
        prompt: PropTypes.string,
        error_message: PropTypes.string,
        created_at: PropTypes.string.isRequired,
        operation: PropTypes.string.isRequired,
    }).isRequired,
    onDelete: PropTypes.func.isRequired,
};

const ImageList = ({ data, isLoading, onDelete, currentPage, onPageChange }) => {
    if (isLoading && !data) {
        return <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
    }

    if (!data?.results?.length) {
        return (
            <div className="text-center py-16 border-2 border-dashed rounded-xl p-4">
                <h3 className="text-xl font-semibold">Your library is empty</h3>
                <p className="text-muted-foreground mt-2">Creations for this category will appear here.</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                    {data.results.map((creation) => (
                        <motion.div
                            key={creation.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.4, type: "spring" }}
                        >
                            <ImageCard creation={creation} onDelete={onDelete} />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            <PaginationControls
                currentPage={currentPage}
                totalPages={data.total_pages}
                onPageChange={onPageChange}
                hasNext={!!data.next}
                hasPrev={!!data.previous}
            />
        </>
    );
};
ImageList.propTypes = {
    data: PropTypes.object,
    isLoading: PropTypes.bool.isRequired,
    onDelete: PropTypes.func.isRequired,
    currentPage: PropTypes.number.isRequired,
    onPageChange: PropTypes.func.isRequired,
};

const ImageLibrary = ({ onDelete }) => {
    const [view, setView] = useState('active');
    const [activePage, setActivePage] = useState(1);
    const [failedPage, setFailedPage] = useState(1);
    const queryClient = useQueryClient();

    useEffect(() => {
        const intervalId = setInterval(() => {
            queryClient.invalidateQueries({ queryKey: ["imageCreations"] });
        }, 15000); 

        return () => clearInterval(intervalId);
    }, [queryClient]);

    const { data: activeImagesData, isLoading: isLoadingActive, isFetching: isFetchingActive } = useQuery({
        queryKey: ["imageCreations", activePage],
        queryFn: () => api.get(`/images/?page=${activePage}`).then((res) => res.data),
        keepPreviousData: true,
    });

    const { data: failedImagesData, isLoading: isLoadingFailed, isFetching: isFetchingFailed } = useQuery({
        queryKey: ["failedImageCreations", failedPage],
        queryFn: () => api.get(`/images/failed/?page=${failedPage}`).then((res) => res.data),
        keepPreviousData: true,
        enabled: view === 'failed',
    });

    const isFetching = view === 'active' ? isFetchingActive : isFetchingFailed;

    const handleRefresh = () => {
        const queryKey = view === 'active' ? ["imageCreations", activePage] : ["failedImageCreations", failedPage];
        queryClient.invalidateQueries({ queryKey });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Image Library</h2>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />Refresh
                </Button>
            </div>
            <div className="flex border-b">
                <Button variant="ghost" onClick={() => setView('active')} className={`rounded-none border-b-2 ${view === 'active' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Active</Button>
                <Button variant="ghost" onClick={() => setView('failed')} className={`rounded-none border-b-2 ${view === 'failed' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Failed & Refunded</Button>
            </div>
            {view === 'active' && (
                <ImageList data={activeImagesData} isLoading={isLoadingActive} onDelete={onDelete} currentPage={activePage} onPageChange={setActivePage} />
            )}
            {view === 'failed' && (
                <ImageList data={failedImagesData} isLoading={isLoadingFailed} onDelete={onDelete} currentPage={failedPage} onPageChange={setFailedPage} />
            )}
        </div>
    );
};

ImageLibrary.propTypes = {
    onDelete: PropTypes.func.isRequired,
};

const ImageGenerator = () => {
    const [prompt, setPrompt] = useState("");
    const [size, setSize] = useState("1024x1024");
    const [provider, setProvider] = useState("kontext_pro");
    const [quality, setQuality] = useState("standard");
    const [style, setStyle] = useState("vivid");
    
    const [sourceImages, setSourceImages] = useState([]); 
    const [editPrompt, setEditPrompt] = useState("");
    const [activeTab, setActiveTab] = useState('generate');
    const [deletingImage, setDeletingImage] = useState(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (activeTab === 'edit' && provider === 'kontext_pro' && sourceImages.length > 1) {
            toast.info("Kontext Pro only supports 1 image. Extra images have been removed.");
            const [firstImage, ...restImages] = sourceImages;
            restImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
            setSourceImages([firstImage]);
        }
    }, [provider, activeTab]);

    const cost = useMemo(() => {
        let calculatedCost = 1.0;
        
        if (provider === 'kontext_pro') {
            if (size !== '1024x1024') calculatedCost += 0.5;
            if (quality === 'hd') calculatedCost *= 2;
        }
        
        const numImages = activeTab === 'edit' ? Math.max(1, sourceImages.length) : 1;
        calculatedCost *= numImages;
        
        return calculatedCost.toFixed(2);
    }, [size, quality, provider, activeTab, sourceImages.length]);

    const { mutate: generateImage, isLoading: isGenerating } = useMutation({
        mutationFn: (payload) => api.post("/images/generate/", payload),
        onSuccess: (response) => {
            toast.success("Generation request accepted!", { description: "Your image will appear in the library shortly." });
            queryClient.invalidateQueries({ queryKey: ["imageCreations"] });
            setPrompt("");
            queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        },
        onError: (error) => toast.error("Generation Failed", { description: error.response?.data?.detail || "An unexpected error occurred." }),
    });

    const { mutate: editImage, isLoading: isEditing } = useMutation({
        mutationFn: (formData) => api.post("/images/edit/", formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
        onSuccess: (response) => {
            toast.success("Edit request accepted!", { description: "Your edited image(s) will appear shortly." });
            queryClient.invalidateQueries({ queryKey: ["imageCreations"] });
            setEditPrompt("");
            sourceImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
            setSourceImages([]);
            queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        },
        onError: (error) => toast.error("Edit Failed", { description: error.response?.data?.detail || "An unexpected error occurred." }),
    });

    const { mutate: deleteImage, isLoading: isDeleting } = useMutation({
        mutationFn: (imageId) => api.delete(`/images/${imageId}/`),
        onSuccess: (_, imageId) => {
            toast.success("Image deleted successfully!");
            queryClient.invalidateQueries({ queryKey: ["imageCreations"] });
            queryClient.invalidateQueries({ queryKey: ["failedImageCreations"] });
            setDeletingImage(null);
        },
        onError: (error) => toast.error("Deletion Failed", { description: error.response?.data?.detail || "An error occurred." }),
    });

    const handleGenerate = useCallback(() => {
        if (!prompt.trim()) {
            toast.warning("Please enter a prompt.");
            return;
        }
        generateImage({ prompt, n: 1, size, quality, style, provider });
    }, [prompt, size, quality, style, provider, generateImage]);

    const handleEdit = useCallback(() => {
        if (sourceImages.length === 0) {
            toast.error("Please upload at least one image to edit.");
            return;
        }
        if (!editPrompt.trim()) {
            toast.error("Please provide edit instructions.");
            return;
        }
        const fd = new FormData();
        sourceImages.forEach(imageObj => {
            fd.append("image", imageObj.file);
        });

        fd.append("prompt", editPrompt);
        fd.append("n", sourceImages.length);
        fd.append("size", size);
        fd.append("provider", provider);
        editImage(fd);
    }, [sourceImages, editPrompt, size, provider, editImage]);

    const handleFileChange = useCallback((e) => {
        const newFiles = Array.from(e.target.files);
        if (newFiles.length === 0) return;

        const limit = provider === 'kontext_pro' ? 1 : 4;
        const currentCount = sourceImages.length;

        if (currentCount + newFiles.length > limit) {
            toast.error(`You can only upload up to ${limit} image(s) for the ${provider === 'kontext_pro' ? 'Kontext Pro' : 'Nano Banana'} provider.`);
            e.target.value = '';
            return;
        }

        const processedFiles = newFiles
            .filter(file => {
                if (file.size > 4 * 1024 * 1024) {
                    toast.error(`File "${file.name}" is too large (max 4MB).`);
                    return false;
                }
                return true;
            })
            .map(file => ({
                file,
                previewUrl: URL.createObjectURL(file)
            }));

        setSourceImages(prev => [...prev, ...processedFiles]);
        e.target.value = '';
    }, [provider, sourceImages]);

    const removeSourceImage = useCallback((indexToRemove) => {
        const imageToRemove = sourceImages[indexToRemove];
        if (imageToRemove) {
            URL.revokeObjectURL(imageToRemove.previewUrl);
        }
        setSourceImages(prev => prev.filter((_, index) => index !== indexToRemove));
    }, [sourceImages]);

    const handleDeleteConfirm = useCallback(() => {
        if (deletingImage) {
            deleteImage(deletingImage.id);
        }
    }, [deletingImage, deleteImage]);

    const isLoading = isGenerating || isEditing;
    const uploadLimit = provider === 'kontext_pro' ? 1 : 4;

    return (
        <div className="space-y-8">
            <Card style={{ backgroundColor: 'transparent', boxShadow: 'none', border: 'none' }}>
                <CardHeader className="px-0 pt-0">
                    <CardTitle className="flex items-center text-xl"><Sparkles className="h-5 w-5 mr-3 text-primary" /> Image Studio</CardTitle>
                    <CardDescription>Create or edit images using descriptive text prompts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4 px-0">
                    <div className="flex border-b">
                        <Button variant="ghost" onClick={() => setActiveTab('generate')} className={`flex-1 justify-center rounded-none border-b-2 ${activeTab === 'generate' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Generate</Button>
                        <Button variant="ghost" onClick={() => setActiveTab('edit')} className={`flex-1 justify-center rounded-none border-b-2 ${activeTab === 'edit' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Edit</Button>
                    </div>

                    {activeTab === 'edit' && (
                        <div className="pt-4 space-y-2">
                            <Label>Source Images (Up to {uploadLimit} for {provider === 'kontext_pro' ? 'Kontext Pro' : 'Nano Banana'})</Label>
                            
                            {sourceImages.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {sourceImages.map((image, index) => (
                                        <div key={index} className="relative aspect-square">
                                            <img src={image.previewUrl} alt={`Source preview ${index + 1}`} className="w-full h-full object-cover rounded-lg border" />
                                            <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => removeSourceImage(index)} disabled={isLoading}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {sourceImages.length < uploadLimit && (
                                <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-muted/40 hover:bg-muted/60 transition-colors">
                                    <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
                                    <p className="mt-2 font-semibold text-sm">Click to upload or drag & drop</p>
                                    <p className="text-xs text-muted-foreground">PNG, JPG (max 4MB)</p>
                                    <Input 
                                        id="image-upload" 
                                        type="file" 
                                        className="hidden" 
                                        onChange={handleFileChange} 
                                        accept="image/png, image/jpeg" 
                                        disabled={isLoading}
                                        multiple
                                    />
                                </label>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* LEFT SIDE */}
                        <div>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Label htmlFor="prompt-area" className="font-semibold">
                                        {activeTab === 'generate' ? 'Prompt' : 'Edit Instruction'}
                                    </Label>
                                    <Textarea
                                        id="prompt-area"
                                        placeholder={
                                            activeTab === 'generate'
                                                ? 'A futuristic cityscape at sunset...'
                                                : 'Change the background to a sunny beach...'
                                        }
                                        value={activeTab === 'generate' ? prompt : editPrompt}
                                        onChange={(e) =>
                                            activeTab === 'generate'
                                                ? setPrompt(e.target.value)
                                                : setEditPrompt(e.target.value)
                                        }
                                        className="min-h-[150px] mt-2"
                                        disabled={isLoading}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* RIGHT SIDE */}
                        <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                           <div>
                                <Label>Provider</Label>
                                <Select value={provider} onValueChange={setProvider} disabled={isLoading}>
                                    <SelectTrigger className="mt-2">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem style={{opacity:'0.6',pointerEvents:'none',cursor:'not-allowed'}} value="nano_banana">Nano Banana</SelectItem>
                                        <SelectItem value="kontext_pro">Flux.1-Kontext-pro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            {/* --- CONDITIONAL CONTROLS FOR KONTEX PRO ONLY --- */}
                            {provider === 'kontext_pro' && (
                                <>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Label>Aspect Ratio</Label>
                                            <Select value={size} onValueChange={setSize} disabled={isLoading}>
                                                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1024x1024">Square (1:1)</SelectItem>
                                                    <SelectItem value="1792x1024">Landscape (16:9)</SelectItem>
                                                    <SelectItem value="1024x1792">Portrait (9:16)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div style={{opacity:'.6', pointerEvents:'none',cursor:'not-allowed'}}>
                                            <Label>Quality</Label>
                                            <Select value={quality} onValueChange={setQuality} disabled={isLoading}>
                                                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="standard">Standard</SelectItem>
                                                    <SelectItem value="hd">HD</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div style={{opacity:'.6', pointerEvents:'none',cursor:'not-allowed'}}>
                                        <Label>Style</Label>
                                        <Select value={style} onValueChange={setStyle} disabled={isLoading}>
                                            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="vivid">Vivid</SelectItem>
                                                <SelectItem value="natural">Natural</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    </div>
                                     
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between px-0 pt-4">
                    <div className="text-sm flex items-center gap-2">
                        <span className="text-muted-foreground">Est. Cost:</span>
                        <span className="font-bold text-primary">{cost} Credits</span>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground cursor-pointer" /></TooltipTrigger>
                                <TooltipContent className="text-xs max-w-xs"><p>Cost varies by provider, size, and quality.</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <Button onClick={activeTab === 'generate' ? handleGenerate : handleEdit} disabled={isLoading} size="lg">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        {activeTab === 'generate' ? 'Generate' : 'Apply Edit'}
                    </Button>
                </CardFooter>
            </Card>

            <hr />

            <ImageLibrary onDelete={(img) => setDeletingImage(img)} />

            <Dialog open={!!deletingImage} onOpenChange={() => setDeletingImage(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete the image creation with the prompt:
                            <strong className="mx-1 line-clamp-3">"{deletingImage?.prompt}"</strong>
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setDeletingImage(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ImageGenerator;