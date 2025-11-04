
import React from 'react';
import { Slack, Cloud, HardDrive, Box, Anchor } from 'lucide-react';

interface SidebarIntegrationsProps {
  onSlackClick?: () => void;
  onOneDriveClick?: () => void;
  onGoogleDriveClick?: () => void;
  onBoxClick?: () => void;
  onOpenSeaClick?: () => void;
}

export const SidebarIntegrations = ({
  onSlackClick,
  onOneDriveClick,
  onGoogleDriveClick,
  onBoxClick,
  onOpenSeaClick
}: SidebarIntegrationsProps) => {
  const integrations = [
    {
      id: 'slack',
      name: 'Slack',
      icon: Slack,
      color: 'text-blue-400',
      onClick: onSlackClick
    },
    {
      id: 'onedrive',
      name: 'OneDrive',
      icon: Cloud,
      color: 'text-blue-600',
      onClick: onOneDriveClick
    },
    {
      id: 'googledrive',
      name: 'Google Drive',
      icon: HardDrive,
      color: 'text-green-500',
      onClick: onGoogleDriveClick
    },
    {
      id: 'box',
      name: 'Dropbox',
      icon: Box,
      color: 'text-blue-500',
      onClick: onBoxClick
    },
    {
      id: 'opensea',
      name: 'OpenSea',
      icon: Anchor,
      color: 'text-cyan-500',
      onClick: onOpenSeaClick
    }
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-4">Integrations</h3>
      <div className="space-y-2">
        {integrations.map((integration) => (
          <button
            key={integration.id}
            onClick={integration.onClick}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all hover:scale-[1.02] text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border/50 hover:border-primary/30"
          >
            <integration.icon className={`w-5 h-5 ${integration.color}`} />
            <span className="text-sm font-medium">{integration.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
