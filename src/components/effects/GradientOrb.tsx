import { cn } from '@/lib/utils';

interface GradientOrbProps {
  className?: string;
  color?: 'blue' | 'purple' | 'cyan' | 'pink';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  animationDelay?: string;
}

const COLOR_CLASSES = {
  blue: 'from-blue-500/30 via-blue-600/20 to-transparent',
  purple: 'from-purple-500/30 via-purple-600/20 to-transparent',
  cyan: 'from-cyan-400/30 via-cyan-500/20 to-transparent',
  pink: 'from-pink-500/30 via-pink-600/20 to-transparent',
};

const SIZE_CLASSES = {
  sm: 'w-32 h-32',
  md: 'w-64 h-64',
  lg: 'w-96 h-96',
  xl: 'w-[500px] h-[500px]',
};

const BLUR_CLASSES = {
  sm: 'blur-2xl',
  md: 'blur-3xl',
  lg: 'blur-[100px]',
  xl: 'blur-[150px]',
};

export function GradientOrb({
  className,
  color = 'blue',
  size = 'lg',
  blur = 'lg',
  animate = true,
  animationDelay = '0s',
}: GradientOrbProps) {
  return (
    <div
      className={cn(
        'absolute rounded-full bg-gradient-radial pointer-events-none',
        COLOR_CLASSES[color],
        SIZE_CLASSES[size],
        BLUR_CLASSES[blur],
        animate && 'animate-float',
        className
      )}
      style={{
        animationDelay,
      }}
    />
  );
}

// Multiple orbs arranged as a background
interface GradientOrbsProps {
  className?: string;
}

export function GradientOrbs({ className }: GradientOrbsProps) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {/* Top left - blue */}
      <GradientOrb
        color="blue"
        size="xl"
        className="top-[-200px] left-[-100px]"
        animationDelay="0s"
      />

      {/* Top right - purple */}
      <GradientOrb
        color="purple"
        size="lg"
        className="top-[100px] right-[-50px]"
        animationDelay="2s"
      />

      {/* Center - cyan */}
      <GradientOrb
        color="cyan"
        size="md"
        className="top-[40%] left-[30%]"
        animationDelay="4s"
      />

      {/* Bottom - pink */}
      <GradientOrb
        color="pink"
        size="lg"
        className="bottom-[-100px] right-[20%]"
        animationDelay="1s"
      />
    </div>
  );
}
