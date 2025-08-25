import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: "Sarah Chen",
    role: "CTO at DefiLabs",
    content: "BlockDrive revolutionized how we handle data storage. The multi-chain wallet integration saved us months of development time.",
    rating: 5,
    avatar: "SC"
  },
  {
    name: "Marcus Rodriguez", 
    role: "Lead Developer at NFT Studio",
    content: "The IPFS integration is seamless and the security features give us complete confidence in our data protection.",
    rating: 5,
    avatar: "MR"
  },
  {
    name: "Elena Vasquez",
    role: "Founder of Web3 Startup",
    content: "From prototype to production, BlockDrive scaled with us. The analytics dashboard provides insights we never had before.",
    rating: 5,
    avatar: "EV"
  }
];

export const TestimonialsSection = () => {
  return (
    <section className="py-24 bg-card/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Loved by developers worldwide
          </h2>
          <p className="text-xl text-muted-foreground">
            Join thousands of developers building the future of Web3
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-border/50 hover:border-primary/50 transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <blockquote className="text-muted-foreground mb-6 leading-relaxed">
                  "{testimonial.content}"
                </blockquote>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {testimonial.avatar}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};