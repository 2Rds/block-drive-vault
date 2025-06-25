
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UserPlus } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';

interface SignupFormProps {
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export const SignupForm = ({ form, onSubmit, isSubmitting }: SignupFormProps) => {
  return (
    <Card className="bg-gray-900/60 backdrop-blur-sm border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <UserPlus className="w-5 h-5 mr-2" />
          Request Authentication Token
        </CardTitle>
        <CardDescription className="text-gray-300">
          Complete your details to receive your authentication token
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField 
              control={form.control} 
              name="fullName" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Full Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your full name" 
                      className="bg-gray-800 border-gray-700 text-white" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} 
            />
            
            <FormField 
              control={form.control} 
              name="email" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="Enter your email" 
                      className="bg-gray-800 border-gray-700 text-white" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} 
            />

            <FormField 
              control={form.control} 
              name="organization" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Organization (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Company or organization" 
                      className="bg-gray-800 border-gray-700 text-white" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} 
            />

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white border-0"
            >
              {isSubmitting ? 'Sending...' : 'Get Authentication Token'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
