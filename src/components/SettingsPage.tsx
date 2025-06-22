// frontend/src/components/SettingsPage.jsx

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { toast } from "sonner";

const SettingsPage = () => {
  const { user, subscription, creations } = useAuth();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const navigate = useNavigate();

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    toast.info("Profile update functionality coming soon!");
  };

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const response = await api.post('/subscriptions/create-portal-session/');
      window.location.href = response.data.url;
    } catch (error) {
      toast.error("Failed to open management portal.", {
        description: error.response?.data?.error || "Please try again or contact support."
      });
    } finally {
      setIsLoadingPortal(false);
    }
  };

  // --- CORRECTED LOGIC ---
  const isFreePlan = !subscription || subscription.plan.name === 'free';
  const planName = subscription?.plan?.display_name || 'Free';
  
  // This now correctly gets the limit for the current plan, whether free or paid.
  const planLimit = subscription?.plan?.video_limit || 1; 

  const creationsCount = creations?.length || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account and subscription details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-lg">
            <div className="grid grid-cols-2 gap-4">
              <div><Label htmlFor="firstName">First Name</Label><Input id="firstName" defaultValue={user?.first_name} /></div>
              <div><Label htmlFor="lastName">Last Name</Label><Input id="lastName" defaultValue={user?.last_name} /></div>
            </div>
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={user?.email} disabled /></div>
            <Button type="submit">Update Profile</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Manage your billing and plan details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
            <div>
              <p className="font-medium text-slate-700">Current Plan</p>
              <Badge variant={isFreePlan ? "outline" : "default"} className="text-base">{planName}</Badge>
            </div>
            <div>
              <p className="font-medium text-right text-slate-700">Monthly Usage</p>
              {/* The display logic is now simpler and more robust */}
              <p className="text-gray-600">
                {creationsCount} / {planLimit} videos
              </p>
            </div>
          </div>
          
          {isFreePlan ? (
            <Button onClick={() => navigate('/pricing')} className="bg-gradient-to-r from-purple-600 to-emerald-600">
              Upgrade to Pro <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleManageSubscription} disabled={isLoadingPortal}>
              {isLoadingPortal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Manage Subscription
            </Button>
          )}

          <p className="text-sm text-gray-500">
            {isFreePlan 
              ? "Upgrade your plan to unlock premium features and increase your limits."
              : "You will be redirected to Stripe to manage your subscription, view invoices, or cancel your plan."
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;