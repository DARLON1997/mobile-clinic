import { Stethoscope } from "lucide-react"

interface LogoMarkProps {
  size?:        "xs" | "sm" | "md" | "lg"
  showText?:    boolean
  showTagline?: boolean
  className?:   string
}

const CONFIG = {
  xs: { box: 42,  strokeW: 7,  iconSize: 16, titleClass: "text-sm",   tagClass: "text-[8px]"  },
  sm: { box: 72,  strokeW: 11, iconSize: 26, titleClass: "text-xl",   tagClass: "text-[9px]"  },
  md: { box: 120, strokeW: 17, iconSize: 40, titleClass: "text-2xl",  tagClass: "text-[9px]"  },
  lg: { box: 210, strokeW: 30, iconSize: 60, titleClass: "text-[42px]", tagClass: "text-[10px]" },
}

export function LogoMark({
  size = "md",
  showText = true,
  showTagline = false,
  className = "",
}: LogoMarkProps) {
  const { box, strokeW, iconSize, titleClass, tagClass } = CONFIG[size]

  const cx    = box / 2
  const cy    = box / 2
  const r     = cx - strokeW / 2 - 2
  const circ  = 2 * Math.PI * r
  const gap   = circ * 0.068          // ~7% d'ouverture — fidèle au logo
  const dash  = circ - gap

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>

      {/* ── Cercle pinceau ─────────────────────────────────────── */}
      <div className="relative" style={{ width: box, height: box }}>

        <svg
          width={box}
          height={box}
          viewBox={`0 0 ${box} ${box}`}
          className="absolute inset-0"
          aria-hidden="true"
        >
          <defs>
            {/* Dégradé or cuivré métallique */}
            <linearGradient id="mc-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#4A2010" stopOpacity={0.40} />
              <stop offset="18%"  stopColor="#B87040" stopOpacity={0.80} />
              <stop offset="38%"  stopColor="#D8A070" stopOpacity={0.95} />
              <stop offset="52%"  stopColor="#F0D4B0" stopOpacity={1}    />
              <stop offset="68%"  stopColor="#D0904A" stopOpacity={0.95} />
              <stop offset="85%"  stopColor="#C8906A" stopOpacity={0.80} />
              <stop offset="100%" stopColor="#4A2010" stopOpacity={0.30} />
            </linearGradient>

            {/* Effet pinceau / texture calligraphique */}
            <filter id="mc-brush" x="-8%" y="-8%" width="116%" height="116%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.055"
                numOctaves="3"
                seed="9"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={strokeW * 0.28}
                xChannelSelector="R"
                yChannelSelector="G"
                result="displaced"
              />
              <feGaussianBlur in="displaced" stdDeviation="0.4" />
            </filter>

            {/* Halo doux */}
            <filter id="mc-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={strokeW * 0.5} result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Halo extérieur (lueur ambrée) */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="#C8906A"
            strokeWidth={strokeW + 14}
            strokeDasharray={`${dash} ${gap}`}
            strokeLinecap="round"
            opacity={0.07}
            transform={`rotate(-92 ${cx} ${cy})`}
          />

          {/* Trait principal — pinceau cuivré */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="url(#mc-gold)"
            strokeWidth={strokeW}
            strokeDasharray={`${dash} ${gap}`}
            strokeLinecap="round"
            filter="url(#mc-brush)"
            transform={`rotate(-92 ${cx} ${cy})`}
          />

          {/* Reflet lumineux (highlight métallique) */}
          <circle
            cx={cx} cy={cy} r={r - 1}
            fill="none"
            stroke="#FAEBD4"
            strokeWidth={strokeW * 0.18}
            strokeDasharray={`${dash * 0.26} ${circ * 0.74}`}
            strokeDashoffset={-circ * 0.04}
            strokeLinecap="round"
            opacity={0.55}
            transform={`rotate(-92 ${cx} ${cy})`}
          />

          {/* Ombre interne (profondeur) */}
          <circle
            cx={cx} cy={cy} r={r + 1}
            fill="none"
            stroke="#2A1008"
            strokeWidth={strokeW * 0.3}
            strokeDasharray={`${dash * 0.6} ${circ * 0.4}`}
            strokeDashoffset={-circ * 0.38}
            strokeLinecap="round"
            opacity={0.30}
            transform={`rotate(-92 ${cx} ${cy})`}
          />
        </svg>

        {/* Stéthoscope centré */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Stethoscope
            size={iconSize}
            color="white"
            strokeWidth={1.4}
            style={{ filter: "drop-shadow(0 0 6px rgba(200,144,106,0.45))" }}
          />
        </div>
      </div>

      {/* ── Texte marque ──────────────────────────────────────── */}
      {showText && (
        <div className="text-center">
          <p
            className={`font-cormorant font-semibold italic text-white leading-none ${titleClass}`}
            style={{ textShadow: "0 0 24px rgba(200,144,106,0.3)" }}
          >
            Mobile Clinic
          </p>
          {showTagline && (
            <div className="mt-2 space-y-0.5">
              <p className={`font-montserrat uppercase tracking-[0.22em] text-[#C8906A] ${tagClass}`}>
                La santé plus proche de vous
              </p>
              <p className={`font-montserrat uppercase tracking-[0.22em] text-[#C8906A] opacity-75 ${tagClass}`}>
                Partout où vous êtes
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
