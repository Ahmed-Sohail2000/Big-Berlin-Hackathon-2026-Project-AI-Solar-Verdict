"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useWorkspace, type Workspace } from "./useWorkspace";

const WorkspaceContext = createContext<Workspace | null>(null);

/**
 * Sits above the pages, so an open roof survives a look at the guide or the home page.
 * It is still memory only: Start over or closing the tab discards everything.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const workspace = useWorkspace();
  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>;
}

export function useSharedWorkspace(): Workspace {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("useSharedWorkspace needs a WorkspaceProvider.");
  return workspace;
}
