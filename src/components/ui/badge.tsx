import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  [
    "inline-flex items-center rounded-full px-2.5 py-0.5",
    "font-montserrat text-[11px] font-semibold tracking-[0.06em] uppercase",
    "transition-colors",
  ].join(" "),
  {
    variants: {
      variant: {
        default:  "bg-[rgba(80,144,211,0.12)] text-[#5090D3]",
        success:  "bg-[rgba(76,175,135,0.12)] text-[#4CAF87]",
        warning:  "bg-[rgba(232,168,56,0.12)] text-[#E8A838]",
        danger:   "bg-[rgba(232,84,84,0.12)] text-[#E85454]",
        gray:     "bg-[rgba(255,255,255,0.08)] text-[#AAAAAA]",
        gold:     "bg-[rgba(200,144,106,0.12)] text-[#C8906A]",
        purple:   "bg-[rgba(155,109,214,0.12)] text-[#9B6DD6]",
        outline:  "border border-current bg-transparent",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
