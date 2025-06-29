import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowUpRight, ArrowDownLeft, History as HistoryIcon } from 'lucide-react';
import api from '@/services/api';
import { PaginationControls } from '@/components/ui/PaginationControls';

const TransactionRow = ({ item }) => {
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
                <CardContent className="space-y-6 p-0">
                    {isLoading && !historyData ? (
                         <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    ) : historyData?.results && historyData.results.length > 0 ? (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50%]">Description</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Date</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historyData.results.map(item => <TransactionRow key={item.id} item={item} />)}
                                </TableBody>
                            </Table>
                            <PaginationControls
                                currentPage={currentPage}
                                totalPages={historyData.total_pages}
                                onPageChange={handlePageChange}
                                hasNext={!!historyData.next}
                                hasPrev={!!historyData.previous}
                            />
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