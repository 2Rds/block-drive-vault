// Stub - EmailSignupForm deprecated with Clerk auth
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

interface EmailSignupFormProps {
  onSuccess: (data: any) => void;
  onCancel?: () => void;
}

export const EmailSignupForm = ({ onSuccess, onCancel }: EmailSignupFormProps) => {
  // This form is deprecated - Clerk handles all signup flows
  React.useEffect(() => {
    console.warn('EmailSignupForm is deprecated. Use Clerk authentication.');
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto bg-gray-900/60 backdrop-blur-sm border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Mail className="w-5 h-5 mr-2" />
          Sign Up
        </CardTitle>
        <CardDescription className="text-gray-300">
          Please use the Clerk sign-up flow instead.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-400 mb-4">
          This signup form has been deprecated. Please use the new authentication system.
        </p>
        <div className="flex space-x-3">
          <Button
            onClick={() => window.location.href = '/sign-up'}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white border-0"
          >
            Go to Sign Up
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
