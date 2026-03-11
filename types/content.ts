export type CollectionName = "systems" | "architecture" | "notes" | "experiments";

export interface BaseFrontmatter {
  title: string;
  slug?: string;
  description?: string;
  domain?: string;
  status?: string;
  lastReviewed?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface ContentEntry<TFrontmatter extends BaseFrontmatter = BaseFrontmatter> {
  collection: CollectionName;
  slug: string;
  filePath: string;
  frontmatter: TFrontmatter;
  content: string;
}
