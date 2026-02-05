import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

function BackButton({ onClick }: { onClick: () => void }): JSX.Element {
  return (
    <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-4 z-10">
      <Button variant="ghost" size="sm" onClick={onClick} className="flex items-center gap-2 hover:bg-muted">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>
    </div>
  );
}

export function TermsOfService(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <BackButton onClick={() => navigate(-1)} />
      
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
          <p className="text-muted-foreground text-lg mb-8">Last updated: December 2024</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using BlockDrive's services, you accept and agree to be bound by the terms and provision of this agreement. 
              If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Service Description</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              BlockDrive provides a Web3 data management platform that includes:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Decentralized file storage using IPFS technology</li>
              <li>Blockchain authentication and wallet integration</li>
              <li>Team collaboration and file sharing features</li>
              <li>Enterprise-grade security and encryption</li>
              <li>Integration with third-party cloud storage services</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. User Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Users are responsible for:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Maintaining the confidentiality of their wallet credentials and authentication information</li>
              <li>All activities that occur under their account</li>
              <li>Ensuring uploaded content complies with applicable laws and regulations</li>
              <li>Not uploading malicious, copyrighted, or illegal content</li>
              <li>Using the service in accordance with all applicable laws and regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Privacy and Data Protection</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, 
              which is incorporated into these Terms of Service by reference.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              Users retain ownership of their uploaded content. BlockDrive retains ownership of its platform, technology, 
              and intellectual property. Users grant BlockDrive a limited license to store, process, and transmit their content 
              solely for the purpose of providing the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              While we strive to maintain high availability, BlockDrive does not guarantee uninterrupted service. 
              We may perform maintenance, updates, or experience technical difficulties that temporarily affect service availability.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              BlockDrive shall not be liable for any indirect, incidental, special, or consequential damages arising out of 
              or in connection with the use of our services, including but not limited to data loss, business interruption, 
              or loss of profits.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              Either party may terminate this agreement at any time. Upon termination, your right to use the service ceases immediately. 
              BlockDrive reserves the right to terminate accounts that violate these terms or engage in prohibited activities.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              BlockDrive reserves the right to modify these terms at any time. Users will be notified of significant changes, 
              and continued use of the service constitutes acceptance of the modified terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms of Service, please contact us at legal@blockdrive.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};