
import React from 'react';
import { Button } from '@/components/ui/button';

export const AuthHero = () => {
  return (
    <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[600px]">
      {/* Left Side - Hero Content */}
      <div className="space-y-8">
        <div className="text-sm text-primary font-medium">
          Web3 Data Management Platform
        </div>
        
        <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
          Store Your Data{' '}
          <span className="text-primary">Securely</span>{' '}
          Without Centralization
        </h1>
        
        <p className="text-lg text-muted-foreground max-w-lg">
          BlockDrive creates a secure environment for storing and managing your data 
          with decentralized infrastructure, eliminating single points of failure 
          and ensuring complete ownership control.
        </p>
        
        <div className="flex gap-4">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Explore Dashboard →
          </Button>
          <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-muted">
            Create Account
          </Button>
        </div>
      </div>
      
      {/* Right Side - Featured Files Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-foreground">Featured Files</h3>
        </div>
        
        <div className="space-y-4">
          {[
            { name: 'PROJECT', size: '2.5MB', type: 'Document', badge: 'Team' },
            { name: 'DATASET', size: '15.7MB', type: 'Data', badge: 'Private' },
            { name: 'BACKUP', size: '834KB', type: 'Archive', badge: 'Secure' }
          ].map((file, index) => (
            <div key={index} className="bg-card border border-border rounded-lg p-4 hover:bg-card/80 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold text-sm">
                      {file.name.substring(0, 2)}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{file.name}</div>
                    <div className="text-sm text-muted-foreground">{file.size} • {file.type}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
                    {file.badge}
                  </span>
                  <Button size="sm" variant="ghost" className="text-primary hover:text-primary/80">
                    View
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <button className="text-primary hover:text-primary/80 text-sm font-medium">
          View all files →
        </button>
      </div>
    </div>
  );
};
