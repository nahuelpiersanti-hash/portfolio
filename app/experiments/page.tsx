import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { getCollection } from "@/lib/content/collections";

export const metadata = {
  title: "Experiments",
  description: "Controlled explorations that test operational hypotheses.",
};

export default async function ExperimentsPage() {
  const experiments = await getCollection("experiments");

  return (
    <PageShell
      title="Experiments"
      description="Prototypes and exploratory models used to validate design assumptions before or during system evolution."
    >
      {experiments.length === 0 ? (
        <p className="text-slate-600">No experiments published yet.</p>
      ) : (
        <ul className="space-y-4">
          {experiments.map((experiment) => (
            <li key={experiment.slug} className="border border-slate-200 p-5">
              <h2 className="text-xl font-semibold text-slate-900">
                <Link href={`/experiments/${experiment.slug}`} className="hover:underline">
                  {experiment.frontmatter.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {experiment.frontmatter.description ?? "Experiment"}
              </p>
              <Link href={`/experiments/${experiment.slug}`} className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline">
                Open experiment
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
