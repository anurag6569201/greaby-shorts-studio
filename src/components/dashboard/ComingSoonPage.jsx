import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowLeft } from 'lucide-react';

const ComingSoonPage = ({ featureName, featureDescription, onBack }) => {
  return (
    <div className="flex flex-col space-y-8">
      <Card className="bg-transparent shadow-none border-none">
        <CardHeader className="p-0">
          <CardTitle className="flex items-center text-2xl"><Sparkles className="h-6 w-6 mr-3 text-primary" />Coming Soon!</CardTitle>
          <CardDescription>
            We're putting the final touches on the <strong>{featureName}</strong> feature.
          </CardDescription>
        </CardHeader>
        <hr className="my-4" />
        <CardContent className="space-y-6 p-0">
          <p className="text-muted-foreground">
            {featureDescription}
          </p>
          <div className="mt-6">
            <Button onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back to Home
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-8">
            Stay tuned for updates. We can't wait for you to try it!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComingSoonPage;