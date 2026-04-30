"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface DocsContextType {
  activeSectionId: string;
  setActiveSectionId: (id: string) => void;
}

const DocsContext = createContext<DocsContextType | undefined>(undefined);

export function DocsProvider({ children }: { children: ReactNode }) {
  const [activeSectionId, setActiveSectionId] = useState("getting-started");

  return (
    <DocsContext.Provider value={{ activeSectionId, setActiveSectionId }}>
      {children}
    </DocsContext.Provider>
  );
}

export function useDocs() {
  const context = useContext(DocsContext);
  if (context === undefined) {
    throw new Error("useDocs must be used within a DocsProvider");
  }
  return context;
}
