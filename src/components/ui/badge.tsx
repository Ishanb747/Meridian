import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-bg-elevated text-text-muted border border-border',
        success: 'bg-success-subtle text-success border border-success/30',
        warning: 'bg-warning-subtle text-warning border border-warning/30',
        danger: 'bg-danger-subtle text-danger border border-danger/30',
        info: 'bg-info-subtle text-info border border-info/30',
        accent: 'bg-accent-subtle text-accent border border-accent/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }