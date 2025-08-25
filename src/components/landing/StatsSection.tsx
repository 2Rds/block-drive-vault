import React from 'react';

const stats = [
  { number: "99.9%", label: "Uptime", description: "Enterprise SLA guaranteed" },
  { number: "150+", label: "Countries", description: "Global edge network" },
  { number: "50+", label: "Wallet Types", description: "Multi-chain support" }
];

export const StatsSection = () => {
  return (
    <section className="py-16 bg-primary/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {stat.number}
              </div>
              <div className="text-lg font-semibold text-foreground mb-1">
                {stat.label}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};