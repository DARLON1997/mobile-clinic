import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg",
    "font-montserrat text-sm font-medium tracking-wide",
    "transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]",
    "disabled:pointer-events-none disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-gradient-to-br from-[#C8906A] to-[#E8B49A]",
          "text-[#0A0A0A] font-semibold tracking-[0.06em]",
          "hover:shadow-[0_0_28px_rgba(200,144,106,0.45)] hover:-translate-y-px",
          "active:translate-y-0",
          "focus-visible:ring-[#C8906A]",
        ].join(" "),
        secondary: [
          "border border-[#C8906A] bg-transparent text-[#C8906A]",
          "hover:bg-[rgba(200,144,106,0.12)]",
          "focus-visible:ring-[#C8906A]",
        ].join(" "),
        outline: [
          "border border-[#2A2A2A] bg-transparent text-[#AAAAAA]",
          "hover:border-[rgba(200,144,106,0.28)] hover:text-white",
        ].join(" "),
        ghost: [
          "bg-transparent text-[#AAAAAA]",
          "hover:bg-[#202020] hover:text-white",
        ].join(" "),
        danger: [
          "bg-[#E85454] text-white",
          "hover:opacity-85 active:opacity-100",
          "focus-visible:ring-[#E85454]",
        ].join(" "),
        success: [
          "bg-[#4CAF87] text-white",
          "hover:opacity-85",
          "focus-visible:ring-[#4CAF87]",
        ].join(" "),
        link: "text-[#C8906A] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm:   "h-8 px-3 text-xs",
        md:   "h-10 px-4",
        lg:   "h-11 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
)
Button.displayName = "Button"

export { Button, buttonVariants }
