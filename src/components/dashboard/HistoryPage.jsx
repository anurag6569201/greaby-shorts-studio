import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowUpRight, ArrowDownLeft, History as HistoryIcon } from 'lucide-react';
import api from '@/services/api';
import { PaginationControls } from '@/components/ui/PaginationControls';

// A dedicated component for the mobile card view.
const MobileTransactionCard = ({ item }) => {
    const isCredit = item.type === 'credit';
    const amount = isCredit ? `+${parseFloat(item.amount).toFixed(2)}` : `-${parseFloat(item.amount).toFixed(2)}`;
    const Icon = isCredit ? ArrowUpRight : ArrowDownLeft;
    const colorClass = isCredit ? "text-green-600" : "text-red-600";

    return (
        <div className="p-4 border rounded-lg bg-card shadow-sm">
            <div className="flex justify-between items-start gap-4">
                <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="p-1.5 rounded-full bg-muted flex-shrink-0">
                        <Icon className={`h-4 w-4 ${colorClass}`} />
                    </div>
                    <div className="overflow-hidden">
                        <div className="font-medium text-sm truncate">{item.description}                        <Badge variant={isCredit ? "success" : "destructive"} className="mt-1 text-xs">
                            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </Badge></div>
                    </div>
                </div>
                <div className={`text-right font-semibold ${colorClass} text-base flex-shrink-0`}>{amount}</div>
            </div>
<div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex justify-between items-center">
    <p title={item.details} className="truncate pr-4">
        {(item.details?.length > 30 ? item.details.slice(0, 30) + '...' : item.details) || 'No additional details'}
    </p>
    <p className="flex-shrink-0">{new Date(item.date).toLocaleDateString()}</p>
</div>

        </div>
    );
};

// A dedicated component for the desktop table row view.
const DesktopTransactionRow = ({ item }) => {
    const isCredit = item.type === 'credit';
    const amount = isCredit ? `+${parseFloat(item.amount).toFixed(2)}` : `-${parseFloat(item.amount).toFixed(2)}`;
    const Icon = isCredit ? ArrowUpRight : ArrowDownLeft;
    const colorClass = isCredit ? "text-green-600" : "text-red-600";
    
    return (
        <TableRow>
            <TableCell>
                <div className="flex items-center space-x-3">
                    <div className={`p-1.5 rounded-full bg-muted`}>
                        <Icon className={`h-4 w-4 ${colorClass}`} />
                    </div>
                    <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-xs text-muted-foreground max-w-xs truncate" title={item.details}>{item.details}</p>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <Badge variant={isCredit ? "success" : "destructive"}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Badge>
            </TableCell>
            <TableCell className="text-right text-muted-foreground">{new Date(item.date).toLocaleString()}</TableCell>
            <TableCell className={`text-right font-semibold ${colorClass}`}>{amount}</TableCell>
        </TableRow>
    );
};


const HistoryPage = () => {
    const [currentPage, setCurrentPage] = useState(1);

    const { data: historyData, isLoading, isError } = useQuery({
        queryKey: ['usageHistory', currentPage],
        queryFn: () => api.get(`/billing/usage/?page=${currentPage}`).then(res => res.data),
        keepPreviousData: true,
    });

    if (isError) {
        return <div className="text-center text-red-500 p-8">Failed to load usage history. Please try again later.</div>;
    }

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    return (
        <div className="space-y-8">
            <Card className="bg-transparent shadow-none border-none">
                <CardHeader className="p-0">
                    <CardTitle className="flex items-center text-2xl"><HistoryIcon className="h-6 w-6 mr-3 text-primary" />Usage History</CardTitle>
                    <CardDescription>A complete log of your credit purchases and expenses.</CardDescription>
                </CardHeader>
                <hr className="mt-4 mb-2"/>
                <CardContent className="p-0">
                    {isLoading && !historyData ? (
                         <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    ) : historyData?.results && historyData.results.length > 0 ? (
                        <>
                            {/* Mobile View: A list of cards */}
                            <div className="space-y-3 md:hidden">
                                {historyData.results.map(item => (
                                    <MobileTransactionCard key={item.id} item={item} />
                                ))}
                            </div>

                            {/* Desktop View: A full table */}
                            <Table className="hidden md:table">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50%]">Description</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Date</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historyData.results.map(item => (
                                        <DesktopTransactionRow key={item.id} item={item} />
                                    ))}
                                </TableBody>
                            </Table>

                            <div className="mt-6">
                                <PaginationControls
                                    currentPage={currentPage}
                                    totalPages={historyData.total_pages}
                                    onPageChange={handlePageChange}
                                    hasNext={!!historyData.next}
                                    hasPrev={!!historyData.previous}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-16 border-2 border-dashed rounded-xl p-4 mt-3">
                            <h3 className="text-xl font-semibold">No History Yet</h3>
                            <p className="text-muted-foreground mt-2">Your credit purchases and generation expenses will appear here.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default HistoryPage;