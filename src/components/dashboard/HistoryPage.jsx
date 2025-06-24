import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowUpRight, ArrowDownLeft, History as HistoryIcon } from 'lucide-react';
import api from '@/services/api';

const TransactionRow = ({ item }) => {
    const isCredit = item.type === 'credit';
    const amount = isCredit ? `+${parseFloat(item.amount).toFixed(2)}` : `-${parseFloat(item.amount).toFixed(2)}`;
    const Icon = isCredit ? ArrowUpRight : ArrowDownLeft;
    const colorClass = isCredit ? "text-green-600" : "text-red-600";
    
    return (
        <TableRow>
            <TableCell>
                <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full bg-muted ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-xs text-muted-foreground">{item.details}</p>
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-right">
                <Badge variant={isCredit ? "default" : "destructive"} className="bg-opacity-20 text-opacity-100">
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Badge>
            </TableCell>
            <TableCell className="text-right font-medium">{new Date(item.date).toLocaleString()}</TableCell>
            <TableCell className={`text-right font-semibold ${colorClass}`}>{amount}</TableCell>
        </TableRow>
    );
};

const HistoryPage = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ['usageHistory'],
        queryFn: async () => {
            // Fetch all three data sources in parallel
            const [purchasesRes, videosRes, audiosRes] = await Promise.all([
                api.get('/billing/history/'),
                api.get('/videos/'),
                api.get('/audios/')
            ]);

            // Map purchases to a common format
            const credits = purchasesRes.data.map(p => ({
                id: `p-${p.id}`,
                type: 'credit',
                amount: p.credits_purchased,
                description: 'Credit Purchase',
                details: p.credit_pack_name,
                date: p.created_at,
            }));

            // Map video expenses to a common format
            const videoExpenses = videosRes.data
                .filter(v => v.credit_cost > 0)
                .map(v => ({
                    id: `v-${v.id}`,
                    type: 'debit',
                    amount: v.credit_cost,
                    description: 'Video Generation',
                    details: v.prompt.substring(0, 50) + '...',
                    date: v.created_at,
                }));

            // Map audio expenses to a common format
            const audioExpenses = audiosRes.data
                .filter(a => a.credit_cost > 0)
                .map(a => ({
                    id: `a-${a.id}`,
                    type: 'debit',
                    amount: a.credit_cost,
                    description: 'Audio Generation',
                    details: a.title.substring(0, 50) + '...',
                    date: a.created_at,
                }));
            
            // Note: We could add subtitle generation expenses here in the future

            // Combine all transactions and sort by date descending
            const allTransactions = [...credits, ...videoExpenses, ...audioExpenses];
            allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

            return allTransactions;
        }
    });

    if (error) {
        return <div className="text-center text-red-500">Failed to load usage history.</div>;
    }

    return (
        <div className="space-y-8">
            <Card className="bg-transparent shadow-none border border-none" style={{border:'none'}}>
                <CardHeader className="p-0">
                    <CardTitle className="flex items-center text-2xl"><HistoryIcon className="h-6 w-6 mr-3 text-primary" />Usage History</CardTitle>
                    <CardDescription>A complete log of your credit purchases and expenses.</CardDescription>
                </CardHeader>
                <hr style={{marginTop:'10px',marginBottom:'5px'}}/>
                <CardContent className="space-y-6 p-0 ">
                    {isLoading ? (
                         <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    ) : data && data.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-left">Type</TableHead>
                                    <TableHead className="text-left">Date</TableHead>
                                    <TableHead className="text-left">Amount (Credits)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map(item => <TransactionRow key={item.id} item={item} />)}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-16 border-2 border-dashed rounded-xl">
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