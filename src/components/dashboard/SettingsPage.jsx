// src/components/dashboard/SettingsPage.jsx

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
import { useQuery } from "@tanstack/react-query";

const SettingsPage = () => {
  const { user, subscription } = useAuth();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const navigate = useNavigate();

  // We re-use the stats query from the dashboard home for consistency
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const [videoRes, audioRes] = await Promise.all([
        api.get('/creations/history/'),
        api.get('/audio/'),
      ]);
      return {
        videos: videoRes.data.length,
        audios: audioRes.data.length,
      };
    },
  });

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const response = await api.post('/subscriptions/create-portal-session/');
      window.location.href = response.data.url;
    } catch (error) {
      toast.error("Failed to open management portal.", { description: error.response?.data?.error || "Please try again." });
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const isFreePlan = subscription?.plan?.name === 'free';
  const planName = subscription?.plan?.display_name || 'Free';
  const creationsCount = (stats?.videos || 0) + (stats?.audios || 0);
  const creationsLimit = subscription?.plan?.total_creations_limit || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and subscription details.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Your personal information.</CardDescription></CardHeader>
        <CardContent>
          <form className="space-y-4 max-w-lg" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-4">
              <div><Label htmlFor="firstName">First Name</Label><Input id="firstName" defaultValue={user?.first_name} disabled /></div>
              <div><Label htmlFor="lastName">Last Name</Label><Input id="lastName" defaultValue={user?.last_name} disabled /></div>
            </div>
            <div><Label htmlFor="email">Email Address</Label><Input id="email" type="email" value={user?.email} disabled /></div>
            <Button type="submit" disabled>Update Profile (Coming Soon)</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Subscription</CardTitle><CardDescription>Manage your billing and plan details.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg bg-muted/50 gap-4">
            <div>
              <p className="font-medium">Current Plan</p>
              <Badge variant={isFreePlan ? "secondary" : "default"} className="text-base font-semibold">{planName}</Badge>
            </div>
            <div className="text-left md:text-right">
              <p className="font-medium">Creations This Period</p>
              {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin" /> : <p className="text-muted-foreground font-mono">{creationsCount} / {creationsLimit}</p>}
            </div>
          </div>
          
          {isFreePlan ? (
            <Button onClick={() => navigate('/pricing')} className="bg-gradient-to-r from-purple-600 to-emerald-600 text-white hover:opacity-90">
              Upgrade to Pro <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleManageSubscription} disabled={isLoadingPortal}>
              {isLoadingPortal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Manage Subscription in Stripe
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;