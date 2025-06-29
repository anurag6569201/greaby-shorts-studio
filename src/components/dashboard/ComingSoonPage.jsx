import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowLeft } from 'lucide-react';

const ComingSoonPage = ({ featureName, featureDescription, onBack }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <Card className="max-w-md w-full p-4 sm:p-6">
        <CardHeader>
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="mt-4 text-2xl sm:text-3xl font-bold">Coming Soon!</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            We're putting the final touches on the <strong>{featureName}</strong> feature.
          </CardDescription>
        </CardHeader>
        <CardContent>
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