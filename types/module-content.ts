import { ReactNode } from "react";

export interface ModuleContent {
  type: ReactNode;
  title: ReactNode;
  index: ReactNode;
  problem: string;
  system: string;
  capabilities: string[];
  result: string;
  deployedIn?: string;
  connectedModules: Array<{ name: string; type: string }>;
  visualLabel?: string;
  category?: string;
}
