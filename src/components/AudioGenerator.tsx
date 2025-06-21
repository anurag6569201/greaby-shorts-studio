
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Play, Download, Music, Volume2 } from "lucide-react";

const AudioGenerator = () => {
  const [script, setScript] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    voice: "female-calm",
    tone: "story",
    speed: "normal"
  });

  const handleGenerate = async () => {
    if (!script.trim()) return;
    
    setIsGenerating(true);
    console.log("Generating audio with:", { script, settings });
    
    // Simulate generation delay
    setTimeout(() => {
      setGeneratedAudio("generated-audio.mp3"); // Placeholder for generated audio
      setIsGenerating(false);
    }, 2000);
  };

  const voiceOptions = [
    { value: "male-energetic", label: "Male - Energetic" },
    { value: "male-calm", label: "Male - Calm" },
    { value: "female-energetic", label: "Female - Energetic" },
    { value: "female-calm", label: "Female - Calm" },
  ];

  const toneOptions = [
    { value: "story", label: "Story" },
    { value: "ad", label: "Advertisement" },
    { value: "documentary", label: "Documentary" },
    { value: "robotic", label: "Robotic" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Audio Generator</h1>
        <p className="text-gray-600">Create professional voiceovers and audio content</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Volume2 className="h-5 w-5 mr-2 text-purple-600" />
              Create Your Audio
            </CardTitle>
            <CardDescription>Enter your script and choose voice settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="script">Script</Label>
              <Textarea
                id="script"
                placeholder="Enter the text you want to convert to audio. This will be your video's voiceover or narration..."
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="min-h-32"
              />
              <p className="text-sm text-gray-500 mt-1">
                {script.length} characters
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Voice Style</Label>
                <Select value={settings.voice} onValueChange={(value) => setSettings({...settings, voice: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Audio Tone</Label>
                <Select value={settings.tone} onValueChange={(value) => setSettings({...settings, tone: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {toneOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Speed</Label>
                <Select value={settings.speed} onValueChange={(value) => setSettings({...settings, speed: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Slow</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="fast">Fast</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || !script.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-700 hover:to-emerald-700"
            >
              {isGenerating ? "Generating Audio..." : "Generate Audio"}
            </Button>
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card>
          <CardHeader>
            <CardTitle>Audio Preview</CardTitle>
            <CardDescription>Your generated audio will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            {isGenerating ? (
              <div className="aspect-square bg-gradient-to-br from-purple-100 to-emerald-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Generating your audio...</p>
                </div>
              </div>
            ) : generatedAudio ? (
              <div className="space-y-4">
                <div className="aspect-square bg-gradient-to-br from-purple-50 to-emerald-50 rounded-lg flex items-center justify-center border">
                  <div className="text-center">
                    <Music className="h-16 w-16 text-purple-600 mx-auto mb-4" />
                    <p className="font-medium text-gray-900">Audio Ready</p>
                    <p className="text-sm text-gray-600">Duration: ~{Math.ceil(script.length / 10)}s</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <Button size="sm" variant="outline">
                      <Play className="h-4 w-4 mr-2" />
                      Play
                    </Button>
                    <Button size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <Badge variant="secondary">{settings.voice}</Badge>
                    <Badge variant="secondary">{settings.tone}</Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <Music className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Enter a script and click generate to create your audio</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AudioGenerator;
