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
  const experiments = await getCollection("experiments");
  return experiments.map((experiment) => ({ slug: experiment.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const experiment = await getEntryBySlug("experiments", slug);

  if (!experiment) return { title: "Experiment not found" };

  return {
    title: experiment.frontmatter.title,
    description: experiment.frontmatter.description as string | undefined,
  };
}

export default async function ExperimentDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const experiment = await getEntryBySlug("experiments", slug);

  if (!experiment) notFound();

  return (
    <PageShell
      title={experiment.frontmatter.title}
      description={(experiment.frontmatter.description as string | undefined) ?? "Experiment detail"}
      aside={
        <div className="space-y-4 border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Experiment Metadata</p>
          {experiment.frontmatter.lastReviewed ? (
            <p>Last reviewed: {String(experiment.frontmatter.lastReviewed)}</p>
          ) : null}
        </div>
      }
    >
      <RenderMdxContent source={experiment.content} />
    </PageShell>
  );
}
