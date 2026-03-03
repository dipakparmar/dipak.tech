"use client";

import { createContext, type ReactNode } from "react";
import { useWebHaptics } from "web-haptics/react";

type HapticsContextValue = {
  trigger: ReturnType<typeof useWebHaptics>["trigger"];
  cancel: ReturnType<typeof useWebHaptics>["cancel"];
  isSupported: boolean;
};

export const HapticsContext = createContext<HapticsContextValue | null>(null);

export function HapticsProvider({ children }: { children: ReactNode }) {
  const { trigger, cancel, isSupported } = useWebHaptics({ debug: true });

  return (
    <HapticsContext.Provider value={{ trigger, cancel, isSupported }}>
      {children}
    </HapticsContext.Provider>
  );
}
