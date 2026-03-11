import { System } from '@/types/systems-map';

export const systems: System[] = [
  {
    slug: 'navarro-competicion',
    name: 'Digital Media Infrastructure',
    organization: 'Navarro Competición',
    description: 'Real-time content capture and distribution pipeline for race operations',
    domains: ['media-infrastructure'],
    systemType: 'Built',
    scale: {
      users: '50-100 active users',
      throughput: '~200GB/day media processing',
      scope: 'Single organization'
    },
    status: 'active',
    timespan: '2021-present',
    interventionPoint: 'Real-time race content capture and distribution',
    keyCapability: 'Race-day content delivery pipeline',
    relationships: [],
    caseStudyPath: '/systems/navarro-competicion-digital-media-infrastructure'
  },
  {
    slug: 'ovt-platform',
    name: 'Operational Platform Evolution',
    organization: 'OVT',
    description: 'Unified operational platform consolidating administrative and content workflows',
    domains: ['institutional-operations', 'content-infrastructure'],
    systemType: 'Evolved',
    scale: {
      users: '~200 internal users',
      transactions: '~5K invoices/year',
      scope: 'Multi-department'
    },
    status: 'evolving',
    timespan: '2019-2023',
    interventionPoint: 'Legacy system modernization and operational consolidation',
    keyCapability: 'Unified operational platform',
    relationships: [
      {
        targetSystem: 'navarro-competicion',
        type: 'conceptual-evolution',
        description: 'Informed approach to operational system design'
      }
    ],
    caseStudyPath: '/systems/ovt-operational-platform-evolution'
  }
];
