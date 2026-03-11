import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { getCollection, getEntryBySlug } from "@/lib/content/collections";
import { RenderMdxContent } from "@/lib/content/mdx";
import type { SystemFrontmatter } from "@/types/system";

interface Params {
  slug: string;
}

interface SystemPageProps {
  params: Promise<Params>;
}

export async function generateStaticParams() {
  const systems = await getCollection<SystemFrontmatter>("systems");
  return systems.map((system) => ({ slug: system.slug }));
}

export async function generateMetadata({ params }: SystemPageProps): Promise<Metadata> {
  const { slug } = await params;
  const system = await getEntryBySlug<SystemFrontmatter>("systems", slug);

  if (!system) {
    return {
      title: "System not found",
    };
  }

  return {
    title: system.frontmatter.title,
    description: system.frontmatter.description ?? "Operational system case study",
  };
}

export default async function SystemCaseStudyPage({ params }: SystemPageProps) {
  const { slug } = await params;
  const system = await getEntryBySlug<SystemFrontmatter>("systems", slug);

  if (!system) {
    notFound();
  }

  return (
    <PageShell
      title={system.frontmatter.title}
      description={
        system.frontmatter.description ??
        "Operational case study focused on context, structural analysis, implementation, and impact."
      }
      aside={
        <div className="space-y-4 border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Metadata</p>
          <p>
            <span className="block">Domain: {system.frontmatter.domain}</span>
            <span className="block">Status: {system.frontmatter.status}</span>
            {system.frontmatter.scope ? <span className="block">Scope: {system.frontmatter.scope}</span> : null}
            {system.frontmatter.lastReviewed ? (
              <span className="block">Last reviewed: {system.frontmatter.lastReviewed}</span>
            ) : null}
          </p>
        </div>
      }
    >
      <RenderMdxContent source={system.content} />
    </PageShell>
  );
}
