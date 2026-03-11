import { systems } from './systems';

export { operationalDomains } from './domains';
export { systems } from './systems';

export function getSystemsByDomain(domainId: string) {
  return systems.filter(system => system.domains.includes(domainId as any));
}

export function getSystemBySlug(slug: string) {
  return systems.find(system => system.slug === slug);
}
