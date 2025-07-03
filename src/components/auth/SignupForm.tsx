
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
    <Card className="bg-card/40 border-border">
      <CardHeader>
        <CardTitle className="text-card-foreground flex items-center">
          <UserPlus className="w-5 h-5 mr-2 text-primary" />
          Create Your BlockDrive Account
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Sign up to get your own blockdrive.sol subdomain and start using decentralized storage
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
                  <FormLabel className="text-card-foreground">Full Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your full name" 
                      className="bg-background border-border text-foreground" 
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
                  <FormLabel className="text-card-foreground">Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="Enter your email" 
                      className="bg-background border-border text-foreground" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} 
            />

            <FormField 
              control={form.control} 
              name="password" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-card-foreground">Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Create a secure password" 
                      className="bg-background border-border text-foreground" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} 
            />

            <FormField 
              control={form.control} 
              name="solanaSubdomain" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-card-foreground">BlockDrive Subdomain</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <Input 
                        placeholder="username" 
                        className="bg-background border-border text-foreground rounded-r-none" 
                        {...field} 
                      />
                      <span className="bg-muted px-3 py-2 border border-l-0 border-border rounded-r-md text-muted-foreground">
                        .blockdrive.sol
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    This will be your unique Solana domain for BlockDrive
                  </p>
                </FormItem>
              )} 
            />

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account & Register Domain'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
