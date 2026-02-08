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

export function PrivacyPolicy(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <BackButton onClick={() => navigate(-1)} />
      
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
          <p className="text-muted-foreground text-lg mb-8">Last updated: December 2024</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We collect information to provide and improve our services:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Wallet Information:</strong> Public wallet addresses and transaction data for authentication</li>
              <li><strong>Account Data:</strong> Email addresses, profile information, and account preferences</li>
              <li><strong>File Metadata:</strong> File names, sizes, upload timestamps, and sharing permissions</li>
              <li><strong>Usage Analytics:</strong> Service usage patterns, feature adoption, and performance metrics</li>
              <li><strong>Technical Data:</strong> IP addresses, browser information, and device identifiers</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Your information is used to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Authenticate and verify user identity through blockchain technology</li>
              <li>Store and manage your files securely on IPFS and cloud platforms</li>
              <li>Enable team collaboration and file sharing features</li>
              <li>Provide customer support and technical assistance</li>
              <li>Improve our services and develop new features</li>
              <li>Ensure platform security and prevent fraud</li>
              <li>Comply with legal obligations and regulatory requirements</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Data Storage and Security</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We implement enterprise-grade security measures:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Encryption:</strong> All data is encrypted in transit and at rest using AES-256 encryption</li>
              <li><strong>Decentralized Storage:</strong> Files are stored on IPFS for decentralized, tamper-proof storage</li>
              <li><strong>Access Controls:</strong> Multi-layered authentication and authorization systems</li>
              <li><strong>Regular Audits:</strong> Ongoing security assessments and vulnerability testing</li>
              <li><strong>Data Redundancy:</strong> Multiple backup systems to ensure data availability</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We do not sell your personal information. We may share data in limited circumstances:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>With Your Consent:</strong> When you explicitly authorize data sharing</li>
              <li><strong>Service Providers:</strong> Third-party services that help us operate our platform</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
              <li><strong>Business Transfers:</strong> In case of merger, acquisition, or asset sale</li>
              <li><strong>Team Collaboration:</strong> Shared files within your organization or invited teams</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Your Rights and Choices</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Access:</strong> Request access to your personal information</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal requirements)</li>
              <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Account Control:</strong> Manage privacy settings and data sharing preferences</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar technologies to enhance user experience, analyze usage patterns, 
              and maintain user sessions. You can control cookie preferences through your browser settings, 
              though some features may not function properly if cookies are disabled.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data may be transferred to and processed in countries other than your own. 
              We ensure appropriate safeguards are in place to protect your information in accordance 
              with applicable data protection laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your information for as long as necessary to provide our services and comply with legal obligations. 
              When you delete your account, we will delete or anonymize your personal information, 
              except where retention is required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibent text-foreground mb-4">9. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our services are not intended for users under 18 years of age. We do not knowingly collect 
              personal information from children under 18. If we become aware of such collection, 
              we will take steps to delete the information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy periodically. We will notify you of significant changes 
              through email or platform notifications. Continued use of our services after changes 
              constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about this Privacy Policy or to exercise your rights, contact us at:
              <br />
              Email: privacy@blockdrive.com
              <br />
              Address: BlockDrive Privacy Office, [Company Address]
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};