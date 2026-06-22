"use client"

import { motion } from "motion/react"
import { Palmtree, Plane, Sun, Waves } from "lucide-react"

export function EmptyStateScene() {
  return (
    <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-gradient-to-b from-sky-100 to-amber-50 dark:from-sky-950/50 dark:to-amber-950/30">
      <motion.div
        className="absolute right-2.5 top-2.5 size-7 rounded-full bg-amber-400/50 blur-md"
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-3 top-3 text-amber-500"
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      >
        <Sun className="size-5" />
      </motion.div>

      <motion.div
        className="absolute bottom-3 left-2 origin-bottom text-emerald-600"
        animate={{ rotate: [-6, 6, -6] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Palmtree className="size-7" />
      </motion.div>

      <motion.div
        className="absolute text-sky-500"
        animate={{
          x: [-6, 64],
          y: [38, -2],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.15, 0.8, 1],
        }}
      >
        <Plane className="size-4 -rotate-12" />
      </motion.div>

      <motion.div
        className="absolute inset-x-0 bottom-0 flex justify-center text-cyan-500"
        animate={{ x: [-2, 2, -2] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Waves className="size-8" />
      </motion.div>
    </div>
  )
}
