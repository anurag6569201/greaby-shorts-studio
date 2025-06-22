// frontend/src/components/SettingsPage.jsx

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { toast } from "sonner";

/**
 * A placeholder component to show while fetching user subscription data.
 * This prevents layout shift and provides a better user experience.
 */
const SettingsSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-8 w-1/4" />
      <Skeleton className="h-4 w-1/2" />
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
        <div>
          <Skeleton className="h-5 w-24 mb-2" />
          <Skeleton className="h-7 w-20" />
        </div>
        <div>
          <Skeleton className="h-5 w-24 mb-2" />
          <Skeleton className="h-7 w-24" />
        </div>
      </div>
      <Skeleton className="h-10 w-48" />
    </CardContent>
  </Card>
);


const SettingsPage = () => {
  // --- DESTRUCTURE THE NEW LOADING STATE ---
  const { user, subscription, creations, isInitialLoading } = useAuth();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const navigate = useNavigate();

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const response = await api.post('/subscriptions/create-portal-session/');
      window.location.href = response.data.url;
    } catch (error) {
      toast.error("Failed to open management portal.", {
        description: error.response?.data?.error || "Please try again.",
      });
    } finally {
      setIsLoadingPortal(false);
    }
  };

  // --- RENDER SKELETON WHILE LOADING ---
  if (isInitialLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account and subscription details.</p>
        </div>
        {/* We can add a skeleton for the profile card too */}
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
          <CardContent><Skeleton className="h-10 w-full max-w-lg" /></CardContent>
        </Card>
        <SettingsSkeleton />
      </div>
    );
  }

  // This logic now runs only *after* isInitialLoading is false and data is available.
  const isFreePlan = subscription?.plan?.name === 'free';
  const planName = subscription?.plan?.display_name || 'Free';
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
          <form className="space-y-4 max-w-lg" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-4">
              <div><Label htmlFor="firstName">First Name</Label><Input id="firstName" defaultValue={user?.first_name} disabled /></div>
              <div><Label htmlFor="lastName">Last Name</Label><Input id="lastName" defaultValue={user?.last_name} disabled /></div>
            </div>
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={user?.email} disabled /></div>
            <Button type="submit" disabled>Update Profile (Coming Soon)</Button>
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
              <p className="font-medium text-right text-slate-700">Creations This Period</p>
              <p className="text-gray-600">{creationsCount} / {planLimit}</p>
            </div>
          </div>
          
          {isFreePlan ? (
            <Button onClick={() => navigate('/pricing')} className="bg-gradient-to-r from-purple-600 to-emerald-600 text-white">
              Upgrade Plan <ArrowRight className="ml-2 h-4 w-4" />
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
              : "You will be redirected to Stripe to manage your subscription."
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;