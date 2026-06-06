import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-")
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="font-montserrat text-xs font-medium uppercase tracking-[0.06em] text-[#AAAAAA]"
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            "flex h-11 w-full rounded-lg px-4 py-2.5 text-sm",
            "bg-[#1A1A1A] text-white placeholder:text-[#666666]",
            "border transition-all duration-200",
            "focus:outline-none focus:ring-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-[#E85454] focus:border-transparent focus:ring-[rgba(232,84,84,0.25)]"
              : "border-[#2A2A2A] focus:border-transparent focus:ring-[rgba(200,144,106,0.25)] hover:border-[rgba(200,144,106,0.28)]",
            className
          )}
          ref={ref}
          {...props}
        />
        {error      && <p className="text-xs text-[#E85454]">{error}</p>}
        {helperText && !error && <p className="text-xs text-[#666666]">{helperText}</p>}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
