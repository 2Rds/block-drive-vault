import React, { useState } from 'react';
import { DocsSidebar } from '@/components/docs/DocsSidebar';
import { DocsContent } from '@/components/docs/DocsContent';

export const Docs = () => {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <div className="min-h-screen bg-background flex">
      <DocsSidebar 
        activeSection={activeSection}
        onSectionClick={setActiveSection}
      />
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          <DocsContent activeSection={activeSection} />
        </div>
      </div>
    </div>
  );
};

export default Docs;