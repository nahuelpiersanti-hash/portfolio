'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface ModuleOverlayProps {
  moduleId: string;
  content: {
    index: string;
    category: string;
    title: string;
    type: string;
    problem: string;
    system: string;
    capabilities: string[];
    result: string;
    connectedModules: Array<{ name: string; type: string }>;
  };
  onClose: () => void;
}

export const ModuleOverlay: React.FC<ModuleOverlayProps> = ({ moduleId, content, onClose }) => {
  const [phase, setPhase] = useState<'entering' | 'closing'>('entering');
  const scanRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t1 = setTimeout(() => {
      if (scanRef.current) {
        scanRef.current.style.animation = 'none';
        void scanRef.current.offsetHeight;
        scanRef.current.style.animation = 'scanDown 1.2s linear forwards';
        scanRef.current.style.opacity = '1';
      }
    }, 500);
    return () => clearTimeout(t1);
  }, []);

  const handleClose = () => {
    setPhase('closing');
    setTimeout(onClose, 800);
  };

  const overlayAnimation = phase === 'closing'
    ? 'holoClose 0.8s ease forwards'
    : 'holoMaterialize 1.2s cubic-bezier(0.16,1,0.3,1) forwards';

  return (
    <>
      <style>{`
        .holo-overlay::-webkit-scrollbar { display: none; }
        .holo-body::-webkit-scrollbar { display: none; }
        @keyframes holoMaterialize {
          0%   { opacity:0; transform:translate(-50%,-50%) scale(0.1); filter:blur(12px) brightness(3); clip-path:inset(50% 0 50% 0); }
          30%  { opacity:0.8; filter:blur(4px) brightness(1.8); clip-path:inset(20% 0 20% 0); }
          60%  { opacity:1; filter:blur(1px) brightness(1.2); clip-path:inset(5% 0 5% 0); }
          100% { opacity:1; transform:translate(-50%,-50%) scale(1); filter:blur(0) brightness(1); clip-path:inset(0% 0 0% 0); }
        }
        @keyframes holoClose {
          0%   { opacity:1; transform:translate(-50%,-50%) scale(1); filter:blur(0) brightness(1); clip-path:inset(0% 0 0% 0); }
          40%  { opacity:0.8; filter:blur(1px) brightness(1.2); clip-path:inset(5% 0 5% 0); }
          70%  { opacity:0.4; filter:blur(4px) brightness(1.8); clip-path:inset(20% 0 20% 0); }
          100% { opacity:0; transform:translate(-50%,-50%) scale(0.1); filter:blur(12px) brightness(3); clip-path:inset(50% 0 50% 0); }
        }
        @keyframes scanDown {
          0%   { top:0; opacity:0.8; }
          80%  { opacity:0.6; }
          100% { top:100%; opacity:0; }
        }
        @keyframes energyflow {
          0%,100% { opacity:0.4; }
          50%     { opacity:1; }
        }
        @keyframes blink {
          0%,100% { opacity:1; }
          50%     { opacity:0.2; }
        }
      `}</style>

      <div
        className="holo-overlay"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          width: '300px',
          maxHeight: '80vh',
          overflowY: 'auto',
          background: 'rgba(3,13,22,0.75)',
          border: '1px solid rgba(0,213,255,0.18)',
          boxShadow: '0 0 40px rgba(0,213,255,0.1)',
          zIndex: 50,
          borderRadius: '2px',
          display: 'flex',
          flexDirection: 'column',
          animation: overlayAnimation,
          scrollbarWidth: 'none' as const,
          msOverflowStyle: 'none' as const,
        }}
      >
        {/* Scanline */}
        <div
          ref={scanRef}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 2,
            background: 'rgba(0,213,255,0.5)',
            pointerEvents: 'none',
            zIndex: 20,
            opacity: 0,
            top: 0,
          }}
        />

        {/* Top energy line */}
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, #00d5ff, #00d5ff, transparent)',
          animation: 'energyflow 2s ease-in-out infinite',
          flexShrink: 0,
        }} />

        {/* Header */}
        <div style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid rgba(0,213,255,0.1)',
          position: 'relative',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 9,
              color: '#00d5ff',
              letterSpacing: '0.2em',
              opacity: 0.7,
            }}>
              {content.index}
            </span>
            <span style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 9,
              color: 'rgba(140,190,215,0.5)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}>
              {content.category}
            </span>
            <div style={{
              width: 5,
              height: 5,
              background: '#00d5ff',
              borderRadius: '50%',
              marginLeft: 'auto',
              boxShadow: '0 0 6px #00d5ff',
              animation: 'blink 2.5s ease-in-out infinite',
            }} />
          </div>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 24,
            fontWeight: 700,
            color: '#e8f4fd',
            lineHeight: 1.1,
            margin: '0 0 3px',
          }}>
            {content.title}
          </h1>
          <p style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 9,
            color: 'rgba(140,190,215,0.5)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            margin: 0,
          }}>
            {content.type}
          </p>
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              width: 22,
              height: 22,
              border: '1px solid rgba(0,213,255,0.2)',
              background: 'transparent',
              color: 'rgba(0,213,255,0.6)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontFamily: 'Share Tech Mono, monospace',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          className="holo-body"
          style={{
            padding: '14px 20px',
            overflowY: 'auto',
            flex: 1,
            scrollbarWidth: 'none' as const,
            msOverflowStyle: 'none' as const,
          }}
        >

          {/* Problem */}
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 8,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(0,213,255,0.5)',
              marginBottom: 6,
            }}>
              problem
            </div>
            <p style={{
              fontSize: 11,
              lineHeight: 1.75,
              color: 'rgba(195,228,245,0.7)',
              fontFamily: 'Barlow, sans-serif',
              fontWeight: 300,
              margin: 0,
            }}>
              {content.problem}
            </p>
          </div>

          {/* System */}
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 8,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(0,213,255,0.5)',
              marginBottom: 6,
            }}>
              system
            </div>
            <p style={{
              fontSize: 11,
              lineHeight: 1.75,
              color: 'rgba(195,228,245,0.7)',
              fontFamily: 'Barlow, sans-serif',
              fontWeight: 300,
              margin: 0,
            }}>
              {content.system}
            </p>
          </div>

          {/* Capabilities */}
          {content.capabilities.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 8,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'rgba(0,213,255,0.5)',
                marginBottom: 6,
              }}>
                capabilities
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {content.capabilities.map((cap, i) => (
                  <span key={i} style={{
                    fontFamily: 'Share Tech Mono, monospace',
                    fontSize: 8,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    border: '1px solid rgba(0,213,255,0.15)',
                    color: 'rgba(0,213,255,0.6)',
                    background: 'rgba(0,213,255,0.05)',
                  }}>
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Result */}
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 8,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(0,213,255,0.5)',
              marginBottom: 6,
            }}>
              result
            </div>
            <div style={{
              borderLeft: '2px solid #00d5ff',
              padding: '8px 12px',
              background: 'rgba(0,213,255,0.04)',
              border: '1px solid rgba(0,213,255,0.1)',
              borderLeftWidth: 2,
              borderLeftColor: '#00d5ff',
            }}>
              <p style={{
                fontSize: 11,
                lineHeight: 1.65,
                color: 'rgba(210,238,252,0.8)',
                fontStyle: 'italic',
                margin: 0,
                fontFamily: 'Barlow, sans-serif',
              }}>
                {content.result}
              </p>
            </div>
          </div>

          {/* Connected modules */}
          {content.connectedModules.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 8,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'rgba(0,213,255,0.5)',
                marginBottom: 6,
              }}>
                connected modules
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {content.connectedModules.map((mod, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 10px',
                    border: '1px solid rgba(0,213,255,0.1)',
                    cursor: 'pointer',
                  }}>
                    <div style={{
                      width: 4,
                      height: 4,
                      background: '#00d5ff',
                      borderRadius: '50%',
                      opacity: 0.4,
                    }} />
                    <span style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'rgba(195,228,245,0.65)',
                      flex: 1,
                      fontFamily: 'Barlow, sans-serif',
                    }}>
                      {mod.name}
                    </span>
                    <span style={{
                      fontFamily: 'Share Tech Mono, monospace',
                      fontSize: 8,
                      color: 'rgba(140,190,215,0.5)',
                      opacity: 0.45,
                    }}>
                      {mod.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(0,213,255,0.1)',
          display: 'flex',
          gap: 6,
          flexShrink: 0,
        }}>
          <button style={{
            flex: 1,
            padding: '8px',
            background: 'transparent',
            border: '1px solid rgba(0,213,255,0.4)',
            color: '#00d5ff',
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 8,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}>
            → Start a conversation
          </button>
          <button style={{
            flex: 1,
            padding: '8px',
            background: 'transparent',
            border: '1px solid rgba(0,213,255,0.12)',
            color: 'rgba(140,190,215,0.5)',
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 8,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}>
            Architecture review
          </button>
        </div>

      </div>
    </>
  );
};