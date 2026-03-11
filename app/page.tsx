import Link from "next/link";

import { getCollection } from "@/lib/content/collections";
import type { SystemFrontmatter } from "@/types/system";

export default async function Home() {
  const systems = await getCollection<SystemFrontmatter>("systems");

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-20 md:py-24">
      <div className="space-y-24 md:space-y-28">
        <section>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-900 md:text-6xl md:leading-[1.04]">
            I build websites, digital platforms, and operational systems.
          </h1>
          <p className="mt-8 max-w-3xl text-lg leading-8 text-slate-600">
            This work focuses on clarity, structure, and reliable execution. Projects are approached as systems: goals,
            constraints, dependencies, and implementation decisions documented end to end.
          </p>
          <div className="mt-10 flex flex-wrap gap-8 text-sm">
            <Link href="/systems" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900">
              View case studies
            </Link>
            <Link href="/contact" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900">
              Contact
            </Link>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Selected Work</h2>
          <div className="mt-10 space-y-10">
            {systems.slice(0, 3).map((system) => (
              <article key={system.slug} className="max-w-3xl">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {system.frontmatter.domain} · {system.frontmatter.status}
                </p>
                <h3 className="mt-3 text-2xl font-medium tracking-tight text-slate-900">{system.frontmatter.title}</h3>
                <p className="mt-3 text-base leading-7 text-slate-600">{system.frontmatter.description}</p>
                <Link href={`/systems/${system.slug}`} className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline">
                  Open system record
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">What I Build</h2>
          <div className="mt-8 max-w-3xl space-y-7 text-base leading-8 text-slate-700">
            <p>Websites with clear structure, maintainable content architecture, and strong editorial control.</p>
            <p>Digital platforms that support operations, coordination, and day-to-day execution.</p>
            <p>Operational systems where technical decisions are tied to process reliability and measurable outcomes.</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Systems Map</h2>
          <p className="mt-8 max-w-3xl text-base leading-8 text-slate-700">
            The Systems Map organizes documented work by operational domain. It shows how platforms relate across
            institutional operations, media infrastructure, content infrastructure, and experimental systems.
          </p>
          <Link href="/systems-map" className="mt-5 inline-block text-sm font-medium text-blue-700 hover:underline">
            Open Systems Map
          </Link>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">How I Work</h2>
          <div className="mt-8 max-w-3xl space-y-6 text-base leading-8 text-slate-700">
            <p>
              1. Clarify operational context: constraints, failure modes, and decision boundaries before implementation.
            </p>
            <p>
              2. Design structure first: domain model, information flow, and platform architecture aligned to real use.
            </p>
            <p>
              3. Build with traceability: document rationale, implementation choices, and impact after deployment.
            </p>
          </div>
        </section>

        <section className="pb-4">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Contact</h2>
          <p className="mt-8 max-w-3xl text-base leading-8 text-slate-700">
            Available for selected website and platform projects where structural thinking is part of the brief.
          </p>
          <div className="mt-6 flex flex-wrap gap-8 text-sm">
            <Link href="/contact" className="font-medium text-blue-700 hover:underline">
              Start a conversation
            </Link>
            <Link href="/about" className="font-medium text-slate-700 hover:underline">
              About my approach
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
