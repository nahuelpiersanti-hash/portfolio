import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { createExcerpt, getCollection } from "@/lib/content/collections";
import type { SystemFrontmatter } from "@/types/system";

export const metadata = {
  title: "Systems",
  description: "Operational case studies documented as design records.",
};

export default async function SystemsPage() {
  const systems = await getCollection<SystemFrontmatter>("systems");

  return (
    <PageShell
      title="Systems"
      description="Case studies focused on operational context, structural decisions, and measurable outcomes."
      aside={
        <div className="space-y-4 border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Reading Model</p>
          <p>Each system is presented as an operational design record: context, failure modes, structure, implementation, and impact.</p>
          <div className="pt-4 border-t border-slate-200">
            <Link href="/systems-map" className="text-sm font-medium text-blue-700 hover:underline">
              → View Systems Map
            </Link>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {systems.map((system) => (
          <article key={system.slug} className="border border-slate-200 p-5">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-slate-500">
              <span>{system.frontmatter.domain}</span>
              <span>{system.frontmatter.status}</span>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              <Link href={`/systems/${system.slug}`} className="hover:underline">
                {system.frontmatter.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {system.frontmatter.description ?? createExcerpt(system.content, 220)}
            </p>
            <div className="mt-4">
              <Link href={`/systems/${system.slug}`} className="text-sm font-medium text-blue-700 hover:underline">
                Open case study
              </Link>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
