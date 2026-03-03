'use client';

import { type ReactNode } from 'react';
import { SceneProvider, useSceneEntropy } from '@/lib/password-generator/scene-context';
import { ScenePageBackground } from '@/components/password-generator/password-strength-scene';

function LayoutInner({ children }: { children: ReactNode }) {
  const { entropy } = useSceneEntropy();
  return (
    <>
      <ScenePageBackground entropy={entropy} />
      {children}
    </>
  );
}

export default function PasswordGeneratorLayout({ children }: { children: ReactNode }) {
  return (
    <SceneProvider>
      <LayoutInner>{children}</LayoutInner>
    </SceneProvider>
  );
}
