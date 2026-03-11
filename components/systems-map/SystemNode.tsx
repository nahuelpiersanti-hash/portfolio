import { System } from '@/types/systems-map';
import Link from 'next/link';

interface SystemNodeProps {
  system: System;
}

const statusConfig = {
  active: { symbol: '●', color: 'text-green-600', label: 'Active' },
  evolving: { symbol: '●', color: 'text-blue-600', label: 'Evolving' },
  experimental: { symbol: '●', color: 'text-yellow-600', label: 'Experimental' },
  archived: { symbol: '●', color: 'text-gray-400', label: 'Archived' }
};

export function SystemNode({ system }: SystemNodeProps) {
  const statusInfo = statusConfig[system.status];

  return (
    <Link 
      href={system.caseStudyPath}
      className="block border border-gray-300 hover:border-gray-900 transition-colors bg-white"
      title={system.description}
    >
      <div className="p-4">
        {/* Header */}
        <div className="mb-3">
          {system.organization && (
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {system.organization}
            </div>
          )}
          <h3 className="font-medium text-sm leading-tight">
            {system.name}
          </h3>
        </div>

        {/* Metadata */}
        <div className="space-y-1 text-xs font-mono text-gray-600">
          <div className="flex justify-between">
            <span className="text-gray-400">Type:</span>
            <span>{system.systemType}</span>
          </div>
          
          {system.scale.users && (
            <div className="flex justify-between">
              <span className="text-gray-400">Scale:</span>
              <span className="text-right">{system.scale.users}</span>
            </div>
          )}
          
          {system.scale.throughput && (
            <div className="flex justify-between">
              <span className="text-gray-400"></span>
              <span className="text-right">{system.scale.throughput}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center pt-1">
            <span className="text-gray-400">Status:</span>
            <span className="flex items-center gap-1">
              <span className={statusInfo.color}>{statusInfo.symbol}</span>
              <span>{statusInfo.label}</span>
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">Since:</span>
            <span>{system.timespan}</span>
          </div>
        </div>

        {/* Footer hint */}
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
          → View case study
        </div>
      </div>
    </Link>
  );
}
