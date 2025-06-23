
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
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">BlockDrive</h1>
          </div>
          <Button 
            variant="outline" 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-blue-600 hover:border-purple-600 rounded-xl px-6"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Connect Wallet
          </Button>
        </div>
      </header>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-white mb-4">
              Secure Web3 Storage
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Without Slippage
              </span>
            </h2>
            <p className="text-gray-300 text-lg">
              BlockDrive creates a secure environment for storing your files with blockchain-verified ownership tokens.
            </p>
          </div>

          <Card className="bg-gray-800/60 backdrop-blur-sm border-gray-700 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-semibold text-white">Get Started</CardTitle>
              <CardDescription className="text-gray-300">
                Create your account and Web3 wallet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-700/50 p-1 rounded-xl">
                  <TabsTrigger 
                    value="signin" 
                    className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-gray-300"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup" 
                    className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-gray-300"
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
                        className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 rounded-xl pr-12"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-12 px-3 text-gray-400 hover:text-gray-200"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Signing In...' : 'Explore Order Book →'}
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
                        className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      <Input
                        type="text"
                        placeholder="Choose a username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 rounded-xl pr-12"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-12 px-3 text-gray-400 hover:text-gray-200"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-white">Select Blockchain</label>
                      <Select value={formData.blockchainType} onValueChange={(value: any) => setFormData({ ...formData, blockchainType: value })}>
                        <SelectTrigger className="h-12 bg-gray-700/50 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500 rounded-xl">
                          <SelectValue placeholder="Choose blockchain" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600 rounded-xl">
                          {blockchainOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-white hover:bg-gray-700 rounded-lg m-1">
                              <div className="flex items-center space-x-3">
                                <span className="text-lg">{option.icon}</span>
                                <div>
                                  <div className="font-medium text-white">{option.label}</div>
                                  <div className="text-xs text-gray-400">{option.description}</div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="bg-gray-700/30 border border-gray-600 rounded-xl p-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-1 bg-purple-600/20 rounded-lg">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="text-sm">
                          <p className="font-medium text-white mb-1">Automatic Wallet Creation</p>
                          <p className="text-gray-300">A secure Web3 wallet will be automatically generated for your account on the selected blockchain.</p>
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating Account...' : 'Create Trade'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
