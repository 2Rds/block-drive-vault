import React from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { PageHeader } from './PageHeader';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface AppShellProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function AppShell({
  children,
  title,
  description,
  breadcrumbs,
  actions,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <AppHeader />

      {/* Main Content */}
      <main className="ml-sidebar pt-16 min-h-screen">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <PageHeader
              title={title}
              description={description}
              breadcrumbs={breadcrumbs}
              actions={actions}
            />
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
