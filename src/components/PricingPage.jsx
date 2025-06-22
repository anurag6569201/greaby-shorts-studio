// frontend/src/pages/PricingPage.jsx

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { toast } from 'sonner';

const PricingPage = () => {
    const { user, subscription } = useAuth();
    const navigate = useNavigate();
    const [isLoadingCheckout, setIsLoadingCheckout] = useState(null); // Track loading state per plan

    const { data: plans, isLoading: isLoadingPlans } = useQuery({
        queryKey: ['plans'],
        queryFn: () => api.get('/subscriptions/plans/').then(res => res.data),
    });

    const handleChoosePlan = async (planId) => {
        if (!user) {
            navigate('/signup');
            return;
        }
        setIsLoadingCheckout(planId);
        try {
            const response = await api.post('/subscriptions/create-checkout-session/', { planId });
            // Redirect to Stripe checkout
            window.location.href = response.data.url;
        } catch (error) {
            toast.error("Failed to start checkout.", {
                description: "Please try again or contact support.",
            });
            setIsLoadingCheckout(null);
        }
    };

    const currentPlanId = subscription?.plan?.id;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="py-4 px-8 flex justify-between items-center">
                 <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-emerald-500 rounded-lg flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-emerald-600 bg-clip-text text-transparent">
                        Greaby
                    </span>
                </div>
                <Button variant="ghost" onClick={() => navigate(user ? '/dashboard' : '/login')}>
                    {user ? 'Go to Dashboard' : 'Login'}
                </Button>
            </header>
            
            {/* Main Content */}
            <main className="py-16 px-4">
                <div className="text-center max-w-3xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900">Choose the Plan That's Right for You</h1>
                    <p className="mt-4 text-lg text-slate-600">Start for free, then upgrade to unlock more power and features.</p>
                </div>

                {isLoadingPlans ? (
                    <div className="text-center mt-12"><Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto" /></div>
                ) : (
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {plans?.filter(p => p.price > 0).map(plan => (
                            <Card key={plan.id} className={`flex flex-col ${currentPlanId === plan.id ? 'border-purple-500' : ''}`}>
                                <CardHeader>
                                    <CardTitle className="text-2xl">{plan.display_name}</CardTitle>
                                    <CardDescription>
                                        <span className="text-4xl font-bold text-slate-900">${plan.price}</span>
                                        <span className="text-slate-500">/month</span>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-4">
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-2" /> {plan.video_limit} video generations</li>
                                        <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-2" /> Up to {plan.max_duration}s duration</li>
                                        <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-2" /> Resolutions up to {plan.allowed_resolutions.slice(-1)[0]}</li>
                                        {plan.can_remove_watermark && <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-2" /> No watermark</li>}
                                    </ul>
                                </CardContent>
                                <div className="p-6 pt-0 mt-auto">
                                    <Button
                                        onClick={() => handleChoosePlan(plan.id)}
                                        disabled={isLoadingCheckout === plan.id || currentPlanId === plan.id}
                                        className="w-full"
                                    >
                                        {isLoadingCheckout === plan.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : currentPlanId === plan.id ? (
                                            'Current Plan'
                                        ) : (
                                            'Choose Plan'
                                        )}
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default PricingPage;