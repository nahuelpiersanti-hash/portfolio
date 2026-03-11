import type { BaseFrontmatter } from "@/types/content";

export interface SystemFrontmatter extends BaseFrontmatter {
  title: string;
  slug?: string;
  domain: string;
  status: string;
  scope?: string;
  lastReviewed?: string;
}
