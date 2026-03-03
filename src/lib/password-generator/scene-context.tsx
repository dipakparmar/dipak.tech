'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { type EntropyResult } from './entropy';

const DEFAULT_ENTROPY: EntropyResult = {
  bits: 0,
  crackTime: 'Instant',
  strength: 'very-weak',
  color: 'bg-red-500',
  percentage: 0,
};

interface SceneContextValue {
  entropy: EntropyResult;
  setEntropy: (entropy: EntropyResult) => void;
}

const SceneContext = createContext<SceneContextValue>({
  entropy: DEFAULT_ENTROPY,
  setEntropy: () => {},
});

export function SceneProvider({ children }: { children: ReactNode }) {
  const [entropy, setEntropy] = useState<EntropyResult>(DEFAULT_ENTROPY);
  return (
    <SceneContext.Provider value={{ entropy, setEntropy }}>
      {children}
    </SceneContext.Provider>
  );
}

export function useSceneEntropy() {
  return useContext(SceneContext);
}
