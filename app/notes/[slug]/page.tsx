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
  const notes = await getCollection("notes");
  return notes.map((note) => ({ slug: note.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const note = await getEntryBySlug("notes", slug);

  if (!note) return { title: "Note not found" };

  return {
    title: note.frontmatter.title,
    description: note.frontmatter.description as string | undefined,
  };
}

export default async function NoteDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const note = await getEntryBySlug("notes", slug);

  if (!note) notFound();

  return (
    <PageShell
      title={note.frontmatter.title}
      description={(note.frontmatter.description as string | undefined) ?? "Field note"}
      aside={
        <div className="space-y-4 border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Field Note</p>
          {note.frontmatter.lastReviewed ? <p>Last reviewed: {String(note.frontmatter.lastReviewed)}</p> : null}
        </div>
      }
    >
      <RenderMdxContent source={note.content} />
    </PageShell>
  );
}
