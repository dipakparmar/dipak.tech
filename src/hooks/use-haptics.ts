"use client";

import { useContext } from "react";
import { HapticsContext } from "@/components/haptics-provider";

const noop = async () => {};

export function useHaptics() {
  const context = useContext(HapticsContext);
  if (!context) {
    return { trigger: noop, cancel: () => {}, isSupported: false };
  }
  return context;
}
