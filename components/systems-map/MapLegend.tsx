export function MapLegend() {
  return (
    <aside className="border border-gray-300 bg-white p-6 text-sm">
      <h3 className="font-medium mb-4">How to Read This Map</h3>
      
      <div className="space-y-4">
        <section>
          <h4 className="text-xs font-mono uppercase tracking-wide text-gray-400 mb-2">
            Domains
          </h4>
          <p className="text-gray-700 leading-relaxed">
            Regions represent operational domains. Systems within a domain share operational context.
          </p>
        </section>
        
        <section>
          <h4 className="text-xs font-mono uppercase tracking-wide text-gray-400 mb-2">
            System Types
          </h4>
          <ul className="space-y-1 text-gray-700 font-mono text-xs">
            <li><strong>Built:</strong> Greenfield systems</li>
            <li><strong>Evolved:</strong> Significant modifications to existing platforms</li>
            <li><strong>Infrastructure:</strong> Tooling and platform layers</li>
            <li><strong>Experimental:</strong> Prototypes and research</li>
          </ul>
        </section>
        
        <section>
          <h4 className="text-xs font-mono uppercase tracking-wide text-gray-400 mb-2">
            System Status
          </h4>
          <ul className="space-y-1 text-gray-700 font-mono text-xs">
            <li><span className="text-green-600">●</span> Active: In production</li>
            <li><span className="text-blue-600">●</span> Evolving: Under development</li>
            <li><span className="text-yellow-600">●</span> Experimental: In research phase</li>
            <li><span className="text-gray-400">●</span> Archived: No longer active</li>
          </ul>
        </section>
        
        <section className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Click any system to view full case study.
          </p>
        </section>
      </div>
    </aside>
  );
}
