import React, { useState, useRef, useEffect } from 'react';
import { CircuitComponent, ComponentType, Point } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface CircuitCanvasProps {
  components: CircuitComponent[];
  setComponents: React.Dispatch<React.SetStateAction<CircuitComponent[]>>;
  onSelect: (id: string | null) => void;
  selectedId: string | null;
  showCurrent: boolean;
}

const SNAP_RADIUS = 15;

const CircuitCanvas: React.FC<CircuitCanvasProps> = ({ components, setComponents, onSelect, selectedId, showCurrent }) => {
  const { t } = useLanguage();
  // Dragging State
  const [dragState, setDragState] = useState<{
    type: 'COMPONENT' | 'HANDLE';
    compId: string;
    handle?: 'p1' | 'p2';
    startX: number;
    startY: number;
    initialP1: {x: number, y: number};
    initialP2: {x: number, y: number};
    hasMoved: boolean;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // Helper: Get SVG coordinates
  const getMousePos = (e: React.MouseEvent | MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return {
      x: (e.clientX - CTM.e) / CTM.a,
      y: (e.clientY - CTM.f) / CTM.d
    };
  };

  const handleMouseDown = (e: React.MouseEvent, compId: string, handle?: 'p1' | 'p2') => {
    e.stopPropagation();
    const pos = getMousePos(e);
    const comp = components.find(c => c.id === compId);
    if (!comp) return;

    if (!handle) {
      onSelect(compId); // Select body
    }

    setDragState({
      type: handle ? 'HANDLE' : 'COMPONENT',
      compId,
      handle,
      startX: pos.x,
      startY: pos.y,
      initialP1: { ...comp.p1 },
      initialP2: { ...comp.p2 },
      hasMoved: false
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragState) return;
    const pos = getMousePos(e);
    const dx = pos.x - dragState.startX;
    const dy = pos.y - dragState.startY;

    // Threshold check to distinguish click from drag
    if (!dragState.hasMoved) {
        if (Math.hypot(dx, dy) < 5) return; // Ignore micro-movements
        setDragState(prev => prev ? ({ ...prev, hasMoved: true }) : null);
        return; // Wait for re-render with hasMoved=true
    }

    setComponents(prev => prev.map(c => {
      if (c.id !== dragState.compId) return c;

      // Move single handle
      if (dragState.type === 'HANDLE' && dragState.handle) {
        return {
          ...c,
          [dragState.handle]: {
            ...c[dragState.handle],
            x: dragState.handle === 'p1' ? dragState.initialP1.x + dx : dragState.initialP2.x + dx,
            y: dragState.handle === 'p1' ? dragState.initialP1.y + dy : dragState.initialP2.y + dy,
          }
        };
      }
      
      // Move whole component
      if (dragState.type === 'COMPONENT') {
        return {
          ...c,
          p1: { ...c.p1, x: dragState.initialP1.x + dx, y: dragState.initialP1.y + dy },
          p2: { ...c.p2, x: dragState.initialP2.x + dx, y: dragState.initialP2.y + dy },
        };
      }
      return c;
    }));
  };

  const handleMouseUp = () => {
    if (!dragState) {
        setDragState(null);
        return;
    }

    if (!dragState.hasMoved) {
        // Handle Click - Toggle Switch
        if (dragState.type === 'COMPONENT') {
            const comp = components.find(c => c.id === dragState.compId);
            if (comp?.type === ComponentType.SWITCH) {
                setComponents(prev => prev.map(c => 
                    c.id === comp.id 
                    ? { ...c, properties: { ...c.properties, isOpen: !c.properties.isOpen } }
                    : c
                ));
            }
        }
        setDragState(null);
        return;
    }

    // Snapping Logic (only if moved)
    setComponents(prev => {
        const nextComps = JSON.parse(JSON.stringify(prev)) as CircuitComponent[];
        const activeComp = nextComps.find(c => c.id === dragState.compId);
        if(!activeComp) return prev;

        const handlesToCheck = dragState.type === 'COMPONENT' 
            ? [activeComp.p1, activeComp.p2] 
            : [dragState.handle === 'p1' ? activeComp.p1 : activeComp.p2];

        handlesToCheck.forEach(handle => {
            for (const other of nextComps) {
                if (other.id === activeComp.id) continue;
                
                const dist1 = Math.hypot(handle.x - other.p1.x, handle.y - other.p1.y);
                if (dist1 < SNAP_RADIUS) {
                    handle.x = other.p1.x;
                    handle.y = other.p1.y;
                    continue;
                }

                const dist2 = Math.hypot(handle.x - other.p2.x, handle.y - other.p2.y);
                if (dist2 < SNAP_RADIUS) {
                    handle.x = other.p2.x;
                    handle.y = other.p2.y;
                    continue;
                }
            }
        });

        return nextComps;
    });

    setDragState(null);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState]);

  // --- RENDERERS ---

  const renderWire = (c: CircuitComponent) => {
    const isSelected = selectedId === c.id;
    return (
      <g key={c.id} onMouseDown={(e) => handleMouseDown(e, c.id)} onClick={(e) => e.stopPropagation()} className="cursor-move">
        {isSelected && (
           <line x1={c.p1.x} y1={c.p1.y} x2={c.p2.x} y2={c.p2.y} stroke="#60A5FA" strokeWidth="12" strokeLinecap="round" opacity="0.5" />
        )}
        <line x1={c.p1.x} y1={c.p1.y} x2={c.p2.x} y2={c.p2.y} stroke={c.type === ComponentType.WIRE ? "#374151" : "#9CA3AF"} strokeWidth="4" strokeLinecap="round" />
        
        {showCurrent && Math.abs(c.current) > 0.01 && (
           <circle r="3" fill="#FCD34D">
             <animateMotion dur={`${Math.max(0.2, 1/Math.abs(c.current * 5))}s`} repeatCount="indefinite" path={`M${c.current > 0 ? c.p1.x : c.p2.x},${c.current > 0 ? c.p1.y : c.p2.y} L${c.current > 0 ? c.p2.x : c.p1.x},${c.current > 0 ? c.p2.y : c.p1.y}`} />
           </circle>
        )}
      </g>
    );
  };

  const renderResistor = (c: CircuitComponent) => {
    const isSelected = selectedId === c.id;
    const angle = Math.atan2(c.p2.y - c.p1.y, c.p2.x - c.p1.x) * 180 / Math.PI;
    const cx = (c.p1.x + c.p2.x) / 2;
    const cy = (c.p1.y + c.p2.y) / 2;
    const shouldFlipText = Math.abs(angle) > 90;

    return (
        <g key={c.id} onMouseDown={(e) => handleMouseDown(e, c.id)} onClick={(e) => e.stopPropagation()} className="cursor-move">
           {isSelected && <rect x={cx - 25} y={cy - 10} width="50" height="20" fill="none" stroke="#60A5FA" strokeWidth="3" transform={`rotate(${angle} ${cx} ${cy})`} />}
           <line x1={c.p1.x} y1={c.p1.y} x2={c.p2.x} y2={c.p2.y} stroke="#374151" strokeWidth="4" />
           <g transform={`translate(${cx},${cy}) rotate(${angle})`}>
             <path d="M-20,0 L-15,-8 L-5,8 L5,-8 L15,8 L20,0" fill="none" stroke="#D97706" strokeWidth="4" strokeLinejoin="round"/>
             <text 
                y="-15" 
                textAnchor="middle" 
                className="text-xs select-none fill-gray-600 font-bold"
                transform={shouldFlipText ? "rotate(180)" : ""}
             >
                {c.properties.resistance}Ω
             </text>
           </g>
           {showCurrent && Math.abs(c.current) > 0.01 && (
             <circle r="3" fill="#FCD34D">
                <animateMotion dur={`${Math.max(0.2, 1/Math.abs(c.current * 5))}s`} repeatCount="indefinite" path={`M${c.current > 0 ? c.p1.x : c.p2.x},${c.current > 0 ? c.p1.y : c.p2.y} L${c.current > 0 ? c.p2.x : c.p1.x},${c.current > 0 ? c.p2.y : c.p1.y}`} />
             </circle>
           )}
        </g>
    );
  };

  const renderCapacitor = (c: CircuitComponent) => {
    const isSelected = selectedId === c.id;
    const angle = Math.atan2(c.p2.y - c.p1.y, c.p2.x - c.p1.x) * 180 / Math.PI;
    const cx = (c.p1.x + c.p2.x) / 2;
    const cy = (c.p1.y + c.p2.y) / 2;
    const shouldFlipText = Math.abs(angle) > 90;

    return (
        <g key={c.id} onMouseDown={(e) => handleMouseDown(e, c.id)} onClick={(e) => e.stopPropagation()} className="cursor-move">
           {isSelected && <rect x={cx - 20} y={cy - 20} width="40" height="40" fill="none" stroke="#60A5FA" strokeWidth="3" transform={`rotate(${angle} ${cx} ${cy})`} />}
           <line x1={c.p1.x} y1={c.p1.y} x2={cx - 6 * Math.cos(angle*Math.PI/180)} y2={cy - 6 * Math.sin(angle*Math.PI/180)} stroke="#374151" strokeWidth="4" />
           <line x1={c.p2.x} y1={c.p2.y} x2={cx + 6 * Math.cos(angle*Math.PI/180)} y2={cy + 6 * Math.sin(angle*Math.PI/180)} stroke="#374151" strokeWidth="4" />
           
           <g transform={`translate(${cx},${cy}) rotate(${angle})`}>
             <line x1="-6" y1="-15" x2="-6" y2="15" stroke="#374151" strokeWidth="4" />
             <line x1="6" y1="-15" x2="6" y2="15" stroke="#374151" strokeWidth="4" />
             <text 
                y="-20" 
                textAnchor="middle" 
                className="text-xs select-none fill-gray-600 font-bold"
                transform={shouldFlipText ? "rotate(180)" : ""}
             >
                {(c.properties.capacitance || 0) * 1000000}µF
             </text>
           </g>
        </g>
    );
  };

  const renderInductor = (c: CircuitComponent) => {
    const isSelected = selectedId === c.id;
    const angle = Math.atan2(c.p2.y - c.p1.y, c.p2.x - c.p1.x) * 180 / Math.PI;
    const cx = (c.p1.x + c.p2.x) / 2;
    const cy = (c.p1.y + c.p2.y) / 2;
    const shouldFlipText = Math.abs(angle) > 90;

    return (
        <g key={c.id} onMouseDown={(e) => handleMouseDown(e, c.id)} onClick={(e) => e.stopPropagation()} className="cursor-move">
           {isSelected && <rect x={cx - 25} y={cy - 15} width="50" height="30" fill="none" stroke="#60A5FA" strokeWidth="3" transform={`rotate(${angle} ${cx} ${cy})`} />}
           <line x1={c.p1.x} y1={c.p1.y} x2={c.p2.x} y2={c.p2.y} stroke="#374151" strokeWidth="4" />
           <g transform={`translate(${cx},${cy}) rotate(${angle})`}>
             {/* Simple representation of coils */}
             <rect x="-20" y="-8" width="40" height="16" fill="#374151" rx="8" />
             <rect x="-16" y="-5" width="32" height="10" fill="#fff" rx="4" />
             <path d="M-15,-5 A 5 5 0 0 1 -5 -5 M -5,-5 A 5 5 0 0 1 5 -5 M 5,-5 A 5 5 0 0 1 15 -5" fill="none" stroke="#374151" strokeWidth="2" />
             <text 
                y="-15" 
                textAnchor="middle" 
                className="text-xs select-none fill-gray-600 font-bold"
                transform={shouldFlipText ? "rotate(180)" : ""}
             >
                {c.properties.inductance}H
             </text>
           </g>
        </g>
    );
  };

  const renderBattery = (c: CircuitComponent) => {
      const isSelected = selectedId === c.id;
      const angle = Math.atan2(c.p2.y - c.p1.y, c.p2.x - c.p1.x) * 180 / Math.PI;
      const cx = (c.p1.x + c.p2.x) / 2;
      const cy = (c.p1.y + c.p2.y) / 2;
      const shouldFlipText = Math.abs(angle) > 90;
  
      return (
          <g key={c.id} onMouseDown={(e) => handleMouseDown(e, c.id)} onClick={(e) => e.stopPropagation()} className="cursor-move">
             {isSelected && <rect x={cx - 20} y={cy - 15} width="40" height="30" fill="none" stroke="#60A5FA" strokeWidth="3" transform={`rotate(${angle} ${cx} ${cy})`} />}
             <line x1={c.p1.x} y1={c.p1.y} x2={c.p2.x} y2={c.p2.y} stroke="#374151" strokeWidth="4" />
             <g transform={`translate(${cx},${cy}) rotate(${angle})`}>
                <line x1="-5" y1="-15" x2="-5" y2="15" stroke="#000" strokeWidth="2" /> 
                <line x1="5" y1="-8" x2="5" y2="8" stroke="#000" strokeWidth="4" /> 
                <text x="-15" y="5" className="text-xs font-bold select-none" fill="#EF4444">+</text>
                <text 
                    y="-20" 
                    textAnchor="middle" 
                    className="text-xs select-none fill-gray-600 font-bold"
                    transform={shouldFlipText ? "rotate(180)" : ""}
                >
                    {c.properties.voltage}V
                </text>
             </g>
          </g>
      );
  };

  const renderBulb = (c: CircuitComponent) => {
    const isSelected = selectedId === c.id;
    const angle = Math.atan2(c.p2.y - c.p1.y, c.p2.x - c.p1.x) * 180 / Math.PI;
    const cx = (c.p1.x + c.p2.x) / 2;
    const cy = (c.p1.y + c.p2.y) / 2;
    const power = (c.current * c.current) * (c.properties.resistance || 10);
    const brightness = Math.min(1, power / 2); 

    return (
        <g key={c.id} onMouseDown={(e) => handleMouseDown(e, c.id)} onClick={(e) => e.stopPropagation()} className="cursor-move">
           <line x1={c.p1.x} y1={c.p1.y} x2={c.p2.x} y2={c.p2.y} stroke="#374151" strokeWidth="4" />
           <g transform={`translate(${cx},${cy}) rotate(${angle})`}>
             {brightness > 0.01 && (
                 <circle r={15 + brightness * 20} fill={`rgba(253, 224, 71, ${brightness})`} filter="blur(4px)" />
             )}
             <circle r="12" fill={brightness > 0.1 ? "#FEF3C7" : "#F3F4F6"} stroke={isSelected ? "#60A5FA" : "#4B5563"} strokeWidth="2" />
             <path d="M-5,5 Q0,-5 5,5" fill="none" stroke="#D97706" strokeWidth="1.5" />
           </g>
        </g>
    );
  };

  const renderSwitch = (c: CircuitComponent) => {
    const isSelected = selectedId === c.id;
    const angle = Math.atan2(c.p2.y - c.p1.y, c.p2.x - c.p1.x) * 180 / Math.PI;
    const cx = (c.p1.x + c.p2.x) / 2;
    const cy = (c.p1.y + c.p2.y) / 2;

    return (
        <g key={c.id} onMouseDown={(e) => handleMouseDown(e, c.id)} onClick={(e) => e.stopPropagation()} className="cursor-pointer">
             {isSelected && <circle r="20" cx={cx} cy={cy} fill="none" stroke="#60A5FA" strokeWidth="2" />}
             <line x1={c.p1.x} y1={c.p1.y} x2={cx - 10 * Math.cos(angle*Math.PI/180)} y2={cy - 10 * Math.sin(angle*Math.PI/180)} stroke="#374151" strokeWidth="4" strokeLinecap="round" />
             <line x1={c.p2.x} y1={c.p2.y} x2={cx + 10 * Math.cos(angle*Math.PI/180)} y2={cy + 10 * Math.sin(angle*Math.PI/180)} stroke="#374151" strokeWidth="4" strokeLinecap="round" />

             <g transform={`translate(${cx},${cy}) rotate(${angle})`}>
                 <line 
                    x1="-10" y1="0" 
                    x2="10" y2="0" 
                    stroke="#4B5563" 
                    strokeWidth="3" 
                    transform={c.properties.isOpen ? "rotate(-30 -10 0)" : "rotate(0 -10 0)"} 
                    className="transition-transform duration-200"
                 />
                 <circle cx="-10" cy="0" r="2" fill="#9CA3AF" />
                 <circle cx="10" cy="0" r="2" fill="#9CA3AF" />
             </g>
        </g>
    );
  };

  const renderAmmeter = (c: CircuitComponent) => {
    const isSelected = selectedId === c.id;
    const cx = (c.p1.x + c.p2.x) / 2;
    const cy = (c.p1.y + c.p2.y) / 2;

    return (
        <g key={c.id} onMouseDown={(e) => handleMouseDown(e, c.id)} onClick={(e) => e.stopPropagation()} className="cursor-move">
            {isSelected && <circle cx={cx} cy={cy} r="18" fill="none" stroke="#60A5FA" strokeWidth="3" />}
            <line x1={c.p1.x} y1={c.p1.y} x2={c.p2.x} y2={c.p2.y} stroke="#374151" strokeWidth="4" />
            <circle cx={cx} cy={cy} r="14" fill="#E5E7EB" stroke="#4B5563" strokeWidth="2" />
            <text x={cx} y={cy} dy="5" textAnchor="middle" className="text-xs font-bold select-none fill-gray-800">A</text>
            {/* Reading Preview */}
            <text x={cx} y={cy - 20} textAnchor="middle" className="text-[10px] font-mono select-none fill-gray-500">{Math.abs(c.current).toFixed(2)}A</text>
        </g>
    );
  };

  const renderVoltmeter = (c: CircuitComponent) => {
    const isSelected = selectedId === c.id;
    const cx = (c.p1.x + c.p2.x) / 2;
    const cy = (c.p1.y + c.p2.y) / 2;

    return (
        <g key={c.id} onMouseDown={(e) => handleMouseDown(e, c.id)} onClick={(e) => e.stopPropagation()} className="cursor-move">
            {isSelected && <circle cx={cx} cy={cy} r="18" fill="none" stroke="#60A5FA" strokeWidth="3" />}
            <line x1={c.p1.x} y1={c.p1.y} x2={c.p2.x} y2={c.p2.y} stroke="#374151" strokeWidth="4" />
            <circle cx={cx} cy={cy} r="14" fill="#E5E7EB" stroke="#4B5563" strokeWidth="2" />
            <text x={cx} y={cy} dy="5" textAnchor="middle" className="text-xs font-bold select-none fill-gray-800">V</text>
            {/* Reading Preview */}
            <text x={cx} y={cy - 20} textAnchor="middle" className="text-[10px] font-mono select-none fill-gray-500">{Math.abs(c.voltageDrop).toFixed(2)}V</text>
        </g>
    );
  };

  return (
    <div className="flex-1 relative bg-gray-50 overflow-hidden">
      <svg 
        ref={svgRef}
        className="w-full h-full block"
        onClick={() => onSelect(null)}
      >
        <defs>
           <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E7EB" strokeWidth="1"/>
           </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Render Components */}
        {components.map(c => {
            switch(c.type) {
                case ComponentType.RESISTOR: return renderResistor(c);
                case ComponentType.BATTERY: return renderBattery(c);
                case ComponentType.LIGHTBULB: return renderBulb(c);
                case ComponentType.SWITCH: return renderSwitch(c);
                case ComponentType.CAPACITOR: return renderCapacitor(c);
                case ComponentType.INDUCTOR: return renderInductor(c);
                case ComponentType.WIRE: return renderWire(c);
                case ComponentType.AMMETER: return renderAmmeter(c);
                case ComponentType.VOLTMETER: return renderVoltmeter(c);
                default: return renderWire(c);
            }
        })}

        {/* Render Handles */}
        {components.map(c => (
          <g key={`handles-${c.id}`}>
             <circle 
                cx={c.p1.x} cy={c.p1.y} r="6" 
                fill="rgba(59, 130, 246, 0.2)" stroke="#3B82F6" strokeWidth="1"
                className="hover:fill-blue-500 cursor-move"
                onMouseDown={(e) => handleMouseDown(e, c.id, 'p1')}
                onClick={(e) => e.stopPropagation()}
             />
             <circle 
                cx={c.p2.x} cy={c.p2.y} r="6" 
                fill="rgba(59, 130, 246, 0.2)" stroke="#3B82F6" strokeWidth="1"
                className="hover:fill-blue-500 cursor-move"
                onMouseDown={(e) => handleMouseDown(e, c.id, 'p2')}
                onClick={(e) => e.stopPropagation()}
             />
          </g>
        ))}

      </svg>

      <div className="absolute bottom-4 left-4 bg-white/90 p-2 rounded shadow text-xs text-gray-500 pointer-events-none">
        {t('app.dragToMove')}
      </div>
    </div>
  );
};

export default CircuitCanvas;