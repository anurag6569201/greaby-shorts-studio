// src/components/dashboard/DashboardHome.jsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Video, Mic, Clapperboard, ArrowRight, Loader2 } from "lucide-react";
import api from "@/services/api";

const StatCard = ({ label, value, icon: Icon, isLoading }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{label}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
    </CardContent>
  </Card>
);

const ActionCard = ({ title, description, icon: Icon, onClick }) => (
  <Card className="hover:border-primary/50 transition-colors">
    <CardHeader>
      <Icon className="h-8 w-8 mb-2 text-primary" />
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <Button onClick={onClick}>
        Start Creating <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </CardContent>
  </Card>
);

const DashboardHome = ({ setActiveTab }) => {
  const { user, subscription } = useAuth();
  
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      // Fetch counts in parallel
      const [videoRes, audioRes, reelRes] = await Promise.all([
        api.get('/creations/history/'),
        api.get('/audio/'),
        api.get('/reels/'),
      ]);
      return {
        videos: videoRes.data.length,
        audios: audioRes.data.length,
        reels: reelRes.data.length,
      };
    },
  });

  const creationsCount = (stats?.videos || 0) + (stats?.audios || 0);
  const creationsLimit = subscription?.plan?.total_creations_limit || 0;
  const usagePercentage = creationsLimit > 0 ? Math.round((creationsCount / creationsLimit) * 100) : 0;
  
  return (
    <div className="space-y-4 gap-4">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.first_name}!</h1>
        <p className="text-muted-foreground">Here's a summary of your creative workspace.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Videos Generated" value={stats?.videos} icon={Video} isLoading={isLoadingStats} />
        <StatCard label="Audios Generated" value={stats?.audios} icon={Mic} isLoading={isLoadingStats} />
        <StatCard label="Reels Assembled" value={stats?.reels} icon={Clapperboard} isLoading={isLoadingStats} />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{creationsCount} / {creationsLimit}</div>
                <p className="text-xs text-muted-foreground">{usagePercentage}% of your monthly limit used</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
            
      <div className="grid gap-4 md:grid-cols-3">
        <ActionCard 
          title="Generate Video" 
          description="Transform your text prompts into stunning short videos." 
          icon={Video}
          onClick={() => setActiveTab('video')}
        />
        <ActionCard 
          title="Generate Audio" 
          description="Create professional voiceovers from text with various voices." 
          icon={Mic}
          onClick={() => setActiveTab('audio')}
        />
        <ActionCard 
          title="Assemble a Reel" 
          description="Combine your generated videos and audios into a final reel." 
          icon={Clapperboard}
          onClick={() => setActiveTab('reels')}
        />
      </div>
    </div>
  );
};

export default DashboardHome;