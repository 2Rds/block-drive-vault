
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, Shield, Database, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { createWalletForUser } from '@/services/walletService';
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
      toast.success('Successfully signed in!');
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
    { value: 'solana', label: 'Solana', description: 'Fast and low-cost transactions' },
    { value: 'ethereum', label: 'Ethereum', description: 'Most popular smart contract platform' },
    { value: 'ton', label: 'TON', description: 'Telegram Open Network blockchain' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">BlockDrive</CardTitle>
          <CardDescription className="text-gray-300">
            Secure Web3 decentralized storage platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/10">
              <TabsTrigger value="signin" className="text-white data-[state=active]:bg-purple-600">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="text-white data-[state=active]:bg-purple-600">
                Sign Up
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                    required
                  />
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                    required
                  />
                </div>
                <div>
                  <Input
                    type="text"
                    placeholder="Username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                    required
                  />
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Choose Blockchain</label>
                  <Select value={formData.blockchainType} onValueChange={(value: any) => setFormData({ ...formData, blockchainType: value })}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select blockchain" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/20">
                      {blockchainOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-white hover:bg-white/10">
                          <div className="flex items-center space-x-2">
                            <Wallet className="w-4 h-4" />
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-gray-400">{option.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <Shield className="w-4 h-4 text-blue-400 mt-0.5" />
                    <div className="text-xs text-blue-300">
                      <p className="font-medium mb-1">Automatic Wallet Creation</p>
                      <p>A secure Web3 wallet and unique access token will be automatically generated for your account on the selected blockchain.</p>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-purple-600 hover:bg-purple-700"
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
  );
};

export default Auth;
