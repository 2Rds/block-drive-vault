import { useEffect, useRef, useState } from 'react';

interface Stat {
  value: string;
  numericValue?: number;
  suffix?: string;
  prefix?: string;
  label: string;
  sublabel: string;
}

const stats: Stat[] = [
  { value: '256', numericValue: 256, suffix: '-bit', label: 'AES Encryption', sublabel: 'Military-grade symmetric encryption' },
  { value: '4', numericValue: 4, label: 'Storage Providers', sublabel: 'Filebase, R2, S3, Arweave' },
  { value: '99.99', numericValue: 99.99, suffix: '%', label: 'Uptime SLA', sublabel: 'Multi-provider redundancy' },
  { value: '<50', prefix: '<', numericValue: 50, suffix: 'ms', label: 'Global Latency', sublabel: 'Cloudflare edge network' },
  { value: 'SOL', label: 'Solana Powered', sublabel: 'Embedded wallets + on-chain registry' },
  { value: '0', numericValue: 0, label: 'Useful Data Exposed', sublabel: 'Breached data is incomplete, worthless' },
];

export const StatsSection = () => {
  return (
    <section id="security" className="py-24 relative">
      {/* Subtle horizontal rule accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] max-w-4xl h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-6">
          {stats.map((stat, i) => (
            <StatBlock key={i} stat={stat} index={i} />
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] max-w-4xl h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
    </section>
  );
};

function StatBlock({ stat, index }: { stat: Stat; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="text-center space-y-2 opacity-0 translate-y-4 transition-all duration-700 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transitionDelay: `${index * 80}ms`,
      }}
    >
      <div className="font-mono text-3xl md:text-4xl font-bold text-foreground tracking-tight">
        {stat.prefix}
        {stat.value}
        {stat.suffix && <span className="text-primary">{stat.suffix}</span>}
      </div>
      <div className="text-sm font-medium text-foreground">{stat.label}</div>
      <div className="text-xs text-muted-foreground">{stat.sublabel}</div>
    </div>
  );
}
