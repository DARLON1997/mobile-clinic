import Link from "next/link"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"

interface LogoProps {
  href?:      string
  size?:      "sm" | "md" | "lg"
  className?: string
  light?:     boolean
}

const sizes = {
  sm: { icon: "h-5 w-5", text: "text-base" },
  md: { icon: "h-6 w-6", text: "text-xl" },
  lg: { icon: "h-8 w-8", text: "text-2xl" },
}

export function Logo({ href = "/", size = "md", className, light }: LogoProps) {
  const { icon, text } = sizes[size]
  const colorClass = light ? "text-white fill-white" : "text-blue-700 fill-blue-700"

  return (
    <Link href={href} className={cn("flex items-center gap-2", className)}>
      <Heart className={cn(icon, colorClass)} />
      <span className={cn(text, "font-bold", light ? "text-white" : "text-blue-700")}>
        Mobile Clinic
      </span>
    </Link>
  )
}
