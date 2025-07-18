import React, { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Languages, Loader2, RefreshCw, Trash2, Download, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PaginationControls } from "@/components/ui/PaginationControls";

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


const getStatusBadge = (status) => {
    switch (status) {
        case 'completed': return <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">Completed</span>;
        case 'processing': return <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full flex items-center"><Loader2 className="h-3 w-3 animate-spin mr-1" />Processing</span>;
        case 'pending': return <span className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">Pending</span>;
        case 'failed': return <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">Failed</span>;
        default: return <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded-full">{status}</span>;
    }
};

const DocumentCard = ({ item, onDelete }) => {
    return (
        <motion.div layout variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="border rounded-lg p-4 flex flex-col justify-between space-y-3 bg-card">
            <div className="flex justify-between items-start">
                <FileText className="h-8 w-8 text-primary" />
                {getStatusBadge(item.status)}
            </div>
            <div>
                <p className="font-semibold text-sm">{item.source_language} ➔ {item.target_language}</p>
                <p className="text-xs text-muted-foreground">Created: {new Date(item.created_at).toLocaleString()}</p>
                 {item.error_message && <p className="text-xs text-red-500 mt-1 truncate" title={item.error_message}>Error: {item.error_message}</p>}
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t -mx-4 px-4">
                <Button variant="ghost" size="icon" onClick={() => onDelete(item)}><Trash2 className="h-4 w-4" /></Button>
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
    const [sourceLang, setSourceLang] = useState("auto");
    const [targetLang, setTargetLang] = useState("en"); 
    const [deletingItem, setDeletingItem] = useState(null);
    const [view, setView] = useState('active');
    const [activePage, setActivePage] = useState(1);
    const [failedPage, setFailedPage] = useState(1);
    
    const queryClient = useQueryClient();
    const { fetchUserProfile } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const staleTime = 60 * 1000; // 1 minute

    const { data: activeData, isLoading: isLoadingActive, isFetching: isFetchingActive } = useQuery({
        queryKey: ['documentTranslations', activePage],
        queryFn: () => api.get(`/doc-translations/?page=${activePage}`).then(res => res.data),
        keepPreviousData: true, staleTime,
    });

    const { data: failedData, isLoading: isLoadingFailed, isFetching: isFetchingFailed } = useQuery({
        queryKey: ['failedDocumentTranslations', failedPage],
        queryFn: () => api.get(`/doc-translations/failed/?page=${failedPage}`).then(res => res.data),
        keepPreviousData: true, staleTime, enabled: view === 'failed',
    });

    const { mutate: translateDocument, isLoading: isTranslating } = useMutation({
        mutationFn: (formData) => api.post('/doc-translations/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
        onSuccess: (response) => {
            const newItem = response.data;
            toast.success("Translation started!", { description: "Your document is being processed and will appear below." });
            queryClient.setQueryData(['documentTranslations', 1], (oldData) => {
                const oldResults = oldData?.results ?? [];
                return { ...oldData, count: (oldData?.count ?? 0) + 1, results: [newItem, ...oldResults] };
            });
            if (activePage !== 1) setActivePage(1);
            if (view !== 'active') setView('active');
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            fetchUserProfile();
            setFile(null);
        },
        onError: (error) => {
            if (error.response?.status === 402) {
                toast.error("Insufficient Credits", { description: error.response?.data?.detail, action: { label: "Buy Credits", onClick: () => navigate('/dashboard?tab=pricing') } });
            } else {
                toast.error("Submission Failed", { description: error.response?.data?.detail || "Please check your file and try again." });
            }
        },
    });

    const { mutate: deleteTranslation, isLoading: isDeleting } = useMutation({
        mutationFn: (id) => api.delete(`/doc-translations/${id}/`),
        onSuccess: (_, id) => {
            toast.success("Translation deleted successfully!");
            const queryKey = view === 'active' ? ["documentTranslations", activePage] : ["failedDocumentTranslations", failedPage];
            queryClient.setQueryData(queryKey, (oldData) => oldData ? ({ ...oldData, count: oldData.count-1, results: oldData.results.filter(item => item.id !== id) }) : oldData);
            setDeletingItem(null);
        },
        onError: (error) => toast.error("Deletion Failed", { description: error.response?.data?.detail || "An unexpected error occurred." }),
    });

    const handleSubmit = () => {
        if (!file) return toast.warning("Please select a document to translate.");
        if (sourceLang === targetLang) return toast.error("Source and target languages must be different.");
        
        const formData = new FormData();
        formData.append('input_document', file);
        formData.append('source_language', sourceLang);
        formData.append('target_language', targetLang);
        
        translateDocument(formData);
    };

    const handleDeleteConfirm = () => { if (deletingItem) deleteTranslation(deletingItem.id); };
    const estimatedCost = "2.00"; // Based on our service logic

    return (
        <div className="space-y-8">
            <Card className="bg-transparent shadow-none border-none">
                <CardHeader className="p-0">
                    <CardTitle className="text-2xl flex items-center"><Languages className="h-6 w-6 mr-3 text-primary" />Document Translator</CardTitle>
                    <CardDescription>Upload a document, choose your languages, and get a high-quality translation.</CardDescription>
                </CardHeader>
                <hr className="my-4" />
                <CardContent className="space-y-6 p-0">
                    <div className="">
                        <div className="space-y-2">
                            <div
                                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input ref={fileInputRef} type="file" id="file-upload" className="hidden" onChange={(e) => setFile(e.target.files[0])} accept=".pdf,.doc,.docx,.txt" />
                                <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                                {file ? (
                                    <p className="font-semibold text-primary">{file.name}</p>
                                ) : (
                                    <p>Click to upload or drag & drop</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">Supported: PDF, DOCX, DOC, TXT</p>
                            </div>
                        </div>
                        
                    </div>
                </CardContent><br />
                <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>From (Source)</Label>
                                    <Select value={sourceLang} onValueChange={setSourceLang} disabled={isTranslating}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {sourceLanguageOptions.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>To (Target)</Label>
                                    <Select value={targetLang} onValueChange={setTargetLang} disabled={isTranslating}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {languageOptions.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                 <CardFooter className="flex items-center justify-between p-0 pt-6">
                    <div className="text-sm p-0">
                        <span className="text-muted-foreground">Estimated Cost: </span>
                        <span className="font-bold text-primary">{estimatedCost} Credits</span>
                    </div>
                    <Button onClick={handleSubmit} disabled={!file || isTranslating} size="lg">
                        {isTranslating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Languages className="mr-2 h-5 w-5" />}
                        Translate Document
                    </Button>
                </CardFooter>
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
                        <Button variant="outline" onClick={() => setDeletingItem(null)}>Cancel</Button>
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