import { OperationalDomain } from '@/types/systems-map';

export const operationalDomains: OperationalDomain[] = [
  {
    id: 'institutional-operations',
    label: 'Institutional Operations',
    description: 'Administrative, financial, and organizational systems',
    color: 'blue',
    position: { region: 'north' }
  },
  {
    id: 'media-infrastructure',
    label: 'Media Infrastructure',
    description: 'Digital media capture, processing, and distribution',
    color: 'purple',
    position: { region: 'east' }
  },
  {
    id: 'content-infrastructure',
    label: 'Content Infrastructure',
    description: 'Content management, publishing, and delivery systems',
    color: 'green',
    position: { region: 'west' }
  },
  {
    id: 'experimental-systems',
    label: 'Experimental Systems',
    description: 'Prototypes, experiments, and research systems',
    color: 'gray',
    position: { region: 'south' }
  }
];
