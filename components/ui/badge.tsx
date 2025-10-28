import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80 transition-colors duration-200",
        secondary:
          "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors duration-200",
        destructive:
          "border-transparent bg-red-500 text-white shadow hover:bg-red-600 transition-colors duration-200",
        outline: "border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200",
        success:
          "border-transparent bg-green-500 text-white shadow hover:bg-green-600 transition-colors duration-200",
        warning:
          "border-transparent bg-yellow-500 text-white shadow hover:bg-yellow-600 transition-colors duration-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
