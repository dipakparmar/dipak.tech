"use client"

import * as React from "react"

import Link from "next/link"
import { PixelCanvas } from "@/components/pixel-canvas"

type ToolCardProps = {
  href: string
  color: string
  hoverBg: string
  borderColor: string
  iconBg: string
  tagBg: string
  icon: React.ReactNode
  title: string
  description: string
  stat: string
  tags: string[]
}

// ponytail: tilt driven by CSS vars set directly on the node (no re-renders),
// upgrade to a shared primitive if more cards need the same effect later.
export function ToolCard({
  href,
  color,
  hoverBg,
  borderColor,
  iconBg,
  tagBg,
  icon,
  title,
  description,
  stat,
  tags,
}: ToolCardProps) {
  const ref = React.useRef<HTMLDivElement>(null)

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    el.style.setProperty("--rx", `${(0.5 - py) * 6}deg`)
    el.style.setProperty("--ry", `${(px - 0.5) * 6}deg`)
    el.style.setProperty("--mx", `${px * 100}%`)
    el.style.setProperty("--my", `${py * 100}%`)
  }

  const handlePointerLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty("--rx", "0deg")
    el.style.setProperty("--ry", "0deg")
  }

  return (
    <Link href={href} className="group block h-full perspective-[700px]">
      <div
        ref={ref}
        data-pixel-card
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={`relative h-full overflow-hidden rounded-xl border bg-card p-5 transition-[transform,box-shadow,border-color,background-color] duration-300 will-change-transform ${borderColor} ${hoverBg} group-hover:shadow-lg group-hover:shadow-black/10`}
        style={{
          transform:
            "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateZ(0)",
        }}
      >
        {/* Pixel-grid ripple, brand-colored, triggered on hover */}
        <PixelCanvas className={color} opacity={0.55} />

        <div className="relative z-10">
          {/* Icon */}
          <div
            className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110 ${iconBg}`}
          >
            {icon}
          </div>

          {/* Title + Description */}
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>

          {/* Hover-expand details */}
          <div className="grid max-h-0 grid-rows-[0fr] transition-all duration-300 group-hover:mt-3 group-hover:max-h-28 group-hover:grid-rows-[1fr]">
            <div className="overflow-hidden">
              <div className="border-t border-border pt-3">
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground/80">
                    {stat.split("·")[0].trim()}
                  </span>
                  {stat.includes("·") && (
                    <span> · {stat.split("·").slice(1).join("·").trim()}</span>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${tagBg}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
