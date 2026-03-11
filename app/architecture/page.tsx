import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { getCollection } from "@/lib/content/collections";

export const metadata = {
  title: "Architecture",
  description: "Methods and patterns used to design operational systems.",
};

export default async function ArchitecturePage() {
  const docs = await getCollection("architecture");

  return (
    <PageShell
      title="Architecture"
      description="Methodology, principles, and pattern references used to transform operations into reliable systems."
    >
      <div className="space-y-4">
        {docs.length === 0 ? (
          <p className="text-slate-600">No architecture documents published yet.</p>
        ) : (
          docs.map((doc) => (
            <article key={doc.slug} className="border border-slate-200 p-5">
              <h2 className="text-xl font-semibold text-slate-900">
                <Link href={`/architecture/${doc.slug}`} className="hover:underline">
                  {doc.frontmatter.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {doc.frontmatter.description ?? "Architecture reference"}
              </p>
              <Link href={`/architecture/${doc.slug}`} className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline">
                Open document
              </Link>
            </article>
          ))
        )}
      </div>
    </PageShell>
  );
}
