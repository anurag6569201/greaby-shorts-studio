import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, Sparkles, Star } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { toast } from 'sonner';
import Footer from './intro/Footer';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const scriptId = 'razorpay-checkout-script';
    if (document.getElementById(scriptId)) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => {
        toast.error("Failed to load payment script.");
        resolve(false);
    };
    document.body.appendChild(script);
  });
};

const CreditPackCard = ({ pack, onPurchase, isLoading }) => {
    return (
        <Card className={`flex flex-col shadow-lg ${pack.isPopular ? 'border-primary ring-2 ring-primary' : ''}`} style={{ overflow: 'hidden' }}>
            {pack.isPopular && <div className="py-1.5 px-3 bg-primary text-primary-foreground text-xs font-semibold rounded-t-lg flex items-center justify-center"><Star className="mr-2 h-4 w-4" /> Most Popular</div>}
            <CardHeader>
                <CardTitle className="text-2xl">{pack.name}</CardTitle>
                <CardDescription>
                    <span className="text-4xl font-bold text-foreground">₹{parseInt(pack.price)}</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <div className="text-center bg-primary/10 rounded-lg p-4">
                    <p className="text-3xl font-bold text-primary">{pack.credits_amount}</p>
                    <p className="text-sm font-medium text-primary/80">Credits</p>
                </div>
                <ul className="space-y-3 text-sm text-foreground">
                    <li className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" /> One-time purchase</li>
                    <li className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" /> Credits never expire</li>
                    <li className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" /> Access to all features</li>
                </ul>
            </CardContent>
            <div className="p-6 pt-0 mt-auto">
                <Button onClick={() => onPurchase(pack)} disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buy Now'}
                </Button>
            </div>
        </Card>
    );
};

const PricingPage = () => {
    const { user, fetchUserProfile } = useAuth();
    const navigate = useNavigate();
    const [isLoadingCheckout, setIsLoadingCheckout] = useState(null);

    const { data: packs, isLoading: isLoadingPacks } = useQuery({
        queryKey: ['creditPacks'],
        queryFn: () => api.get('/billing/credit-packs/').then(res => res.data),
    });

    useEffect(() => {
        loadRazorpayScript();
    }, []);

    const handlePurchase = async (pack) => {
        if (!user) {
            toast.info("Please log in to make a purchase.", {
                action: { label: "Login", onClick: () => navigate('/login?redirect=/pricing') },
            });
            return;
        }

        setIsLoadingCheckout(pack.id);

        try {
            const { data: orderData } = await api.post('/billing/purchase/', { credit_pack_id: pack.id });

            const options = {
                key: orderData.razorpay_key_id,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Greaby AI",
                description: `Purchase of ${pack.name}`,
                order_id: orderData.razorpay_order_id,
                handler: function (response) {
                    toast.success("Payment successful! Your credits have been added.");
                    fetchUserProfile();
                    navigate('/dashboard');
                },
                prefill: {
                    name: orderData.user_name,
                    email: orderData.user_email,
                },
                theme: { color: "#6d28d9" }
            };
            
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response){
                toast.error("Payment Failed", { description: "Your payment was not successful. Please try again." });
            });
            rzp.open();
        } catch (error) {
            toast.error("Failed to initiate purchase.", { description: error.response?.data?.detail || "Please try again or contact support." });
        } finally {
            setIsLoadingCheckout(null);
        }
    };
    
    const processedPacks = packs?.map((p, index) => ({...p, isPopular: index === 1 })) || [];
    
    return (
        <>
        <div className="min-h-screen bg-slate-50">
            <header className="py-4 px-8 flex justify-between items-center bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b">
                 <Link to="/" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"><Sparkles className="h-5 w-5 text-primary-foreground" /></div>
                    <span className="text-2xl font-bold">Greaby</span>
                 </Link>
                <Button variant="ghost" onClick={() => navigate(user ? '/dashboard' : '/login')}>{user ? 'Go to Dashboard' : 'Login'}</Button>
            </header>
            <main className="py-16 sm:py-24 px-4" style={{width:'100%'}}>
                <div className="text-center max-w-3xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Top Up Your Creative Fuel</h1>
                    <p className="mt-4 text-lg text-muted-foreground">Buy credits as you go. No subscriptions, no monthly fees. Use them whenever you want.</p>
                </div>
                <br />
                {isLoadingPacks ? (
                    <div className="text-center mt-12"><Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" /></div>
                ) : (
                    <div className={`mt-16 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-${Math.min(processedPacks.length, 3)} gap-8 container items-stretch`}>
                        {processedPacks.map(pack => 
                            <CreditPackCard 
                                key={pack.id} 
                                pack={pack} 
                                onPurchase={handlePurchase} 
                                isLoading={isLoadingCheckout === pack.id} 
                            />
                        )}
                    </div>
                )}
            </main>
        </div>
        <Footer/>
        </>
    );
};
export default PricingPage;