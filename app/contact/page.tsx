import { PageShell } from "@/components/layout/page-shell";

export const metadata = {
  title: "Contact",
  description: "Start a structured conversation about operational systems.",
};

export default function ContactPage() {
  return (
    <PageShell
      title="Contact"
      description="For operational infrastructure conversations, include current context, constraints, desired outcomes, and timeline."
    >
      <div className="space-y-6 text-slate-700">
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Primary Channel</h2>
          <p className="mt-2 leading-7">Email: contact@nahuelpiersanti.com</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Inquiry Structure</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 leading-7">
            <li>Operational context and domain</li>
            <li>Current failure modes or constraints</li>
            <li>Desired operational improvements</li>
            <li>Expected timeline</li>
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
