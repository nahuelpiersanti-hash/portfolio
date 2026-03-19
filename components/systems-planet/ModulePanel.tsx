import React from 'react';
import { ModuleContent } from '@/types/module-content';

interface ModulePanelProps {
  moduleId: string;
  content: ModuleContent;
}

export const ModulePanel: React.FC<ModulePanelProps> = ({ moduleId, content }) => {
  return (
    <aside
      className="fixed top-0 right-0 h-full w-[340px] z-30 bg-slate-900/95 border-l border-cyan-400/10 shadow-xl flex flex-col transition-all duration-400 ease-out animate-slide-in"
      style={{
        transform: 'translateX(0)',
        opacity: 1,
      }}
    >
      {/* HEADER */}
      <div className="border-b border-cyan-400/10 px-6 py-4 flex items-center justify-between font-sans">
        <div>
          <span className="font-mono text-xs text-cyan-400 tracking-widest">{moduleId}</span>
          <h2 className="font-sans text-2xl mt-1 mb-1 text-cyan-100 font-bold">{content.system}</h2>
          <div className="font-mono text-sm text-cyan-300">{content.visualLabel || content.system}</div>
        </div>
      </div>
      {/* BODY */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Visual placeholder */}
        <div className="w-full aspect-video bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg mb-6 flex items-center justify-center font-mono text-cyan-400 text-lg border border-cyan-400/10">
          {content.visualLabel || content.system}
        </div>
        {/* Problem */}
        <div className="mb-4">
          <div className="font-mono text-xs text-cyan-300 mb-1">Problem</div>
          <div className="text-cyan-100 text-base">{content.problem}</div>
        </div>
        {/* System */}
        <div className="mb-4">
          <div className="font-mono text-xs text-cyan-300 mb-1">System</div>
          <div className="text-cyan-100 text-base">{content.system}</div>
        </div>
        {/* Capabilities */}
        <div className="mb-4">
          <div className="font-mono text-xs text-cyan-300 mb-1">Capabilities</div>
          <div className="flex flex-wrap gap-2">
            {content.capabilities.map((cap, idx) => (
              <span key={idx} className="border border-cyan-400/20 text-cyan-400 rounded px-2 py-1 font-mono text-xs bg-cyan-400/5">{cap}</span>
            ))}
          </div>
        </div>
        {/* Result */}
        <div className="mb-4 border-l-2 border-cyan-400 pl-3 bg-cyan-400/5 rounded">
          <div className="font-mono text-xs text-cyan-300 mb-1">Result</div>
          <div className="text-cyan-100 text-base">{content.result}</div>
        </div>
        {/* Deployed In */}
        {content.deployedIn && (
          <div className="mb-4">
            <div className="font-mono text-xs text-cyan-300 mb-1">Deployed In</div>
            <div className="text-cyan-100 text-base">{content.deployedIn}</div>
          </div>
        )}
        {/* Connected Modules */}
        {content.connectedModules.length > 0 && (
          <div className="mb-4">
            <div className="font-mono text-xs text-cyan-300 mb-1">Connected Modules</div>
            <ul className="pl-0 list-none">
              {content.connectedModules.map((mod, idx) => (
                <li key={idx} className="mb-1">
                  <button className="text-cyan-400 font-mono text-xs bg-none border-none underline cursor-pointer">
                    {mod.name} <span className="text-cyan-300 text-xs">({mod.type})</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {/* FOOTER */}
      <div className="border-t border-cyan-400/10 px-6 py-4 flex gap-3 bg-slate-900/95">
        <button className="bg-cyan-400 text-slate-900 font-sans text-base rounded px-4 py-2 font-semibold cursor-pointer">Start a conversation</button>
        <button className="bg-none text-cyan-400 font-sans text-base border border-cyan-400 rounded px-4 py-2 font-semibold cursor-pointer">Request architecture review</button>
      </div>
    </aside>
  );
};
