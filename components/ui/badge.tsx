import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot as SlotPrimitive } from 'radix-ui';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
  dotClassName?: string;
  disabled?: boolean;
}

export interface BadgeButtonProps
  extends React.ButtonHTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeButtonVariants> {
  asChild?: boolean;
}

export type BadgeDotProps = React.HTMLAttributes<HTMLSpanElement>;

const badgeVariants = cva(
  'inline-flex items-center whitespace-nowrap justify-center border border-transparent font-medium focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:-ms-px [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        success:
          'bg-[var(--color-success-accent,var(--color-green-500))] text-[var(--color-success-foreground,var(--color-white))]',
        warning:
          'bg-[var(--color-warning-accent,var(--color-yellow-500))] text-[var(--color-warning-foreground,var(--color-white))]',
        info: 'bg-[var(--color-info-accent,var(--color-violet-500))] text-[var(--color-info-foreground,var(--color-white))]',
        outline: 'bg-transparent border border-border text-secondary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        // New category-specific variants
        blue: 'bg-blue-500 text-white',
        purple: 'bg-purple-500 text-white',
        pink: 'bg-pink-500 text-white',
        orange: 'bg-orange-500 text-white',
        indigo: 'bg-indigo-500 text-white',
        green: 'bg-green-500 text-white',
        yellow: 'bg-yellow-500 text-white',
        cyan: 'bg-cyan-500 text-white',
        red: 'bg-red-500 text-white',
        teal: 'bg-teal-500 text-white',
        violet: 'bg-violet-500 text-white',
        gray: 'bg-gray-500 text-white',
        emerald: 'bg-emerald-500 text-white',
        amber: 'bg-amber-500 text-white',
        neutral: 'text-white',
      },
      appearance: {
        default: '',
        light: '',
        outline: '',
        ghost: 'border-transparent bg-transparent',
      },
      disabled: {
        true: 'opacity-50 pointer-events-none',
      },
      size: {
        lg: 'rounded-md px-[0.5rem] h-7 min-w-7 gap-1.5 text-xs [&_svg]:size-3.5',
        md: 'rounded-md px-[0.45rem] h-6 min-w-6 gap-1.5 text-xs [&_svg]:size-3.5 ',
        sm: 'rounded-sm px-[0.325rem] h-5 min-w-5 gap-1 text-[0.6875rem] leading-[0.75rem] [&_svg]:size-3',
        xs: 'rounded-sm px-[0.25rem] h-4 min-w-4 gap-1 text-[0.625rem] leading-[0.5rem] [&_svg]:size-3',
      },
      shape: {
        default: '',
        circle: 'rounded-full',
      },
    },
    compoundVariants: [
      {
        variant: 'neutral',
        appearance: 'default',
        className:
          'bg-gray-700 text-white dark:bg-gray-300 dark:text-gray-900',
      },
      /* Light */
      {
        variant: 'primary',
        appearance: 'light',
        className:
          'text-[var(--color-primary-accent,var(--color-blue-700))] bg-[var(--color-primary-soft,var(--color-blue-50))] dark:bg-[var(--color-primary-soft,var(--color-blue-950))] dark:text-[var(--color-primary-soft,var(--color-blue-600))]',
      },
      {
        variant: 'secondary',
        appearance: 'light',
        className:
          'text-secondary-700 bg-secondary-100 dark:bg-secondary-950 dark:text-secondary-400',
      },
      {
        variant: 'success',
        appearance: 'light',
        className:
          'text-[var(--color-success-accent,var(--color-green-800))] bg-[var(--color-success-soft,var(--color-green-100))] dark:bg-[var(--color-success-soft,var(--color-green-950))] dark:text-[var(--color-success-soft,var(--color-green-600))]',
      },
      {
        variant: 'warning',
        appearance: 'light',
        className:
          'text-[var(--color-warning-accent,var(--color-yellow-700))] bg-[var(--color-warning-soft,var(--color-yellow-100))] dark:bg-[var(--color-warning-soft,var(--color-yellow-950))] dark:text-[var(--color-warning-soft,var(--color-yellow-600))]',
      },
      {
        variant: 'info',
        appearance: 'light',
        className:
          'text-[var(--color-info-accent,var(--color-violet-700))] bg-[var(--color-info-soft,var(--color-violet-100))] dark:bg-[var(--color-info-soft,var(--color-violet-950))] dark:text-[var(--color-info-soft,var(--color-violet-400))]',
      },
      {
        variant: 'destructive',
        appearance: 'light',
        className:
          'text-[var(--color-destructive-accent,var(--color-red-700))] bg-[var(--color-destructive-soft,var(--color-red-50))] dark:bg-[var(--color-destructive-soft,var(--color-red-950))] dark:text-[var(--color-destructive-soft,var(--color-red-600))]',
      },
      {
        variant: 'neutral',
        appearance: 'light',
        className:
          'text-gray-800 bg-gray-200 dark:bg-gray-700 dark:text-gray-200',
      },
      // New light variants for category colors
      {
        variant: 'blue',
        appearance: 'light',
        className: 'text-blue-800 bg-blue-100 dark:bg-blue-950 dark:text-blue-400',
      },
      {
        variant: 'purple',
        appearance: 'light',
        className: 'text-purple-800 bg-purple-100 dark:bg-purple-950 dark:text-purple-400',
      },
      {
        variant: 'pink',
        appearance: 'light',
        className: 'text-pink-800 bg-pink-100 dark:bg-pink-950 dark:text-pink-400',
      },
      {
        variant: 'orange',
        appearance: 'light',
        className: 'text-orange-800 bg-orange-100 dark:bg-orange-950 dark:text-orange-400',
      },
      {
        variant: 'indigo',
        appearance: 'light',
        className: 'text-indigo-800 bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-400',
      },
      {
        variant: 'green',
        appearance: 'light',
        className: 'text-green-800 bg-green-100 dark:bg-green-950 dark:text-green-400',
      },
      {
        variant: 'yellow',
        appearance: 'light',
        className: 'text-yellow-800 bg-yellow-100 dark:bg-yellow-950 dark:text-yellow-400',
      },
      {
        variant: 'cyan',
        appearance: 'light',
        className: 'text-cyan-800 bg-cyan-100 dark:bg-cyan-950 dark:text-cyan-400',
      },
      {
        variant: 'red',
        appearance: 'light',
        className: 'text-red-800 bg-red-100 dark:bg-red-950 dark:text-red-400',
      },
      {
        variant: 'teal',
        appearance: 'light',
        className: 'text-teal-800 bg-teal-100 dark:bg-teal-950 dark:text-teal-400',
      },
      {
        variant: 'violet',
        appearance: 'light',
        className: 'text-violet-800 bg-violet-100 dark:bg-violet-950 dark:text-violet-400',
      },
      {
        variant: 'gray',
        appearance: 'light',
        className: 'text-gray-800 bg-gray-100 dark:bg-gray-950 dark:text-gray-400',
      },
      {
        variant: 'emerald',
        appearance: 'light',
        className: 'text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400',
      },
      {
        variant: 'amber',
        appearance: 'light',
        className: 'text-amber-800 bg-amber-100 dark:bg-amber-950 dark:text-amber-400',
      },
      /* Outline */
      {
        variant: 'primary',
        appearance: 'outline',
        className:
          'text-[var(--color-primary-accent,var(--color-blue-700))] border-[var(--color-primary-soft,var(--color-blue-100))] bg-[var(--color-primary-soft,var(--color-blue-50))] dark:bg-[var(--color-primary-soft,var(--color-blue-950))] dark:border-[var(--color-primary-soft,var(--color-blue-900))] dark:text-[var(--color-primary-soft,var(--color-blue-600))]',
      },
      {
        variant: 'secondary',
        appearance: 'outline',
        className:
          'text-secondary-700 border-secondary-200 bg-secondary-50 dark:bg-secondary-950 dark:border-secondary-900 dark:text-secondary-400',
      },
      {
        variant: 'success',
        appearance: 'outline',
        className:
          'text-[var(--color-success-accent,var(--color-green-700))] border-[var(--color-success-soft,var(--color-green-200))] bg-[var(--color-success-soft,var(--color-green-50))] dark:bg-[var(--color-success-soft,var(--color-green-950))] dark:border-[var(--color-success-soft,var(--color-green-900))] dark:text-[var(--color-success-soft,var(--color-green-600))]',
      },
      {
        variant: 'warning',
        appearance: 'outline',
        className:
          'text-[var(--color-warning-accent,var(--color-yellow-700))] border-[var(--color-warning-soft,var(--color-yellow-200))] bg-[var(--color-warning-soft,var(--color-yellow-50))] dark:bg-[var(--color-warning-soft,var(--color-yellow-950))] dark:border-[var(--color-warning-soft,var(--color-yellow-900))] dark:text-[var(--color-warning-soft,var(--color-yellow-600))]',
      },
      {
        variant: 'info',
        appearance: 'outline',
        className:
          'text-[var(--color-info-accent,var(--color-violet-700))] border-[var(--color-info-soft,var(--color-violet-100))] bg-[var(--color-info-soft,var(--color-violet-50))] dark:bg-[var(--color-info-soft,var(--color-violet-950))] dark:border-[var(--color-info-soft,var(--color-violet-900))] dark:text-[var(--color-info-soft,var(--color-violet-400))]',
      },
      {
        variant: 'destructive',
        appearance: 'outline',
        className:
          'text-[var(--color-destructive-accent,var(--color-red-700))] border-[var(--color-destructive-soft,var(--color-red-100))] bg-[var(--color-destructive-soft,var(--color-red-50))] dark:bg-[var(--color-destructive-soft,var(--color-red-950))] dark:border-[var(--color-destructive-soft,var(--color-red-900))] dark:text-[var(--color-destructive-soft,var(--color-red-600))]',
      },
      {
        variant: 'neutral',
        appearance: 'outline',
        className:
          'text-gray-700 border-gray-300 bg-gray-100 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300',
      },
      // New outline variants for category colors
      {
        variant: 'blue',
        appearance: 'outline',
        className: 'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-400',
      },
      {
        variant: 'purple',
        appearance: 'outline',
        className: 'text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-900 dark:text-purple-400',
      },
      {
        variant: 'pink',
        appearance: 'outline',
        className: 'text-pink-700 border-pink-200 bg-pink-50 dark:bg-pink-950 dark:border-pink-900 dark:text-pink-400',
      },
      {
        variant: 'orange',
        appearance: 'outline',
        className: 'text-orange-700 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-900 dark:text-orange-400',
      },
      {
        variant: 'indigo',
        appearance: 'outline',
        className: 'text-indigo-700 border-indigo-200 bg-indigo-50 dark:bg-indigo-950 dark:border-indigo-900 dark:text-indigo-400',
      },
      {
        variant: 'green',
        appearance: 'outline',
        className: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900 dark:text-green-400',
      },
      {
        variant: 'yellow',
        appearance: 'outline',
        className: 'text-yellow-700 border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-900 dark:text-yellow-400',
      },
      {
        variant: 'cyan',
        appearance: 'outline',
        className: 'text-cyan-700 border-cyan-200 bg-cyan-50 dark:bg-cyan-950 dark:border-cyan-900 dark:text-cyan-400',
      },
      {
        variant: 'red',
        appearance: 'outline',
        className: 'text-red-700 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900 dark:text-red-400',
      },
      {
        variant: 'teal',
        appearance: 'outline',
        className: 'text-teal-700 border-teal-200 bg-teal-50 dark:bg-teal-950 dark:border-teal-900 dark:text-teal-400',
      },
      {
        variant: 'violet',
        appearance: 'outline',
        className: 'text-violet-700 border-violet-200 bg-violet-50 dark:bg-violet-950 dark:border-violet-900 dark:text-violet-400',
      },
      {
        variant: 'gray',
        appearance: 'outline',
        className: 'text-gray-700 border-gray-200 bg-gray-50 dark:bg-gray-950 dark:border-gray-900 dark:text-gray-400',
      },
      {
        variant: 'emerald',
        appearance: 'outline',
        className: 'text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-400',
      },
      {
        variant: 'amber',
        appearance: 'outline',
        className: 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-400',
      },
      /* Ghost */
      {
        variant: 'primary',
        appearance: 'ghost',
        className: 'text-primary',
      },
      {
        variant: 'secondary',
        appearance: 'ghost',
        className: 'text-secondary-foreground',
      },
      {
        variant: 'success',
        appearance: 'ghost',
        className: 'text-[var(--color-success-accent,var(--color-green-500))]',
      },
      {
        variant: 'warning',
        appearance: 'ghost',
        className: 'text-[var(--color-warning-accent,var(--color-yellow-500))]',
      },
      {
        variant: 'info',
        appearance: 'ghost',
        className: 'text-[var(--color-info-accent,var(--color-violet-500))]',
      },
      {
        variant: 'destructive',
        appearance: 'ghost',
        className: 'text-destructive',
      },
      {
        variant: 'neutral',
        appearance: 'ghost',
        className:
          'text-gray-700 dark:text-gray-300',
      },
      // New ghost variants for category colors
      {
        variant: 'blue',
        appearance: 'ghost',
        className: 'text-blue-600',
      },
      {
        variant: 'purple',
        appearance: 'ghost',
        className: 'text-purple-600',
      },
      {
        variant: 'pink',
        appearance: 'ghost',
        className: 'text-pink-600',
      },
      {
        variant: 'orange',
        appearance: 'ghost',
        className: 'text-orange-600',
      },
      {
        variant: 'indigo',
        appearance: 'ghost',
        className: 'text-indigo-600',
      },
      {
        variant: 'green',
        appearance: 'ghost',
        className: 'text-green-600',
      },
      {
        variant: 'yellow',
        appearance: 'ghost',
        className: 'text-yellow-600',
      },
      {
        variant: 'cyan',
        appearance: 'ghost',
        className: 'text-cyan-600',
      },
      {
        variant: 'red',
        appearance: 'ghost',
        className: 'text-red-600',
      },
      {
        variant: 'teal',
        appearance: 'ghost',
        className: 'text-teal-600',
      },
      {
        variant: 'violet',
        appearance: 'ghost',
        className: 'text-violet-600',
      },
      {
        variant: 'gray',
        appearance: 'ghost',
        className: 'text-gray-600',
      },
      {
        variant: 'emerald',
        appearance: 'ghost',
        className: 'text-emerald-600',
      },
      {
        variant: 'amber',
        appearance: 'ghost',
        className: 'text-amber-600',
      },

      { size: 'lg', appearance: 'ghost', className: 'px-0' },
      { size: 'md', appearance: 'ghost', className: 'px-0' },
      { size: 'sm', appearance: 'ghost', className: 'px-0' },
      { size: 'xs', appearance: 'ghost', className: 'px-0' },
    ],
    defaultVariants: {
      variant: 'primary',
      appearance: 'default',
      size: 'md',
    },
  },
);

const badgeButtonVariants = cva(
  'cursor-pointer transition-all inline-flex items-center justify-center leading-none size-3.5 [&>svg]:opacity-100! [&>svg]:size-3.5! p-0 rounded-md -me-0.5 opacity-60 hover:opacity-100',
  {
    variants: {
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant,
  size,
  appearance,
  shape,
  asChild = false,
  disabled,
  ...props
}: BadgeProps) {
  const Comp = asChild ? SlotPrimitive.Slot : 'span';

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, appearance, shape, disabled }), className)}
      {...props}
    />
  );
}

function BadgeButton({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof badgeButtonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : 'span';
  return (
    <Comp
      data-slot="badge-button"
      className={cn(badgeButtonVariants({ variant, className }))}
      role="button"
      {...props}
    />
  );
}

function BadgeDot({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="badge-dot"
      className={cn('size-1.5 rounded-full bg-[currentColor] opacity-75', className)}
      {...props}
    />
  );
}

export { Badge, BadgeButton, BadgeDot, badgeVariants };