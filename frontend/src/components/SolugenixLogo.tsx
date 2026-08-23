import React from 'react';
import { cn } from '@/lib/utils';

interface SolugenixLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  textClassName?: string;
}

export function SolugenixIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      {/* Left / Lower Shape - Royal Blue */}
      <path
        d="M 82 4
           L 10 126
           L 64 116
           L 57 158
           Q 54 166 62 164
           L 96 157
           Q 104 156 106 148
           L 112 114
           Q 114 106 106 108
           L 64 116
           L 82 4 Z"
        fill="url(#solugenix-left-blue)"
      />

      {/* Right / Upper Shape - Bright Electric Sky Blue / Cyan */}
      <path
        d="M 118 196
           L 190 74
           L 136 84
           L 143 42
           Q 146 34 138 36
           L 104 43
           Q 96 44 94 52
           L 88 86
           Q 86 94 94 92
           L 136 84
           L 118 196 Z"
        fill="url(#solugenix-right-cyan)"
      />

      <defs>
        <linearGradient id="solugenix-left-blue" x1="10" y1="4" x2="114" y2="166" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="solugenix-right-cyan" x1="86" y1="34" x2="190" y2="196" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#52C4FF" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function SolugenixLogo({
  className,
  iconOnly = false,
  size = 'md',
  textClassName
}: SolugenixLogoProps) {
  const iconSizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-base tracking-normal',
    md: 'text-xl tracking-tight',
    lg: 'text-2xl tracking-normal',
    xl: 'text-3xl tracking-wide'
  };

  return (
    <div className={cn("inline-flex items-center gap-2.5 font-['Outfit'] select-none", className)}>
      <SolugenixIcon className={iconSizeClasses[size]} />
      {!iconOnly && (
        <span
          className={cn(
            "font-black uppercase tracking-wider text-foreground leading-none",
            textSizeClasses[size],
            textClassName
          )}
        >
          SOLUGENIX
        </span>
      )}
    </div>
  );
}
