import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadCloud, Image as ImageIcon, Sparkles, Loader2, Info, X, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/services/api"; // Assuming a configured axios instance at "@/services/api"

/**
 * A mock function to estimate image generation cost.
 * In a real application, this logic should live on the backend to prevent manipulation.
 * The backend should be the single source of truth for pricing.
 */
const calculateImageCost = (params) => {
    let cost = 1.0; // Base cost for a standard 1024x1024 image
    if (params.size === '1792x1024' || params.size === '1024x1792') cost += 0.5;
    if (params.quality === 'hd') cost *= 2;
    cost *= params.n;
    return cost.toFixed(2);
};

const ImageResultDisplay = ({ images, isLoading }) => {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] border-2 border-dashed rounded-xl bg-muted/40">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <p className="mt-4 text-lg font-medium">Generating your masterpiece...</p>
                <p className="text-sm text-muted-foreground">This can take up to 30 seconds.</p>
            </div>
        );
    }

    if (images.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] border-2 border-dashed rounded-xl bg-muted/20">
                <ImageIcon className="h-16 w-16 text-muted-foreground" />
                <p className="mt-4 text-lg font-medium">Your generated images will appear here</p>
                <p className="text-sm text-muted-foreground">Let's create something amazing!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
                {images.map((image, index) => (
                    <motion.div
                        key={index}
                        className="relative group overflow-hidden rounded-lg aspect-square"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                        <img src={image.url} alt={image.revised_prompt || 'Generated image'} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a href={image.url} download={`generated_image_${index}.png`} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="icon">
                                    <Download className="h-5 w-5" />
                                </Button>
                            </a>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};


const ImageGenerator = () => {
    const [prompt, setPrompt] = useState("");
    const [n, setN] = useState(1);
    const [size, setSize] = useState("1024x1024");
    const [quality, setQuality] = useState("standard");
    const [style, setStyle] = useState("vivid"); // 'vivid' or 'natural'

    // State for image editing
    const [sourceImageFile, setSourceImageFile] = useState(null);
    const [sourceImageUrl, setSourceImageUrl] = useState(null);
    const [editPrompt, setEditPrompt] = useState("");

    const [generatedImages, setGeneratedImages] = useState([]);
    const [activeTab, setActiveTab] = useState('generate');
    const queryClient = useQueryClient();

    const cost = useMemo(() => calculateImageCost({ n, size, quality }), [n, size, quality]);

    const { mutate: generateImage, isLoading: isGenerating } = useMutation({
        mutationFn: (payload) => {
            // For image generation, we send JSON
            return api.post("/images/generate/", payload);
        },
        onSuccess: (response) => {
            toast.success("Images generated successfully!");
            setGeneratedImages(response.data.data); // Assuming API returns data in { data: [...] } format
            queryClient.invalidateQueries({ queryKey: ["userProfile"] }); // To update credit balance
        },
        onError: (error) => {
            if (error.response?.status === 402) {
                toast.error("Insufficient Credits", { description: error.response?.data?.detail });
            } else {
                toast.error("Generation Failed", { description: error.response?.data?.detail || "An unexpected error occurred." });
            }
        },
    });

    const { mutate: editImage, isLoading: isEditing } = useMutation({
        mutationFn: (formData) => {
            // For image editing, we must send FormData because of the file upload
            return api.post("/images/edit/", formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onSuccess: (response) => {
            toast.success("Image edited successfully!");
            setGeneratedImages(response.data.data);
            queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        },
        onError: (error) => {
            if (error.response?.status === 402) {
                toast.error("Insufficient Credits", { description: error.response?.data?.detail });
            } else {
                toast.error("Edit Failed", { description: error.response?.data?.detail || "An unexpected error occurred." });
            }
        },
    });


    const handleGenerate = () => {
        if (!prompt.trim()) {
            toast.warning("Please enter a prompt to generate an image.");
            return;
        }
        setGeneratedImages([]); // Clear previous results
        const payload = { prompt, n, size, quality, style };
        generateImage(payload);
    };

    const handleEdit = () => {
        if (!sourceImageFile) {
            toast.error("Please upload an image to edit.");
            return;
        }
        if (!editPrompt.trim()) {
            toast.error("Please provide instructions for the edit.");
            return;
        }
        setGeneratedImages([]); // Clear previous results
        const formData = new FormData();
        formData.append("image", sourceImageFile);
        formData.append("prompt", editPrompt);
        formData.append("n", n);
        formData.append("size", size);
        editImage(formData);
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith("image/") && file.size < 4 * 1024 * 1024) { // 4MB limit
            setSourceImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setSourceImageUrl(reader.result);
            reader.readAsDataURL(file);
        } else {
            setSourceImageFile(null);
            setSourceImageUrl(null);
            if (!file?.type.startsWith("image/")) {
                toast.warning("Please select a valid image file (PNG, JPG).");
            } else if (file?.size >= 4 * 1024 * 1024) {
                toast.error("File size cannot exceed 4MB.");
            }
        }
    };

    const clearSourceImage = () => {
        setSourceImageFile(null);
        setSourceImageUrl(null);
    };

    const isLoading = isGenerating || isEditing;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Side: Controls */}
            <Card className="lg:col-span-1 sticky top-4">
                <CardHeader>
                    <CardTitle className="flex items-center text-xl"><Sparkles className="h-5 w-5 mr-3 text-primary" />Image Studio</CardTitle>
                    <CardDescription>Create or edit images using descriptive text prompts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex border-b">
                        <Button variant="ghost" onClick={() => setActiveTab('generate')} className={`flex-1 justify-center rounded-none border-b-2 ${activeTab === 'generate' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Generate</Button>
                        <Button variant="ghost" onClick={() => setActiveTab('edit')} className={`flex-1 justify-center rounded-none border-b-2 ${activeTab === 'edit' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Edit</Button>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                            {activeTab === 'generate' ? (
                                <div>
                                    <Label htmlFor="prompt-area" className="font-semibold">Prompt</Label>
                                    <Textarea id="prompt-area" placeholder="A futuristic cityscape at sunset, with flying cars..." value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-[120px] mt-2" disabled={isLoading} />
                                </div>
                            ) : (
                                <div>
                                    <Label htmlFor="edit-prompt-area" className="font-semibold">Edit Instruction</Label>
                                    <Textarea id="edit-prompt-area" placeholder="Change the color of the car to red..." value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} className="min-h-[120px] mt-2" disabled={isLoading} />
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    <div>
                        <Label>Number of Images</Label>
                        <div className="border border-input bg-background rounded-md px-3 py-2 flex items-center gap-4 mt-2">
                            <span className="text-primary w-8 text-center font-semibold tabular-nums">{n}</span>
                            <Slider value={[n]} onValueChange={(v) => setN(v[0])} min={1} max={4} step={1} disabled={isLoading} />
                        </div>
                    </div>

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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Quality</Label>
                            <Select value={quality} onValueChange={setQuality} disabled={isLoading}>
                                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="standard">Standard</SelectItem>
                                    <SelectItem value="hd">HD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Style</Label>
                            <Select value={style} onValueChange={setStyle} disabled={isLoading || activeTab === 'edit'}>
                                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="vivid">Vivid</SelectItem>
                                    <SelectItem value="natural">Natural</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                    <div className="text-sm flex items-center gap-2">
                        <span className="text-muted-foreground">Est. Cost:</span>
                        <span className="font-bold text-primary">{cost} Credits</span>
                        <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-4 w-4 text-muted-foreground cursor-pointer" /></TooltipTrigger><TooltipContent className="text-xs"><p>Cost is based on size, quality, and number of images.</p></TooltipContent></Tooltip></TooltipProvider>
                    </div>
                    <Button onClick={activeTab === 'generate' ? handleGenerate : handleEdit} disabled={isLoading || (activeTab === 'generate' && !prompt.trim()) || (activeTab === 'edit' && (!editPrompt.trim() || !sourceImageFile))} size="lg">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        {activeTab === 'generate' ? 'Generate' : 'Apply Edit'}
                    </Button>
                </CardFooter>
            </Card>

            {/* Right Side: Image Upload & View */}
            <div className="lg:col-span-2">
                {activeTab === 'edit' && (
                    <Card className="mb-8">
                        <CardHeader><CardTitle>Source Image</CardTitle><CardDescription>Upload the image you want to modify.</CardDescription></CardHeader>
                        <CardContent>
                            {!sourceImageUrl ? (
                                <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer bg-muted/40 hover:bg-muted/60 transition-colors">
                                    <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground" />
                                    <p className="mt-3 font-semibold">Click to upload or drag & drop</p>
                                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or WEBP (max 4MB)</p>
                                    <Input id="image-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" disabled={isLoading} />
                                </label>
                            ) : (
                                <div className="relative w-full max-w-sm mx-auto">
                                    <img src={sourceImageUrl} alt="Source for editing" className="w-full h-auto object-contain rounded-lg" />
                                    <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full" onClick={clearSourceImage} disabled={isLoading}><X className="h-4 w-4" /></Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <ImageResultDisplay images={generatedImages} isLoading={isLoading} />
            </div>
        </div>
    );
};

export default ImageGenerator;