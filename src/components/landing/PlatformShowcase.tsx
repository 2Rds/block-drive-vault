import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Upload, Eye, Download, Share } from 'lucide-react';

export const PlatformShowcase = () => {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left side - Content */}
          <div>
            <h2 className="text-4xl font-bold text-foreground mb-6">
              See BlockDrive in action
            </h2>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Experience the power of decentralized storage with our intuitive dashboard. 
              Upload, manage, and share files with enterprise-grade security.
            </p>

            <div className="space-y-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Drag & Drop Upload</h4>
                  <p className="text-sm text-muted-foreground">Upload files instantly to IPFS</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Real-time Preview</h4>
                  <p className="text-sm text-muted-foreground">View files without downloading</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Share className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Secure Sharing</h4>
                  <p className="text-sm text-muted-foreground">Share with wallet-based permissions</p>
                </div>
              </div>
            </div>

            <Button size="lg" className="text-lg px-8">
              Try the Platform
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Right side - Dashboard Preview */}
          <div className="relative">
            <Card className="overflow-hidden border-border/50 shadow-2xl">
              <CardContent className="p-0">
                {/* Mock dashboard header */}
                <div className="bg-card border-b border-border/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <div className="w-4 h-4 bg-primary rounded" />
                      </div>
                      <span className="font-semibold text-foreground">BlockDrive</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Good afternoon, User
                    </div>
                  </div>
                </div>

                {/* Mock dashboard content */}
                <div className="p-6 bg-background">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-card border border-border/50">
                      <div className="text-2xl font-bold text-primary">127</div>
                      <div className="text-sm text-muted-foreground">Files Stored</div>
                    </div>
                    <div className="p-4 rounded-lg bg-card border border-border/50">
                      <div className="text-2xl font-bold text-primary">2.4 GB</div>
                      <div className="text-sm text-muted-foreground">Total Storage</div>
                    </div>
                  </div>

                  {/* Mock file list */}
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-foreground mb-3">Recent Files</div>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/30">
                        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                          <div className="w-5 h-5 bg-primary/50 rounded" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">document-{i}.pdf</div>
                          <div className="text-xs text-muted-foreground">2 hours ago</div>
                        </div>
                        <Download className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};