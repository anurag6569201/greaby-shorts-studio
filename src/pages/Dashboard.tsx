// src/components/dashboard/Dashboard.js
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkles, Home, Settings, LogOut, Menu, CreditCard, Coins, History, MicVocalIcon, Loader2, AlertCircle, ArrowLeft, Mic, LanguagesIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import DashboardHome from "@/components/dashboard/DashboardHome";
import AudioGenerator from "@/components/dashboard/AudioGenerator";
import SettingsPage from "@/components/dashboard/SettingsPage";
import PricingPage from "@/components/dashboard/PricingPage";
import HistoryPage from "@/components/dashboard/HistoryPage";
import TranscriptionGenerator from "@/components/dashboard/TranscriptionGenerator";
import DocumentTranslator from "@/components/dashboard/DocumentTranslator";
import TranscriptionPlayer from "@/components/dashboard/components/TranscriptionPlayer";
import api from "@/services/api";

const sidebarItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "audio", label: "Audio", icon: Mic },
  { id: "transcription", label: "Transcription", icon: MicVocalIcon },
  { id: "translation", label: "Translation", icon: LanguagesIcon },
  { id: "history", label: "Usage History", icon: History },
];

const getInitials = (firstName = "", lastName = "") => {
  return (firstName[0] || "") + (lastName[0] || "");
};

const TranscriptionPlayerPage = () => {
    const [searchParams] = useSearchParams();
    const transcriptionId = searchParams.get('id');
  
     const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 500);
    };

    checkScreenSize(); // Check once on mount
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const getTrimmedTitle = (title) => {
    if (isSmallScreen && title.length > 15) {
      return title.slice(0, 15) + "…";
    }
    return title;
  };

    const { data: item, isLoading: isLoadingItem, isError: isErrorItem, error: itemError } = useQuery({
        queryKey: ['transcription', transcriptionId],
        queryFn: () => api.get(`/transcriptions/${transcriptionId}/`).then(res => res.data),
        enabled: !!transcriptionId,
        retry: 1,
    });

    const { data: transcriptJson, isLoading: isLoadingJson, isError: isErrorJson, error: jsonError } = useQuery({
        queryKey: ['transcriptionJson', transcriptionId],
        queryFn: () => api.get(`/transcriptions/${transcriptionId}/download?format=json`).then(res => res.data),
        enabled: !!transcriptionId,
        retry: 1,
    });

    if (!transcriptionId) {
        return (
            <div className="text-center py-10 bg-background rounded-lg border">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                <h3 className="mt-4 text-lg font-medium">Invalid Request</h3>
                <p className="mt-1 text-sm text-muted-foreground">No transcription ID was provided.</p>
                <Button asChild variant="outline" className="mt-6">
                    <Link to="/dashboard?tab=transcription"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Library</Link>
                </Button>
            </div>
        );
    }
    
    if (isLoadingItem || isLoadingJson) {
        return <div className="flex justify-center items-center h-full min-h-[50vh]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    if (isErrorItem || isErrorJson) {
        return (
             <div className="text-center py-10 bg-background rounded-lg border">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                <h3 className="mt-4 text-lg font-medium">Failed to Load Transcription</h3>
                <p className="mt-1 text-sm text-muted-foreground">Could not retrieve the requested data. It might be processing or an error occurred.</p>
                <p className="mt-1 text-xs text-muted-foreground">{itemError?.message || jsonError?.message}</p>
                <Button asChild variant="outline" className="mt-6">
                    <Link to="/dashboard?tab=transcription"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Library</Link>
                </Button>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                    <h2
      className="main-heading-smaller font-bold truncate"
      title={item.title}
    >
      {getTrimmedTitle(item.title)}
    </h2>
                <Button asChild variant="outline" size="sm">
                    <Link to="/dashboard?tab=transcription"><ArrowLeft className="mr-2 h-4 w-4" />Back to Library</Link>
                </Button>
            </div>
            <div className='h-[calc(100vh-15rem)] min-h-[500px]'>
                 <TranscriptionPlayer item={item} transcriptJson={transcriptJson} />
            </div>
        </div>
    );
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
      case "audio": return <AudioGenerator />;
      case "pricing": return <PricingPage />;
      case "settings": return <SettingsPage />;
      case "history": return <HistoryPage />;
      case "transcription": return <TranscriptionGenerator />;
      case "translation": return <DocumentTranslator />;
      case "transcription-player": return <TranscriptionPlayerPage />;
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
            <span className="flex-grow">
              {item.label}
            </span>
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
          <div className="flex-grow text-center text-lg font-semibold capitalize">{activeTab.replace('-',' ')}</div>
          <div className="w-10"></div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;