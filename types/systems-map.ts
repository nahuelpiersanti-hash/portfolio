// Types for the Systems Map

export type OperationalDomainId = 
  | 'institutional-operations'
  | 'media-infrastructure'
  | 'content-infrastructure'
  | 'experimental-systems';

export type SystemType = 
  | 'Built'           // Sistema construido desde cero
  | 'Evolved'         // Sistema existente significativamente modificado
  | 'Infrastructure'  // Capa de infraestructura/tooling
  | 'Experimental';   // Prototipos/exploración

export type SystemStatus = 
  | 'active'          // En producción activa
  | 'evolving'        // En desarrollo/evolución continua
  | 'experimental'    // En fase experimental
  | 'archived';       // Ya no en uso activo

export type RelationshipType = 
  | 'shared-domain'            // Operan en el mismo dominio
  | 'infrastructure-dependency' // Uno depende del otro técnicamente
  | 'conceptual-evolution'     // Uno evolucionó del aprendizaje del otro
  | 'data-flow';               // Intercambian datos

export interface OperationalScale {
  users?: string;              // '50-100 active users'
  throughput?: string;         // '200GB/day media processing'
  transactions?: string;       // '~5K invoices/year'
  scope?: string;              // 'Single organization' | 'Multi-tenant'
}

export interface SystemRelationship {
  targetSystem: string;        // slug del sistema relacionado
  type: RelationshipType;
  description?: string;        // Contexto de la relación
}

export interface System {
  // Identificación
  slug: string;                    // 'navarro-competicion'
  name: string;                    // 'Digital Media Infrastructure'
  organization?: string;           // 'Navarro Competición' (opcional context)
  description: string;             // One-sentence operational role
  
  // Clasificación Operacional
  domains: OperationalDomainId[];  // ['media-infrastructure']
  systemType: SystemType;          // 'Built' | 'Evolved' | 'Infrastructure' | 'Experimental'
  
  // Metadata Operacional
  scale: OperationalScale;
  status: SystemStatus;            // 'active' | 'evolving' | 'experimental' | 'archived'
  timespan: string;                // '2021-present' | '2019-2021' | 'Q4 2023'
  
  // Contexto Técnico
  interventionPoint: string;       // Brief de qué problema resuelve
  keyCapability: string;           // Capacidad operacional principal
  
  // Relaciones
  relationships: SystemRelationship[];
  
  // Link al caso de estudio completo
  caseStudyPath: string;           // '/systems/navarro-competicion'
}

export interface DomainPosition {
  region: 'north' | 'east' | 'south' | 'west' | 'center';
}

export interface OperationalDomain {
  id: OperationalDomainId;
  label: string;
  description: string;         // Qué tipo de operaciones cubre
  color: string;              // Para visual coding sutil
  position: DomainPosition;   // Para layout del mapa
}
