import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

const SettingsPage = () => {
  const { user, fetchUserProfile } = useAuth();
  const [newFirstName, setNewFirstName] = useState(user?.first_name || "");
  const [newLastName, setNewLastName] = useState(user?.last_name || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const navigate = useNavigate();

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
        await api.patch('/auth/profile/', {
            first_name: newFirstName,
            last_name: newLastName
        });
        await fetchUserProfile();
        toast.success("Profile updated successfully!");
    } catch (error) {
        toast.error("Failed to update profile.", { description: error.response?.data?.detail || "Please try again." });
    } finally {
        setIsUpdatingProfile(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and billing details.</p>
      </div>
      <hr style={{marginTop:'10px',marginBottom:'5px'}}/>
      <Card className="bg-transparent shadow-none border border-none" style={{border:'none'}}>
        <CardHeader className="p-0 pt-4">
          <CardTitle>Profile</CardTitle>
          <CardDescription>This is how your name appears in the application.</CardDescription>
        </CardHeader>
        <br />
        <CardContent className="p-0 pt-2">
          <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={newFirstName} onChange={e => setNewFirstName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={newLastName} onChange={e => setNewLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={user?.email} disabled />
            </div>
            <Button type="submit" disabled={isUpdatingProfile}>
              {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
      <br />
      <hr />
      <br />
      <Card className="bg-transparent shadow-none border border-none" style={{border:'none'}}>
        <CardHeader className="p-0 pt-2">
          <CardTitle>Billing & Credits</CardTitle>
          <CardDescription>Manage your credits and view your balance.</CardDescription>
        </CardHeader>
        <br />
        <CardContent className="space-y-4 p-0">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg bg-muted/50 gap-4">
            <div>
              <p className="font-medium flex items-center"><Coins className="h-4 w-4 mr-2 text-yellow-500"/>Current Credit Balance</p>
              <p className="text-2xl font-bold">{user ? parseFloat(user.credit_balance).toFixed(2) : "0.00"}</p>
            </div>
            <Button onClick={() => navigate('/pricing')}>
              Buy More Credits <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;