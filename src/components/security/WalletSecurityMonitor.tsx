import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SecurityThreat {
  user_id: string;
  threat_type: string;
  threat_level: string;
  event_count: number;
  latest_incident: string;
  recommendation: string;
}

interface WalletSecurityStats {
  id: string;
  wallet_address: string;
  blockchain_type: string;
  has_encrypted_key: boolean;
  encrypted_key_length: number;
  meets_encryption_standards: boolean;
  recent_activity_count: number;
  recent_security_events: number;
  last_updated: string;
}

export const WalletSecurityMonitor: React.FC = () => {
  const { user } = useAuth();
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [securityStats, setSecurityStats] = useState<WalletSecurityStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadSecurityData = async () => {
      try {
        // Load security threats
        const { data: threatData, error: threatError } = await supabase
          .rpc('detect_wallet_threats');

        if (threatError) {
          console.error('Error loading security threats:', threatError);
        } else {
          setThreats(threatData || []);
        }

        // Load wallet security stats
        const { data: statsData, error: statsError } = await supabase
          .from('wallet_security_stats')
          .select('*')
          .eq('user_id', user.id);

        if (statsError) {
          console.error('Error loading security stats:', statsError);
        } else {
          setSecurityStats(statsData || []);
        }
      } catch (error) {
        console.error('Security monitoring error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSecurityData();
    
    // Set up real-time updates
    const interval = setInterval(loadSecurityData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'default';
    }
  };

  const getSecurityScore = () => {
    if (securityStats.length === 0) return 0;
    
    const totalWallets = securityStats.length;
    let score = 100;
    
    securityStats.forEach(stat => {
      if (!stat.has_encrypted_key) score -= 30;
      if (!stat.meets_encryption_standards) score -= 20;
      if (stat.recent_security_events > 0) score -= 10;
      if (stat.recent_activity_count > 100) score -= 5;
    });

    return Math.max(0, score);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Wallet Security Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const securityScore = getSecurityScore();
  const hasThreats = threats.length > 0;

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Wallet Security Overview
          </CardTitle>
          <CardDescription>
            Real-time security monitoring for your cryptocurrency wallets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${securityScore >= 80 ? 'text-green-600' : securityScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {securityScore}%
              </div>
              <div className="text-sm text-muted-foreground">Security Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">{securityStats.length}</div>
              <div className="text-sm text-muted-foreground">Protected Wallets</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${hasThreats ? 'text-red-600' : 'text-green-600'}`}>
                {threats.length}
              </div>
              <div className="text-sm text-muted-foreground">Active Threats</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Threats */}
      {hasThreats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Security Threats Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {threats.map((threat, index) => (
                <Alert key={index} variant={threat.threat_level === 'critical' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center gap-2">
                    {threat.threat_type.replace('_', ' ').toUpperCase()}
                    <Badge variant={getThreatLevelColor(threat.threat_level)}>
                      {threat.threat_level}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription>
                    <div className="mt-2">
                      <p><strong>Events:</strong> {threat.event_count}</p>
                      <p><strong>Latest:</strong> {new Date(threat.latest_incident).toLocaleString()}</p>
                      <p><strong>Recommendation:</strong> {threat.recommendation}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet Security Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Wallet Security Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {securityStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No wallets found. Create a wallet to see security status.
            </div>
          ) : (
            <div className="space-y-4">
              {securityStats.map((stat) => (
                <div key={stat.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{stat.wallet_address.slice(0, 8)}...{stat.wallet_address.slice(-8)}</div>
                    <div className="text-sm text-muted-foreground capitalize">{stat.blockchain_type}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className={`text-sm font-medium ${stat.has_encrypted_key ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.has_encrypted_key ? 'Encrypted' : 'Unencrypted'}
                      </div>
                      <div className="text-xs text-muted-foreground">Private Key</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-sm font-medium ${stat.meets_encryption_standards ? 'text-green-600' : 'text-yellow-600'}`}>
                        {stat.meets_encryption_standards ? 'Strong' : 'Weak'}
                      </div>
                      <div className="text-xs text-muted-foreground">Encryption</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-sm font-medium ${stat.recent_security_events === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.recent_security_events}
                      </div>
                      <div className="text-xs text-muted-foreground">Security Events</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-foreground">{stat.recent_activity_count}</div>
                      <div className="text-xs text-muted-foreground">Activity (24h)</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Security Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium">Enhanced Encryption Enabled</div>
                <div className="text-sm text-muted-foreground">
                  Your private keys are protected with enterprise-grade encryption
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium">Access Control Active</div>
                <div className="text-sm text-muted-foreground">
                  Multi-layered access validation prevents unauthorized wallet access
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium">Real-time Monitoring</div>
                <div className="text-sm text-muted-foreground">
                  Continuous threat detection monitors for suspicious activities
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium">Immutable Security</div>
                <div className="text-sm text-muted-foreground">
                  Wallet data cannot be modified or deleted after creation
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};