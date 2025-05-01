"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { nip19 } from "nostr-tools";

interface NostrContextProps {
  publicKey: string | null;
  setPublicKey: (hex: string) => void;
}

const NostrContext = createContext<NostrContextProps>({
  publicKey: null,
  setPublicKey: () => {},
});

export function NostrProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("nostr:npub");
    if (stored) {
      try {
        const { type, data } = nip19.decode(stored);
        if (type === "npub") setPublicKey(data as string);
        else setPublicKey(stored);
      } catch {
        setPublicKey(stored);
      }
    }
  }, []);

  return (
    <NostrContext.Provider value={{ publicKey, setPublicKey }}>
      {children}
    </NostrContext.Provider>
  );
}

export function useNostr() {
  return useContext(NostrContext);
}