import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocsSidebar } from '@/components/docs/DocsSidebar';
import { DocsContent } from '@/components/docs/DocsContent';

export function Docs(): JSX.Element {
  const [activeSection, setActiveSection] = useState('overview');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex">
      <DocsSidebar activeSection={activeSection} onSectionClick={setActiveSection} />

      <div className="flex-1 overflow-auto">
        <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-4 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
        <div className="max-w-4xl mx-auto p-8">
          <DocsContent activeSection={activeSection} />
        </div>
      </div>
    </div>
  );
}

export default Docs;