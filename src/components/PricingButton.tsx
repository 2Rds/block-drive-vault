
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
  variant = 'default', 
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
      className={`${className} bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 hover:from-blue-700 hover:via-blue-600 hover:to-purple-700 text-white border-0`}
    >
      <Crown className="w-4 h-4 mr-2" />
      {children || 'View Pricing'}
    </Button>
  );
};
