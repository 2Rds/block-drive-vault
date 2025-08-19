import React from 'react';
import { Shield, Zap, Globe, Lock, Users, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';

const features = [
  {
    icon: Shield,
    title: 'Secure by Design',
    description: 'Military-grade encryption ensures your data remains private and secure at all times.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Optimized performance with global CDN distribution for instant file access anywhere.',
  },
  {
    icon: Globe,
    title: 'Decentralized Storage',
    description: 'IPFS integration provides permanent, censorship-resistant storage for your files.',
  },
  {
    icon: Lock,
    title: 'End-to-End Encryption',
    description: 'Your files are encrypted before upload and only you hold the decryption keys.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Share files securely with your team using advanced permission management.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Track usage, monitor performance, and gain insights into your data management.',
  },
];

export const FeatureSection = () => {
  return (
    <section className="py-24 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Why Choose <span className="text-primary">BlockDrive</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Our platform solves the key challenges of data management in the Web3 era, 
            providing security, transparency, and performance for all users.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="p-8 bg-card/50 backdrop-blur-sm border border-border hover:bg-card/70 transition-all duration-300 group">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};