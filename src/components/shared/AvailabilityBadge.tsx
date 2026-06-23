import type { AvailabilityStatus, SlotCheck } from "@/lib/check-doctor-availability"

const CONFIGS: Record<AvailabilityStatus, {
  bg: string; border: string; text: string; dot: string
}> = {
  MATCH:    { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  dot: "bg-green-500"  },
  PARTIAL:  { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", dot: "bg-orange-500" },
  CONFLICT: { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    dot: "bg-red-500"    },
  NO_DATA:  { bg: "bg-gray-50",   border: "border-gray-200",   text: "text-gray-500",   dot: "bg-gray-400"   },
}

export function AvailabilityBadge({ check }: { check: SlotCheck | null | undefined }) {
  if (!check) return null
  const c = CONFIGS[check.status]
  return (
    <div className="mt-1 space-y-0.5">
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${c.bg} ${c.border} ${c.text}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
        {check.label}
      </span>
      {check.suggestion && (
        <p className="text-[10px] text-gray-400">
          Prochain : {check.suggestion}
        </p>
      )}
    </div>
  )
}
