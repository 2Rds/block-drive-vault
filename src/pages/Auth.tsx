
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, Shield, Database, Eye, EyeOff, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    blockchainType: 'solana' as 'solana' | 'ethereum' | 'ton'
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(formData.email, formData.password);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
      navigate('/');
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signUp(
        formData.email, 
        formData.password, 
        formData.username, 
        formData.blockchainType
      );
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Account created! Please check your email to verify your account.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    }
    
    setIsLoading(false);
  };

  const blockchainOptions = [
    { value: 'solana', label: 'Solana', description: 'Fast and low-cost transactions', icon: '⚡' },
    { value: 'ethereum', label: 'Ethereum', description: 'Most popular smart contract platform', icon: '💎' },
    { value: 'ton', label: 'TON', description: 'Telegram Open Network blockchain', icon: '🚀' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Database className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">BlockDrive</h1>
          <p className="text-gray-600">Secure Web3 decentralized storage platform</p>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Get Started</CardTitle>
            <CardDescription className="text-gray-600">
              Create your account and Web3 wallet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-xl">
                <TabsTrigger 
                  value="signin" 
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="mt-6">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl pr-12"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-12 px-3 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium shadow-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <Input
                      type="text"
                      placeholder="Choose a username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl pr-12"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-12 px-3 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-900">Select Blockchain</label>
                    <Select value={formData.blockchainType} onValueChange={(value: any) => setFormData({ ...formData, blockchainType: value })}>
                      <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl">
                        <SelectValue placeholder="Choose blockchain" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-xl rounded-xl">
                        {blockchainOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="hover:bg-gray-50 rounded-lg m-1">
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{option.icon}</span>
                              <div>
                                <div className="font-medium text-gray-900">{option.label}</div>
                                <div className="text-xs text-gray-500">{option.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-1 bg-blue-100 rounded-lg">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-blue-900 mb-1">Automatic Wallet Creation</p>
                        <p className="text-blue-700">A secure Web3 wallet will be automatically generated for your account on the selected blockchain.</p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium shadow-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account & Wallet'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
