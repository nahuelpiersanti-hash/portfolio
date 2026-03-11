export type OperationalDomainId = 
  | 'operational-systems'
  | 'platforms'
  | 'websites'
  | 'experiments'
  | 'field-notes'
  | 'architecture';

export interface Domain {
  id: OperationalDomainId;
  name: string;
  color: string;
  position: number; // 0-5, slice position
}

export const DOMAINS: Domain[] = [
  { id: 'operational-systems', name: 'Operational Systems', color: '#3b82f6', position: 0 },
  { id: 'platforms', name: 'Platforms', color: '#8b5cf6', position: 1 },
  { id: 'websites', name: 'Websites', color: '#06b6d4', position: 2 },
  { id: 'experiments', name: 'Experiments', color: '#f59e0b', position: 3 },
  { id: 'field-notes', name: 'Field Notes', color: '#10b981', position: 4 },
  { id: 'architecture', name: 'Architecture', color: '#ef4444', position: 5 },
];
