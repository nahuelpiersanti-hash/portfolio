import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { getCollection, getEntryBySlug } from "@/lib/content/collections";
import { RenderMdxContent } from "@/lib/content/mdx";

interface Params {
  slug: string;
}

interface PageProps {
  params: Promise<Params>;
}

export async function generateStaticParams() {
  const docs = await getCollection("architecture");
  return docs.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getEntryBySlug("architecture", slug);

  if (!doc) return { title: "Architecture document not found" };

  return {
    title: doc.frontmatter.title,
    description: doc.frontmatter.description as string | undefined,
  };
}

export default async function ArchitectureDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = await getEntryBySlug("architecture", slug);

  if (!doc) notFound();

  return (
    <PageShell
      title={doc.frontmatter.title}
      description={(doc.frontmatter.description as string | undefined) ?? "Architecture reference"}
      aside={
        <div className="space-y-4 border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Document Metadata</p>
          {doc.frontmatter.lastReviewed ? <p>Last reviewed: {String(doc.frontmatter.lastReviewed)}</p> : null}
        </div>
      }
    >
      <RenderMdxContent source={doc.content} />
    </PageShell>
  );
}
