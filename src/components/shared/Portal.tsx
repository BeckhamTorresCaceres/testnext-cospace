'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const emptySubscribe = () => () => {};

interface PortalProps {
  children: React.ReactNode;
}

export function Portal({ children }: PortalProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isMounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(children, document.body);
}
