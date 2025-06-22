// src/pages/PricingPage.jsx

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, Sparkles, Star, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { toast } from 'sonner';

// This reusable PlanCard component is now the single source of truth for rendering.
const PlanCard = ({ plan, onChoose, isLoading, isCurrentPlan }) => {
    const isFree = plan.price <= 0;
    
    const getButton = () => {
        if (isCurrentPlan) {
            return <Button className="w-full" disabled>Your Current Plan</Button>;
        }
        if (isFree) {
            return <Button className="w-full" variant="outline" onClick={() => onChoose(plan.id)}>Get Started for Free</Button>;
        }
        return (
            <Button
                onClick={() => onChoose(plan.id)}
                disabled={isLoading}
                className="w-full"
                variant={plan.isPopular ? 'default' : 'outline'}
            >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Choose Plan'}
            </Button>
        );
    };

    return (
        <Card className={`flex flex-col ${isCurrentPlan ? 'border-primary ring-2 ring-primary' : ''} ${plan.isPopular ? 'border-purple-300 shadow-lg' : 'shadow-sm'}`}>
            {plan.isPopular && (
                <div className="py-1.5 px-3 bg-primary text-primary-foreground text-xs font-semibold rounded-t-lg flex items-center justify-center">
                    <Star className="mr-2 h-4 w-4" /> Most Popular
                </div>
            )}
            <CardHeader>
                <CardTitle className="text-2xl">{plan.display_name}</CardTitle>
                <CardDescription>
                    <span className="text-4xl font-bold text-foreground">${parseInt(plan.price)}</span>
                    <span className="text-muted-foreground">{isFree ? ' / forever' : ' / month'}</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <p className="text-sm text-muted-foreground">{plan.description || `Perfect for ${isFree ? 'getting started' : 'growing creators'}.`}</p>
                <ul className="space-y-3 text-sm text-foreground">
                    <li className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" /> {plan.total_creations_limit} Total Creations {isFree ? '(Lifetime)' : '/mo'}</li>
                    <li className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" /> Up to {plan.max_video_duration}s Video Duration</li>
                    <li className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" /> Up to {plan.max_audio_characters} Audio Characters</li>
                    <li className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" /> Resolutions up to {plan.video_resolutions.slice(-1)[0]}</li>
                    <li className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" /> Access to {plan.available_voices.length} AI Voices</li>
                    <li className={`flex items-start ${plan.can_remove_watermark ? '' : 'text-muted-foreground'}`}>
                        {plan.can_remove_watermark ? <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" /> : <X className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />}
                        {plan.can_remove_watermark ? 'No Watermark' : 'Includes Watermark'}
                    </li>
                </ul>
            </CardContent>
            <div className="p-6 pt-0 mt-auto">
                {getButton()}
            </div>
        </Card>
    );
};


const PricingPage = () => {
    const { user, subscription } = useAuth();
    const navigate = useNavigate();
    const [isLoadingCheckout, setIsLoadingCheckout] = useState(null);

    const { data: plans, isLoading: isLoadingPlans } = useQuery({
        queryKey: ['plans'],
        queryFn: () => api.get('/subscriptions/plans/').then(res => res.data),
    });

    const handleChoosePlan = async (planId) => {
        const selectedPlan = plans.find(p => p.id === planId);
        if (!selectedPlan) return;
        
        if (selectedPlan.price <= 0) {
            navigate(user ? '/dashboard' : '/signup');
            return;
        }
        
        if (!user) {
            navigate('/signup');
            return;
        }
        setIsLoadingCheckout(planId);
        try {
            const response = await api.post('/subscriptions/create-checkout-session/', { planId });
            window.location.href = response.data.url;
        } catch (error) {
            toast.error("Failed to start checkout.", { description: "Please try again or contact support." });
            setIsLoadingCheckout(null);
        }
    };

    // Memoize the processed plans to avoid recalculating on every render
    const processedPlans = useMemo(() => {
        const allPlans = plans?.map(p => ({...p, isPopular: false})) || [];
        if (allPlans.length > 1) {
            const paidPlans = allPlans.filter(p => p.price > 0);
            if (paidPlans.length > 0) {
                const mostExpensive = paidPlans.reduce((max, p) => parseFloat(p.price) > parseFloat(max.price) ? p : max, paidPlans[0]);
                const planIndex = allPlans.findIndex(p => p.id === mostExpensive.id);
                if (planIndex !== -1) {
                    allPlans[planIndex].isPopular = true;
                }
            }
        }
        return allPlans;
    }, [plans]);

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="py-4 px-8 flex justify-between items-center bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b">
                 <Link to="/" className="flex items-center space-x-2"><div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"><Sparkles className="h-5 w-5 text-primary-foreground" /></div><span className="text-2xl font-bold">Greaby</span></Link>
                <Button variant="ghost" onClick={() => navigate(user ? '/dashboard' : '/login')}>{user ? 'Go to Dashboard' : 'Login'}</Button>
            </header>
            
            <main className="py-16 sm:py-24 px-4">
                <div className="text-center max-w-3xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Choose Your Creative Power-Up</h1>
                    <p className="mt-4 text-lg text-muted-foreground">Start for free, then upgrade to unlock your full potential.</p>
                </div>

                {isLoadingPlans ? (
                    <div className="text-center mt-12"><Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" /></div>
                ) : (
                    <div className={`mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(processedPlans.length, 3)} gap-8 max-w-7xl mx-auto items-stretch`}>
                        {processedPlans.map(plan => (
                            <PlanCard 
                                key={plan.id} 
                                plan={plan}
                                onChoose={handleChoosePlan}
                                isLoading={isLoadingCheckout === plan.id}
                                isCurrentPlan={subscription?.plan?.id === plan.id}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default PricingPage;