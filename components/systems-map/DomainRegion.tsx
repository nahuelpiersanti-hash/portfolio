import { OperationalDomain } from '@/types/systems-map';
import { System } from '@/types/systems-map';
import { SystemNode } from './SystemNode';

interface DomainRegionProps {
  domain: OperationalDomain;
  systems: System[];
}

export function DomainRegion({ domain, systems }: DomainRegionProps) {
  if (systems.length === 0) {
    return null;
  }

  return (
    <section className="border-2 border-gray-900 bg-gray-50/50 p-6">
      {/* Domain Header */}
      <div className="mb-6">
        <h2 className="text-xs font-mono uppercase tracking-widest text-gray-900 mb-1">
          {domain.label}
        </h2>
        <p className="text-sm text-gray-600">
          {domain.description}
        </p>
      </div>

      {/* Systems Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {systems.map((system) => (
          <SystemNode key={system.slug} system={system} />
        ))}
      </div>
    </section>
  );
}
