
import React from 'react';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PricingButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export const PricingButton: React.FC<PricingButtonProps> = ({ 
  variant = 'outline', 
  size = 'default', 
  className = '',
  children 
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/pricing');
  };

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      className={`${className} bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50`}
    >
      <Crown className="w-4 h-4 mr-2" />
      {children || 'View Pricing'}
    </Button>
  );
};
