import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { 
  BarChart3, Files, Settings, Users, Crown, Puzzle, Bot, 
  Megaphone, UserCheck, ClipboardList, Briefcase, Sparkles
} from 'lucide-react';
import { useFolderNavigation } from "@/hooks/useFolderNavigation";
import { useBoxOAuth } from "@/hooks/useBoxOAuth";
import { toast } from 'sonner';

const Agents = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { subscriptionStatus } = useSubscriptionStatus();
  const { currentPath, openFolders, toggleFolder } = useFolderNavigation();
  const { isConnected: isBoxConnected } = useBoxOAuth();
  const [selectedFolder, setSelectedFolder] = React.useState('all');

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolder(folderId);
  };

  const handleFolderClick = (folderPath: string) => {
    toggleFolder(folderPath);
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  const handleFilesClick = () => {
    navigate('/files');
  };

  const handleAccountClick = () => {
    navigate('/account');
  };

  const handleTeamsClick = () => {
    navigate('/teams');
  };

  const handleIntegrationsClick = () => {
    navigate('/integrations');
  };

  const handleHireAgent = (agentName: string) => {
    toast.success(`Request to hire ${agentName} submitted! Our team will contact you shortly.`);
  };

  // Check if user has growth or scale subscription
  const isSubscribed = subscriptionStatus?.subscribed || false;
  const subscriptionTier = subscriptionStatus?.subscription_tier || 'free';
  const canAccessTeams = isSubscribed && (subscriptionTier === 'growth' || subscriptionTier === 'scale');
  
  const isOnAgents = location.pathname === '/agents';

  const agents = [
    {
      name: "Marketing Agent",
      icon: Megaphone,
      description: "Automate your marketing campaigns with AI-powered social media management and cold email outreach.",
      features: [
        "Social media content creation and scheduling",
        "Cold email campaign management",
        "Performance analytics and optimization",
        "Multi-platform posting automation"
      ],
      color: "from-pink-500 to-rose-500"
    },
    {
      name: "Sales Agent",
      icon: UserCheck,
      description: "Enhance your sales cycle with intelligent user onboarding and customer engagement automation.",
      features: [
        "Automated lead qualification",
        "Smart onboarding workflows",
        "Customer engagement tracking",
        "Sales pipeline optimization"
      ],
      color: "from-blue-500 to-cyan-500"
    },
    {
      name: "Project Manager Agent",
      icon: ClipboardList,
      description: "Streamline project workflows with intelligent task management and team communication.",
      features: [
        "Daily task assignment and tracking",
        "Team communication automation",
        "Project timeline management",
        "Progress reporting and insights"
      ],
      color: "from-purple-500 to-violet-500"
    },
    {
      name: "Executive Assistant Agent",
      icon: Briefcase,
      description: "Empower executives with AI-driven schedule management and administrative support.",
      features: [
        "Calendar and meeting management",
        "Task prioritization and reminders",
        "Email triage and responses",
        "Research and information gathering"
      ],
      color: "from-amber-500 to-orange-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      <Header />
      <div className="flex">
        <Sidebar 
          selectedFolder={selectedFolder}
          onFolderSelect={handleFolderSelect}
          onFolderClick={handleFolderClick}
          openFolders={openFolders}
        />
        <main className="flex-1 p-6 ml-64">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-foreground">AI Agents</h1>
                  <Badge variant="secondary" className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Premium Add-on
                  </Badge>
                </div>
                <p className="text-muted-foreground">Hire proprietary AI agents to automate your business operations</p>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handleDashboardClick}
                  variant="outline"
                  className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                <Button
                  onClick={handleFilesClick}
                  variant="outline"
                  className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
                >
                  <Files className="w-4 h-4 mr-2" />
                  IPFS Files
                </Button>
                <Button
                  onClick={handleIntegrationsClick}
                  variant="outline"
                  className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
                >
                  <Puzzle className="w-4 h-4 mr-2" />
                  Integrations
                </Button>
                {canAccessTeams && (
                  <Button
                    onClick={handleTeamsClick}
                    variant="outline"
                    className="bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/50"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Teams
                    {subscriptionTier === 'growth' && (
                      <Crown className="w-3 h-3 ml-1 text-yellow-500" />
                    )}
                  </Button>
                )}
                <Button
                  variant={isOnAgents ? "default" : "outline"}
                  className={isOnAgents 
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                    : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
                  }
                >
                  <Bot className="w-4 h-4 mr-2" />
                  Agents
                </Button>
                <Button
                  onClick={handleAccountClick}
                  variant="outline"
                  className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Account
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {agents.map((agent, index) => {
                const Icon = agent.icon;
                return (
                  <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300 group">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-lg bg-gradient-to-br ${agent.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-xl text-foreground">{agent.name}</CardTitle>
                            <Badge variant="outline" className="mt-1 text-xs">
                              AI-Powered
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <CardDescription className="mt-3 text-muted-foreground">
                        {agent.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3">Key Features:</h4>
                        <ul className="space-y-2">
                          {agent.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${agent.color} mt-1.5 flex-shrink-0`} />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Button 
                        onClick={() => handleHireAgent(agent.name)}
                        className={`w-full bg-gradient-to-r ${agent.color} hover:opacity-90 text-white shadow-lg`}
                      >
                        <Bot className="w-4 h-4 mr-2" />
                        Hire {agent.name}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/30">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Premium Agent Subscription
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Our AI agents are available as premium add-ons to your existing subscription. Each agent can be hired individually or as a bundle for maximum value.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                  <p>Pricing starts at $299/month per agent</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                  <p>Bundle all 4 agents for $999/month (save $197/month)</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                  <p>30-day free trial available for all new agent subscriptions</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                  <p>Cancel anytime, no long-term commitment required</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Agents;
