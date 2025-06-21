
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Music, Play, Download } from "lucide-react";

const DashboardHome = () => {
  const recentVideos = [
    { id: 1, title: "Space Panda Adventure", duration: "0:20", status: "completed" },
    { id: 2, title: "Ocean Waves", duration: "0:15", status: "processing" },
    { id: 3, title: "City Lights", duration: "0:20", status: "completed" },
  ];

  const stats = [
    { label: "Videos Generated", value: "12", icon: Video },
    { label: "Audio Clips", value: "8", icon: Music },
    { label: "Total Duration", value: "3m 45s", icon: Play },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h1>
        <p className="text-gray-600">Here's what's happening with your content creation.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <Icon className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Videos</CardTitle>
          <CardDescription>Your latest video generations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentVideos.map((video) => (
              <div key={video.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-emerald-100 rounded-lg flex items-center justify-center">
                    <Video className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">{video.title}</p>
                    <p className="text-sm text-gray-600">{video.duration}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={video.status === "completed" ? "default" : "secondary"}>
                    {video.status}
                  </Badge>
                  {video.status === "completed" && (
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-6">
            <Video className="h-12 w-12 text-purple-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Create New Video</h3>
            <p className="text-gray-600 mb-4">Generate AI-powered video content from your ideas</p>
            <Button className="bg-gradient-to-r from-purple-600 to-emerald-600">
              Start Creating
            </Button>
          </CardContent>
        </Card>
        
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-6">
            <Music className="h-12 w-12 text-emerald-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Generate Audio</h3>
            <p className="text-gray-600 mb-4">Create voiceovers and background music</p>
            <Button variant="outline" className="border-emerald-600 text-emerald-600">
              Create Audio
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;
