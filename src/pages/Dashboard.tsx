import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkles, Home, Video, Mic, Clapperboard, Settings, LogOut, User, Menu, CreditCard, Coins,History } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import DashboardHome from "@/components/dashboard/DashboardHome";
import VideoGenerator from "@/components/dashboard/VideoGenerator";
import AudioGenerator from "@/components/dashboard/AudioGenerator";
import ReelGenerator from "@/components/dashboard/ReelGenerator";
import SettingsPage from "@/components/dashboard/SettingsPage";
import PricingPage from "@/components/dashboard/PricingPage";
import HistoryPage from "@/components/dashboard/HistoryPage";

const sidebarItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "video", label: "Video", icon: Video },
  { id: "audio", label: "Audio", icon: Mic },
  { id: "reels", label: "Reels", icon: Clapperboard },
  { id: "history", label: "Usage History", icon: History },
];

const getInitials = (firstName = "", lastName = "") => {
  return (firstName[0] || "") + (lastName[0] || "");
};

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logoutUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "home");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab") || "home";
    setActiveTab(tab);
  }, [searchParams]);

  const handleSetTab = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
    setIsSidebarOpen(false);
  };
  
  const renderContent = () => {
    switch (activeTab) {
      case "video": return <VideoGenerator />;
      case "audio": return <AudioGenerator />;
      case "reels": return <ReelGenerator />;
      case "pricing": return <PricingPage />;
      case "settings": return <SettingsPage />;
      case "history": return <HistoryPage />;
      default: return <DashboardHome setActiveTab={handleSetTab} />;
    }
  };

  const CreditBalance = () => (
    <Button variant="outline" className="w-full justify-start text-left h-auto py-2" onClick={() => handleSetTab('pricing')}>
      <div className="flex items-center space-x-3">
        <Coins className="h-5 w-5 text-yellow-500" />
        <div className="flex flex-col items-start">
          <span className="text-xs text-muted-foreground">Credits</span>
          <span className="font-semibold text-sm text-foreground">
            {user ? parseFloat(user.credit_balance).toFixed(2) : "0.00"}
          </span>
        </div>
      </div>
    </Button>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">Greaby</span>
        </div>
      </div>
      
      <div className="p-4">
        <CreditBalance />
      </div>

      <nav className="px-4 space-y-2 flex-grow">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleSetTab(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeTab === item.id
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start text-left h-auto py-2">
              <div className="flex items-center space-x-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.avatar_url} alt="Avatar" />
                  <AvatarFallback>{getInitials(user?.first_name, user?.last_name)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-sm text-foreground truncate max-w-[120px]">
                    {user ? `${user.first_name} ${user.last_name}` : "Loading..."}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {user?.email}
                  </span>
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 ml-2 mb-2">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleSetTab('settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSetTab('pricing')}>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Buy Credits</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logoutUser} className="text-red-600 focus:bg-red-50 focus:text-red-700">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/40 flex">
      <aside className="hidden lg:block w-64 bg-background border-r" style={{position: 'sticky', top: 0, height: '100vh'}}>
        <SidebarContent />
      </aside>
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        >
          <aside className="fixed top-0 left-0 h-full w-64 bg-background z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <header className="lg:hidden p-4 bg-background border-b flex items-center">
           <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <div className="flex-grow text-center text-lg font-semibold capitalize">{activeTab}</div>
          <div className="w-10"></div>
        </header>

        <main className="flex-1 p-4 sm:p-4 lg:p-4 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;