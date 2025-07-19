import React, { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Languages, Loader2, RefreshCw, Trash2, Download, UploadCloud, X, AlertCircle, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { PDFDocument } from 'pdf-lib';
// --- CORRECTED IMPORT ---
import { renderAsync } from 'docx-preview';
import JSZip from 'jszip';

// --- FOCUSED FILE DEFINITIONS ---
const ACCEPT_STRING = ".pdf,.pptx,.txt";
const SUPPORTED_MIME_TYPES = [
    'application/pdf',
    // 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'text/plain' // .txt
];

// --- PRICING LOGIC ---
const calculatePageCost = (pageCount) => {
    const baseCost = 2.0;
    if (pageCount <= 2) return baseCost.toFixed(2);
    let additionalCost = 0;
    if (pageCount >= 3) additionalCost += (Math.min(pageCount, 5) - 2) * 0.3;
    if (pageCount >= 6) additionalCost += (Math.min(pageCount, 10) - 5) * 0.5;
    if (pageCount >= 11) additionalCost += (Math.min(pageCount, 15) - 10) * 0.7;
    if (pageCount >= 16) additionalCost += (Math.min(pageCount, 20) - 15) * 1.0;
    return (baseCost + additionalCost).toFixed(2);
};

const calculateCharCost = (charCount) => {
    const baseCost = 2.0;
    if (charCount <= 2000) return baseCost.toFixed(2);
    const additionalBlocks = Math.ceil((charCount - 2000) / 2000);
    const totalCost = baseCost + (additionalBlocks * 0.5);
    return totalCost.toFixed(2);
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const languageOptions = [
    { value: 'af', label: 'Afrikaans' }, { value: 'sq', label: 'Albanian' },
    { value: 'am', label: 'Amharic' }, { value: 'ar', label: 'Arabic' },
    { value: 'hy', label: 'Armenian' }, { value: 'as', label: 'Assamese' },
    { value: 'az', label: 'Azerbaijani' }, { value: 'bn', label: 'Bangla' },
    { value: 'ba', label: 'Bashkir' }, { value: 'eu', label: 'Basque' },
    { value: 'be', label: 'Belarusian' }, { value: 'bho', label: 'Bhojpuri' },
    { value: 'bs', label: 'Bosnian' }, { value: 'bg', label: 'Bulgarian' },
    { value: 'yue', label: 'Cantonese (Traditional)' }, { value: 'ca', label: 'Catalan' },
    { value: 'hne', label: 'Chhattisgarhi' }, { value: 'lzh', label: 'Chinese (Literary)' },
    { value: 'zh-Hans', label: 'Chinese Simplified' }, { value: 'zh-Hant', label: 'Chinese Traditional' },
    { value: 'hr', label: 'Croatian' }, { value: 'cs', label: 'Czech' },
    { value: 'da', label: 'Danish' }, { value: 'prs', label: 'Dari' },
    { value: 'dv', label: 'Divehi' }, { value: 'doi', label: 'Dogri' },
    { value: 'nl', label: 'Dutch' }, { value: 'en', label: 'English' },
    { value: 'et', label: 'Estonian' }, { value: 'fo', label: 'Faroese' },
    { value: 'fj', label: 'Fijian' }, { value: 'fil', label: 'Filipino' },
    { value: 'fi', label: 'Finnish' }, { value: 'fr', label: 'French' },
    { value: 'fr-CA', label: 'French (Canada)' }, { value: 'gl', label: 'Galician' },
    { value: 'lg', label: 'Ganda' }, { value: 'ka', label: 'Georgian' },
    { value: 'de', label: 'German' }, { value: 'el', label: 'Greek' },
    { value: 'gu', label: 'Gujarati' }, { value: 'ht', label: 'Haitian Creole' },
    { value: 'ha', label: 'Hausa' }, { value: 'he', label: 'Hebrew' },
    { value: 'hi', label: 'Hindi' }, { value: 'mww', label: 'Hmong Daw' },
    { value: 'hu', label: 'Hungarian' }, { value: 'is', label: 'Icelandic' },
    { value: 'ig', label: 'Igbo' }, { value: 'id', label: 'Indonesian' },
    { value: 'iu', label: 'Inuinnaqtun' }, { value: 'ikt', label: 'Inuktitut' },
    { value: 'iu-Latn', label: 'Inuktitut (Latin)' }, { value: 'ga', label: 'Irish' },
    { value: 'it', label: 'Italian' }, { value: 'ja', label: 'Japanese' },
    { value: 'kn', label: 'Kannada' }, { value: 'ks', label: 'Kashmiri' },
    { value: 'kk', label: 'Kazakh' }, { value: 'km', label: 'Khmer' },
    { value: 'rw', label: 'Kinyarwanda' }, { value: 'tlh-Latn', label: 'Klingon (Latin)' },
    { value: 'tlh-Piqd', label: 'Klingon (pIqaD)' }, { value: 'gom', label: 'Konkani' },
    { value: 'ko', label: 'Korean' }, { value: 'ku', label: 'Kurdish (Central)' },
    { value: 'kmr', label: 'Kurdish (Northern)' }, { value: 'ky', label: 'Kyrgyz' },
    { value: 'lo', label: 'Lao' }, { value: 'lv', label: 'Latvian' },
    { value: 'ln', label: 'Lingala' }, { value: 'lt', label: 'Lithuanian' },
    { value: 'dsb', label: 'Lower Sorbian' }, { value: 'lb', label: 'Luxembourgish' },
    { value: 'mk', label: 'Macedonian' }, { value: 'mai', label: 'Maithili' },
    { value: 'mg', label: 'Malagasy' }, { value: 'ms', label: 'Malay' },
    { value: 'ml', label: 'Malayalam' }, { value: 'mt', label: 'Maltese' },
    { value: 'mi', label: 'Māori' }, { value: 'mr', label: 'Marathi' },
    { value: 'mn-Cyrl', label: 'Mongolian (Cyrillic)' }, { value: 'mn-Mong', label: 'Mongolian (Traditional)' },
    { value: 'my', label: 'Myanmar (Burmese)' }, { value: 'ne', label: 'Nepali' },
    { value: 'nb', label: 'Norwegian' }, { value: 'nya', label: 'Nyanja' },
    { value: 'or', label: 'Odia' }, { value: 'ps', label: 'Pashto' },
    { value: 'fa', label: 'Persian' }, { value: 'pl', label: 'Polish' },
    { value: 'pt', label: 'Portuguese (Brazil)' }, { value: 'pt-PT', label: 'Portuguese (Portugal)' },
    { value: 'pa', label: 'Punjabi' }, { value: 'otq', label: 'Querétaro Otomi' },
    { value: 'ro', label: 'Romanian' }, { value: 'run', label: 'Rundi' },
    { value: 'ru', label: 'Russian' }, { value: 'sm', label: 'Samoan' },
    { value: 'sr-Cyrl', label: 'Serbian (Cyrillic)' }, { value: 'sr-Latn', label: 'Serbian (Latin)' },
    { value: 'st', label: 'Sesotho' }, { value: 'nso', label: 'Sesotho sa Leboa' },
    { value: 'tn', label: 'Setswana' }, { value: 'sna', label: 'Shona' },
    { value: 'sd', label: 'Sindhi' }, { value: 'si', label: 'Sinhala' },
    { value: 'sk', label: 'Slovak' }, { value: 'sl', label: 'Slovenian' },
    { value: 'so', label: 'Somali' }, { value: 'es', label: 'Spanish' },
    { value: 'sw', label: 'Swahili' }, { value: 'sv', label: 'Swedish' },
    { value: 'ty', label: 'Tahitian' }, { value: 'ta', label: 'Tamil' },
    { value: 'tt', label: 'Tatar' }, { value: 'te', label: 'Telugu' },
    { value: 'th', label: 'Thai' }, { value: 'bo', label: 'Tibetan' },
    { value: 'ti', label: 'Tigrinya' }, { value: 'to', label: 'Tongan' },
    { value: 'tr', label: 'Turkish' }, { value: 'tk', label: 'Turkmen' },
    { value: 'uk', label: 'Ukrainian' }, { value: 'hsb', label: 'Upper Sorbian' },
    { value: 'ur', label: 'Urdu' }, { value: 'ug', label: 'Uyghur' },
    { value: 'uz', label: 'Uzbek (Latin)' }, { value: 'vi', label: 'Vietnamese' },
    { value: 'cy', label: 'Welsh' }, { value: 'xh', label: 'Xhosa' },
    { value: 'yo', label: 'Yoruba' }, { value: 'yua', label: 'Yucatec Maya' },
    { value: 'zu', label: 'Zulu' }
];

const sourceLanguageOptions = [{ value: 'auto', label: 'Auto-detect' }, ...languageOptions];

const DocumentCard = ({ item, onDelete }) => {
    const isProcessing = item.status === 'processing' || item.status === 'pending';
    const progressMatch = item.status_message?.match(/(\d+)\/(\d+)/);
    const progressValue = progressMatch ? (parseInt(progressMatch[1], 10) / parseInt(progressMatch[2], 10)) * 100 : 0;

    return (
        <motion.div layout variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="border rounded-lg p-4 flex flex-col justify-between space-y-3 bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <FileText className="h-8 w-8 text-primary" />
                <p className="text-xs font-semibold">{item.source_language} ➔ {item.target_language}</p>
            </div>

            <div className="flex-grow space-y-2">
                {isProcessing ? (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="truncate" title={item.status_message}>{item.status_message || `${item.status}...`}</span>
                        </div>
                        {progressValue > 0 && <Progress value={progressValue} className="h-1.5" />}
                    </div>
                ) : item.status === 'completed' ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                        <CheckCircle className="h-4 w-4" />
                        <span>Completed</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                        <AlertCircle className="h-4 w-4" />
                        <span className="truncate" title={item.error_message}>Failed</span>
                    </div>
                )}
                <p className="text-xs text-muted-foreground">Created: {new Date(item.created_at).toLocaleString()}</p>
                {item.status === 'failed' && <p className="text-xs text-red-500 mt-1 truncate" title={item.error_message}>{item.error_message}</p>}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t -mx-4 px-4 mt-2">
                <Button variant="ghost" size="icon" onClick={() => onDelete(item)} disabled={isProcessing}><Trash2 className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" asChild disabled={!item.input_document_url}>
                    <a href={item.input_document_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4 mr-2"/>Source</a>
                </Button>
                <Button size="sm" asChild disabled={item.status !== 'completed' || !item.translated_document_url}>
                    <a href={item.translated_document_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4 mr-2"/>Result</a>
                </Button>
            </div>
        </motion.div>
    );
};

const DocumentTranslator = () => {
    const [file, setFile] = useState(null);
    const [metric, setMetric] = useState({ type: null, value: 0 });
    const [sourceLang, setSourceLang] = useState("auto");
    const [targetLang, setTargetLang] = useState("en");
    const [deletingItem, setDeletingItem] = useState(null);
    const [view, setView] = useState('active');
    const [activePage, setActivePage] = useState(1);
    const [failedPage, setFailedPage] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const queryClient = useQueryClient();
    const { fetchUserProfile } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const { data: activeData, isLoading: isLoadingActive, isFetching: isFetchingActive } = useQuery({
        queryKey: ['documentTranslations', activePage],
        queryFn: () => api.get(`/doc-translations/?page=${activePage}`).then(res => res.data),
        keepPreviousData: true,
        refetchInterval: (data) => {
            const isProcessing = data?.results?.some(item => item.status === 'processing' || item.status === 'pending');
            return isProcessing ? 10000 : false;
        }
    });

    const { data: failedData, isLoading: isLoadingFailed, isFetching: isFetchingFailed } = useQuery({
        queryKey: ['failedDocumentTranslations', failedPage],
        queryFn: () => api.get(`/doc-translations/failed/?page=${failedPage}`).then(res => res.data),
        keepPreviousData: true,
        enabled: view === 'failed',
    });

    const isJobRunning = useMemo(() => {
        return activeData?.results?.some(item => item.status === 'processing' || item.status === 'pending');
    }, [activeData]);

    const estimatedCost = useMemo(() => {
        if (!file) return "0.00";
        if (metric.type === 'pages') return calculatePageCost(metric.value);
        if (metric.type === 'chars') return calculateCharCost(metric.value);
        return "0.00";
    }, [file, metric]);

    const { mutate: translateDocument, isLoading: isMutating } = useMutation({
        mutationFn: (formData) => api.post('/doc-translations/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
        onSuccess: () => {
            toast.success("Translation started!", { description: "Your document is being processed and will appear below." });
            queryClient.invalidateQueries({ queryKey: ['documentTranslations'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            fetchUserProfile();
            resetFileState();
        },
        onError: (error) => {
            if (error.response?.status === 402) {
                toast.error("Insufficient Credits", { description: error.response?.data?.detail, action: { label: "Buy Credits", onClick: () => navigate('/dashboard?tab=pricing') } });
            } else {
                toast.error("Submission Failed", { description: error.response?.data?.detail || "Please check your file and try again." });
            }
        },
        onSettled: () => {
            setIsSubmitting(false);
        }
    });

    const { mutate: deleteTranslation, isLoading: isDeleting } = useMutation({
        mutationFn: (id) => api.delete(`/doc-translations/${id}/`),
        onSuccess: () => {
            toast.success("Translation deleted successfully!");
            queryClient.invalidateQueries({ queryKey: ['documentTranslations']});
            queryClient.invalidateQueries({ queryKey: ['failedDocumentTranslations']});
            setDeletingItem(null);
        },
        onError: (error) => toast.error("Deletion Failed", { description: error.response?.data?.detail || "An unexpected error occurred." }),
    });

    const resetFileState = () => {
        setFile(null);
        setMetric({ type: null, value: 0 });
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleFileChange = async (selectedFile) => {
        if (!selectedFile) {
            resetFileState();
            return;
        }

        const MAX_FILE_SIZE_MB = 25;
        if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            toast.error("File Too Large", { description: `Please select a file smaller than ${MAX_FILE_SIZE_MB}MB.`});
            resetFileState();
            return;
        }

        if (!SUPPORTED_MIME_TYPES.includes(selectedFile.type)) {
            toast.error("Unsupported File Type", { description: "Please upload a PDF, PPTX, or TXT file."});
            resetFileState();
            return;
        }

        setFile(selectedFile);
        const arrayBuffer = await selectedFile.arrayBuffer();

        try {
            if (selectedFile.type === 'application/pdf') {
                const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
                const pages = pdfDoc.getPageCount();
                if (pages > 20) {
                    toast.error("Page Limit Exceeded", { description: "PDFs with more than 20 pages are not supported." });
                    resetFileState();
                    return;
                }
                setMetric({ type: 'pages', value: pages });
            } else if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
                const zip = await JSZip.loadAsync(arrayBuffer);
                const slideFiles = zip.file(/ppt\/slides\/slide\d+\.xml/);
                const slides = slideFiles.length;

                if (slides === 0) {
                    toast.error("No Slides Found", { description: "The PowerPoint file appears to be empty or corrupted." });
                    resetFileState();
                    return;
                }
                if (slides > 20) {
                    toast.error("Page Limit Exceeded", { description: "PowerPoint files with more than 20 slides are not supported." });
                    resetFileState();
                    return;
                }
                setMetric({ type: 'pages', value: slides });
            } else if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const docContainer = document.createElement('div');
                // --- CORRECTED FUNCTION CALL ---
                await renderAsync(arrayBuffer, docContainer);
                const chars = docContainer.innerText.length;
                if (chars > 8000) {
                    toast.error("Character Limit Exceeded", { description: "DOCX files with more than 8,000 characters are not supported." });
                    resetFileState();
                    return;
                }
                setMetric({ type: 'chars', value: chars });
            } else if (selectedFile.type === 'text/plain') {
                const text = new TextDecoder("utf-8").decode(arrayBuffer);
                const chars = text.length;
                if (chars > 8000) {
                    toast.error("Character Limit Exceeded", { description: "Text files with more than 8,000 characters are not supported." });
                    resetFileState();
                    return;
                }
                setMetric({ type: 'chars', value: chars });
            }
        } catch (error) {
            console.error("File processing error:", error);
            toast.error("File Read Error", { description: "Could not process the file. It may be corrupted or in an unsupported format." });
            resetFileState();
        }
    };


    const handleDragEvents = (e, isEntering) => { e.preventDefault(); e.stopPropagation(); setIsDragging(isEntering); };
    const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]); };

    const handleSubmit = () => {
        if (!file) return toast.warning("Please select a document to translate.");
        if (sourceLang !== 'auto' && sourceLang === targetLang) return toast.error("Source and target languages must be different.");

        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('input_document', file);
        formData.append('source_language', sourceLang);
        formData.append('target_language', targetLang);

        translateDocument(formData);
    };

    const handleDeleteConfirm = () => { if (deletingItem) deleteTranslation(deletingItem.id); };

    const isUIBlocked = isSubmitting || isMutating || isJobRunning;

    return (
        <div className="space-y-8">
             <Card className="bg-transparent shadow-none border-none">
                <CardHeader className="p-0">
                    <CardTitle className="text-2xl flex items-center"><Languages className="h-6 w-6 mr-3 text-primary" />Document Translator</CardTitle>
                    <CardDescription>Upload a document, choose your languages, and get a high-quality translation.</CardDescription>
                </CardHeader>
                <hr className="my-4" />
                <AnimatePresence mode="wait">
                    {isJobRunning ? (
                        <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <Card className="text-center bg-muted/50 p-8">
                                <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                                <CardTitle className="mt-4 text-xl">Translation in Progress</CardTitle>
                                <CardDescription className="mt-2">
                                    Please wait for the current job to complete. <br/> The history below will update automatically.
                                </CardDescription>
                            </Card>
                        </motion.div>
                    ) : (
                        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                             <CardContent className="space-y-6 p-0">
                                <div
                                    className={cn(
                                        "border-2 border-dashed rounded-lg p-6 text-center transition-colors relative",
                                        isDragging ? 'border-primary bg-primary/10' : 'hover:border-primary/80',
                                        isUIBlocked && "cursor-not-allowed opacity-60"
                                    )}
                                    onClick={() => !isUIBlocked && fileInputRef.current?.click()}
                                    onDragEnter={(e) => !isUIBlocked && handleDragEvents(e, true)}
                                    onDragLeave={(e) => !isUIBlocked && handleDragEvents(e, false)}
                                    onDragOver={(e) => !isUIBlocked && handleDragEvents(e, true)}
                                    onDrop={(e) => !isUIBlocked && handleDrop(e)}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => handleFileChange(e.target.files?.[0])}
                                        accept={ACCEPT_STRING}
                                        disabled={isUIBlocked}
                                    />

                                    <AnimatePresence>
                                    {file ? (
                                        <motion.div initial={{opacity: 0, scale: 0.8}} animate={{opacity: 1, scale: 1}} exit={{opacity: 0, scale: 0.8}} className="bg-muted/80 rounded-lg p-3 flex items-center justify-between text-left">
                                           <div className="flex items-center gap-3">
                                                <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                                                <div>
                                                    <p className="font-semibold text-sm truncate max-w-[200px] sm:max-w-xs">{file.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatFileSize(file.size)}
                                                        {metric.value > 0 && <span className="mx-1">·</span>}
                                                        {metric.type === 'pages' && `${metric.value} page${metric.value > 1 ? 's' : ''}`}
                                                        {metric.type === 'chars' && `${metric.value.toLocaleString()} character${metric.value > 1 ? 's' : ''}`}
                                                    </p>
                                                </div>
                                           </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => { e.stopPropagation(); resetFileState(); }}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </motion.div>
                                    ) : (
                                        <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="flex flex-col items-center justify-center space-y-2 cursor-pointer">
                                            <UploadCloud className="h-10 w-10 text-muted-foreground" />
                                            <div>
                                                <p className="font-semibold">Click to upload or drag & drop</p>
                                                <p className="text-xs text-muted-foreground mt-1">Supports PDF, PPTX, TXT (Max 25MB)</p>
                                            </div>
                                        </motion.div>
                                    )}
                                    </AnimatePresence>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label>From (Source)</Label>
                                        <Select value={sourceLang} onValueChange={setSourceLang} disabled={isUIBlocked}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {sourceLanguageOptions.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>To (Target)</Label>
                                        <Select value={targetLang} onValueChange={setTargetLang} disabled={isUIBlocked}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {languageOptions.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md flex items-start gap-2">
                                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p><span className="font-semibold text-foreground">Page-Based (PDF/PPTX):</span> 2 credits for up to 2 pages, then tiered pricing per page (max 20).</p>
                                        <p className="mt-1"><span className="font-semibold text-foreground">Character-Based (TXT):</span> 2 credits for up to 2,000 characters, then 0.5 credits per 2,000 characters (max 8,000).</p>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col sm:flex-row items-center justify-between p-0 pt-6 gap-4">
                                <div className="text-sm p-0">
                                    <span className="text-muted-foreground">Estimated Cost: </span>
                                    <span className="font-bold text-primary text-lg">{estimatedCost} Credits</span>
                                </div>
                                <Button onClick={handleSubmit} disabled={!file || isUIBlocked} size="lg">
                                    {isUIBlocked ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Languages className="mr-2 h-5 w-5" />}
                                    {isSubmitting || isMutating ? "Submitting..." : isJobRunning ? "Processing..." : "Translate Document"}
                                </Button>
                            </CardFooter>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>

            <hr/>
            <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Translation History</h2>
                    <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: view === 'active' ? ['documentTranslations'] : ['failedDocumentTranslations'] })} disabled={view === 'active' ? isFetchingActive : isFetchingFailed}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${(view === 'active' ? isFetchingActive : isFetchingFailed) ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                </div>
                 <div className="flex border-b">
                    <Button variant="ghost" onClick={() => setView('active')} className={`rounded-none border-b-2 ${view === 'active' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Active</Button>
                    <Button variant="ghost" onClick={() => setView('failed')} className={`rounded-none border-b-2 ${view === 'failed' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Failed & Refunded</Button>
                </div>
                <div>
                    {view === 'active' && (
                        (isLoadingActive && !activeData) ? <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div> :
                        activeData?.results?.length > 0 ? (
                            <>
                                <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {activeData.results.map(item => <DocumentCard key={item.id} item={item} onDelete={setDeletingItem} />)}
                                </motion.div>
                                <PaginationControls currentPage={activePage} totalPages={activeData.total_pages} onPageChange={setActivePage} hasNext={!!activeData.next} hasPrev={!!activeData.previous} />
                            </>
                        ) : <div className="text-center py-16 border-2 border-dashed rounded-xl"><h3 className="text-xl font-semibold">No active translations</h3><p className="text-muted-foreground mt-2">Your translated documents will appear here.</p></div>
                    )}
                     {view === 'failed' && (
                        (isLoadingFailed && !failedData) ? <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div> :
                        failedData?.results?.length > 0 ? (
                           <>
                                <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {failedData.results.map(item => <DocumentCard key={item.id} item={item} onDelete={setDeletingItem} />)}
                                </motion.div>
                                <PaginationControls currentPage={failedPage} totalPages={failedData.total_pages} onPageChange={setFailedPage} hasNext={!!failedData.next} hasPrev={!!failedData.previous} />
                            </>
                        ) : <div className="text-center py-16 border-2 border-dashed rounded-xl"><h3 className="text-xl font-semibold">No failed translations</h3><p className="text-muted-foreground mt-2">Jobs that failed and were refunded will be listed here.</p></div>
                    )}
                </div>
            </div>

            <Dialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                        <DialogDescription>This will permanently delete the translation record and its associated files from storage. This action cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setDeletingItem(null)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DocumentTranslator;