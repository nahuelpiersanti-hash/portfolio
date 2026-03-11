import { PageShell } from "@/components/layout/page-shell";

export const metadata = {
  title: "About",
  description: "Practice profile focused on operational systems design.",
};

export default function AboutPage() {
  return (
    <PageShell
      title="About"
      description="Nahuel Piersanti designs and evolves operational systems for real-world organizations. The focus is structural clarity, reliable execution, and measurable operational outcomes."
    >
      <div className="space-y-6 text-slate-700">
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Practice Scope</h2>
          <p className="mt-2 leading-7">
            Work sits at the intersection of operations, systems thinking, and digital infrastructure. Engagements are framed
            as system design or system evolution, depending on operational maturity.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Working Approach</h2>
          <p className="mt-2 leading-7">
            Observe existing operations, model structural constraints, define interfaces and state transitions, then evolve the
            operating system with clear artifacts and governance loops.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
