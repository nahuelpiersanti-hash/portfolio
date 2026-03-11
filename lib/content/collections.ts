import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

import type { BaseFrontmatter, CollectionName, ContentEntry } from "@/types/content";

const CONTENT_ROOT = path.join(process.cwd(), "content");

function inferSlug(fileName: string, frontmatterSlug?: string): string {
  if (frontmatterSlug && frontmatterSlug.trim().length > 0) {
    return frontmatterSlug.trim();
  }

  return fileName.replace(/\.mdx?$/, "");
}

async function getCollectionFileNames(collection: CollectionName): Promise<string[]> {
  const dirPath = path.join(CONTENT_ROOT, collection);

  try {
    const names = await fs.readdir(dirPath);
    return names.filter((name) => name.endsWith(".mdx") || name.endsWith(".md"));
  } catch {
    return [];
  }
}

export async function getCollection<TFrontmatter extends BaseFrontmatter = BaseFrontmatter>(
  collection: CollectionName,
): Promise<Array<ContentEntry<TFrontmatter>>> {
  const files = await getCollectionFileNames(collection);

  const entries = await Promise.all(
    files.map(async (fileName) => {
      const filePath = path.join(CONTENT_ROOT, collection, fileName);
      const source = await fs.readFile(filePath, "utf8");
      const parsed = matter(source);
      const frontmatter = parsed.data as TFrontmatter;
      const slug = inferSlug(fileName, typeof frontmatter.slug === "string" ? frontmatter.slug : undefined);

      return {
        collection,
        slug,
        filePath,
        frontmatter,
        content: parsed.content,
      } satisfies ContentEntry<TFrontmatter>;
    }),
  );

  return entries.sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title));
}

export async function getEntryBySlug<TFrontmatter extends BaseFrontmatter = BaseFrontmatter>(
  collection: CollectionName,
  slug: string,
): Promise<ContentEntry<TFrontmatter> | null> {
  const entries = await getCollection<TFrontmatter>(collection);
  return entries.find((entry) => entry.slug === slug) ?? null;
}

export function createExcerpt(markdown: string, maxLength = 180): string {
  const normalized = markdown
    .replace(/[#>*_`\[\]\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}
