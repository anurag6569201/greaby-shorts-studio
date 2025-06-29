import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Video, Mic, Clapperboard, ArrowRight, Loader2, Coins } from "lucide-react";
import api from "@/services/api";
import { useNavigate } from "react-router-dom";

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
  <Card className="hover:border-primary/50 transition-colors flex flex-col">
    <CardHeader className="flex-grow">
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
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const [videoRes, audioRes, reelRes] = await Promise.all([
        api.get('/videos/'),
        api.get('/audios/'),
        api.get('/reels/'),
      ]);
      return {
        videos: videoRes.data.count,
        audios: audioRes.data.count,
        reels: reelRes.data.count,
      };
    },
    enabled: !!user,
  });
  
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.first_name}!</h1>
        <p className="text-muted-foreground">Here's a summary of your creative workspace.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold">{user ? parseFloat(user.credit_balance).toFixed(2) : "0.00"}</div>
              <p className="text-xs text-muted-foreground">Credits available for generation</p>
          </CardContent>
        </Card>
        <StatCard label="Videos Generated" value={stats?.videos ?? 0} icon={Video} isLoading={isLoadingStats} />
        <StatCard label="Audios Generated" value={stats?.audios ?? 0} icon={Mic} isLoading={isLoadingStats} />
        <StatCard label="Reels Assembled" value={stats?.reels ?? 0} icon={Clapperboard} isLoading={isLoadingStats} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <ActionCard title="Generate Video" description="Transform your text prompts into stunning short videos." icon={Video} onClick={() => setActiveTab('video')} />
        <ActionCard title="Generate Audio" description="Create professional voiceovers from text with various voices." icon={Mic} onClick={() => setActiveTab('audio')} />
        <ActionCard title="Assemble a Reel" description="Combine your generated videos and audios into a final reel." icon={Clapperboard} onClick={() => setActiveTab('reels')} />
      </div>
    </div>
  );
};

export default DashboardHome;