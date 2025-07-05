
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Mail, User, Building } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { SignupService } from '@/services/signupService';
import { toast } from 'sonner';

interface EmailSignupFormProps {
  onSuccess: (data: any) => void;
  onCancel?: () => void;
}

interface FormData {
  email: string;
  fullName: string;
  organization: string;
}

export const EmailSignupForm = ({ onSuccess, onCancel }: EmailSignupFormProps) => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    fullName: '',
    organization: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.fullName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await SignupService.registerUser({
        email: formData.email,
        fullName: formData.fullName,
        organization: formData.organization,
        subscriptionTier: 'free_trial'
      });

      if (result.error) {
        toast.error(result.error.message);
        setIsSubmitting(false);
        return;
      }

      toast.success('Registration successful! Please choose your subscription tier.');
      onSuccess(result.data);
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error('Registration failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-gray-900/60 backdrop-blur-sm border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Mail className="w-5 h-5 mr-2" />
          Complete Your Registration
        </CardTitle>
        <CardDescription className="text-gray-300">
          Provide your details to access BlockDrive's decentralized storage
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-gray-300 text-sm font-medium">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-gray-300 text-sm font-medium">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-gray-300 text-sm font-medium">
              Organization (Optional)
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Company or organization"
                value={formData.organization}
                onChange={(e) => handleInputChange('organization', e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white border-0"
            >
              {isSubmitting ? 'Registering...' : 'Continue'}
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
        </form>
      </CardContent>
    </Card>
  );
};
