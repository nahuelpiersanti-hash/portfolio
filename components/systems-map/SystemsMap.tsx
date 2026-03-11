import { OperationalDomain, System } from '@/types/systems-map';
import { DomainRegion } from './DomainRegion';
import { MapLegend } from './MapLegend';

interface SystemsMapProps {
  systems: System[];
  domains: OperationalDomain[];
}

function getSystemsForDomain(systems: System[], domainId: string): System[] {
  return systems.filter(system => system.domains.includes(domainId as any));
}

export function SystemsMap({ systems, domains }: SystemsMapProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Main Map Area */}
      <div className="lg:col-span-3 space-y-6">
        {domains.map((domain) => {
          const domainSystems = getSystemsForDomain(systems, domain.id);
          return (
            <DomainRegion 
              key={domain.id}
              domain={domain}
              systems={domainSystems}
            />
          );
        })}
      </div>

      {/* Legend Sidebar */}
      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-8">
          <MapLegend />
        </div>
      </div>
    </div>
  );
}
