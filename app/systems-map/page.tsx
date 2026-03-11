import { PageShell } from "@/components/layout/page-shell";
import { SystemsMap } from "@/components/systems-map";
import { operationalDomains, systems } from "@/content/systems-map";

export const metadata = {
  title: "Systems Map",
  description: "Visual representation of operational systems organized by domain",
};

export default function SystemsMapPage() {
  return (
    <PageShell
      title="Systems Map"
      description="This map represents operational systems organized by domain. Each system is a documented intervention in real-world operational infrastructure."
      aside={
        <div className="space-y-4 border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">About This Map</p>
          <p className="leading-relaxed">
            Systems are organized by operational domain rather than chronology or technology.
          </p>
          <p className="leading-relaxed">
            Each system represents a specific point of intervention in existing operational infrastructure.
          </p>
          <p className="text-xs text-slate-500 pt-2 border-t border-slate-200">
            Click any system to view the full case study.
          </p>
        </div>
      }
    >
      <SystemsMap systems={systems} domains={operationalDomains} />
    </PageShell>
  );
}
