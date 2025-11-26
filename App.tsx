import React, { useState, useEffect, useRef } from 'react';
import Toolbar from './components/Toolbar';
import CircuitCanvas from './components/CircuitCanvas';
import PropertiesPanel from './components/PropertiesPanel';
import AIAssistant from './components/AIAssistant';
import { CircuitComponent, ComponentType } from './types';
import { solveCircuit } from './utils/solver';
import { useLanguage } from './contexts/LanguageContext';

const App: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const [components, setComponents] = useState<CircuitComponent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(true);

  // Ref for simulation loop to avoid stale state in closures
  const componentsRef = useRef(components);
  useEffect(() => {
      componentsRef.current = components;
  }, [components]);

  // Add new component helper
  const handleAddComponent = (type: ComponentType) => {
    const id = Math.random().toString(36).substr(2, 9);
    const offset = components.length * 20;
    const newComponent: CircuitComponent = {
      id,
      type,
      p1: { x: 100 + offset, y: 100 + offset, id: `${id}-p1` },
      p2: { x: 200 + offset, y: 100 + offset, id: `${id}-p2` },
      properties: {
        resistance: (type === ComponentType.WIRE || type === ComponentType.AMMETER) ? 0 : 10,
        voltage: 9,
        isOpen: true, // Default switch to open
        capacitance: 0.001, // 1000uF default to be visible
        inductance: 1 // 1H
      },
      current: 0,
      voltageDrop: 0,
      p1Potential: 0,
      p2Potential: 0,
      prevCurrent: 0,
      prevP1Potential: 0,
      prevP2Potential: 0
    };
    setComponents(prev => [...prev, newComponent]);
    setSelectedId(id);
  };

  const handleLoadPreset = (preset: string) => {
      let newComponents: CircuitComponent[] = [];
      const createComp = (type: ComponentType, x1: number, y1: number, x2: number, y2: number, props: any = {}) => {
        const id = Math.random().toString(36).substr(2, 9);
        return {
            id, type, 
            p1: { x: x1, y: y1, id: `${id}-p1` },
            p2: { x: x2, y: y2, id: `${id}-p2` },
            properties: { resistance: 10, voltage: 9, isOpen: false, capacitance: 0.001, inductance: 1, ...props },
            current: 0, voltageDrop: 0, p1Potential: 0, p2Potential: 0,
            prevCurrent: 0, prevP1Potential: 0, prevP2Potential: 0
        };
      };

      if (preset === 'series') {
          newComponents = [
              createComp(ComponentType.BATTERY, 100, 300, 100, 100, { voltage: 12 }),
              createComp(ComponentType.WIRE, 100, 100, 300, 100),
              createComp(ComponentType.SWITCH, 300, 100, 400, 100, { isOpen: true }),
              createComp(ComponentType.RESISTOR, 400, 100, 400, 200, { resistance: 10 }),
              createComp(ComponentType.LIGHTBULB, 400, 200, 400, 300, { resistance: 10 }),
              createComp(ComponentType.WIRE, 400, 300, 100, 300)
          ];
      } else if (preset === 'parallel') {
          newComponents = [
            createComp(ComponentType.BATTERY, 100, 300, 100, 100, { voltage: 12 }),
            createComp(ComponentType.WIRE, 100, 100, 300, 100),
            createComp(ComponentType.SWITCH, 300, 100, 400, 100, { isOpen: true }),
            // Branch 1
            createComp(ComponentType.RESISTOR, 400, 100, 400, 300, { resistance: 20 }),
            // Branch 2
            createComp(ComponentType.WIRE, 400, 100, 550, 100),
            createComp(ComponentType.LIGHTBULB, 550, 100, 550, 300, { resistance: 20 }),
            createComp(ComponentType.WIRE, 550, 300, 400, 300),
            // Return
            createComp(ComponentType.WIRE, 400, 300, 100, 300)
          ];
      } else if (preset === 'rc') {
          newComponents = [
            createComp(ComponentType.BATTERY, 100, 300, 100, 100, { voltage: 9 }),
            createComp(ComponentType.SWITCH, 100, 100, 300, 100, { isOpen: true }),
            createComp(ComponentType.RESISTOR, 300, 100, 500, 100, { resistance: 100 }), // High R for visible time constant
            createComp(ComponentType.CAPACITOR, 500, 100, 500, 300, { capacitance: 0.005 }), // 5000uF
            createComp(ComponentType.WIRE, 500, 300, 100, 300)
          ];
      } else if (preset === 'rl') {
        newComponents = [
            createComp(ComponentType.BATTERY, 100, 300, 100, 100, { voltage: 9 }),
            createComp(ComponentType.SWITCH, 100, 100, 300, 100, { isOpen: true }),
            createComp(ComponentType.RESISTOR, 300, 100, 500, 100, { resistance: 10 }), 
            createComp(ComponentType.INDUCTOR, 500, 100, 500, 300, { inductance: 2 }), // 2H
            createComp(ComponentType.WIRE, 500, 300, 100, 300)
          ];
      }

      setComponents(newComponents);
      setSelectedId(null);
  };

  const handlePropertyChange = (id: string, changes: Partial<CircuitComponent['properties']>) => {
    setComponents(prev => prev.map(c => c.id === id ? { ...c, properties: { ...c.properties, ...changes } } : c));
  };

  const handleDelete = (id: string) => {
    setComponents(prev => prev.filter(c => c.id !== id));
    setSelectedId(null);
  };

  // Physics Loop (Transient Analysis)
  useEffect(() => {
    const SIMULATION_DT = 0.05; // 50ms simulation step per frame
    let animationFrameId: number;

    const loop = () => {
        const currentComps = componentsRef.current;
        
        // Solve circuit
        const { pointPotentials, componentCurrents } = solveCircuit(currentComps, SIMULATION_DT);

        // Update component state with results
        const nextComps = currentComps.map(c => {
            const newCurrent = componentCurrents.get(c.id) || 0;
            const p1V = pointPotentials.get(c.p1.id) || 0;
            const p2V = pointPotentials.get(c.p2.id) || 0;

            let drop = 0;
            if (c.type === ComponentType.BATTERY) drop = c.properties.voltage || 0;
            else if (c.type === ComponentType.VOLTMETER) drop = p1V - p2V; 
            else if (c.type === ComponentType.CAPACITOR) drop = p1V - p2V; // Vc
            else if (c.type === ComponentType.INDUCTOR) drop = p1V - p2V; // Vl
            else if (c.type === ComponentType.WIRE || c.type === ComponentType.SWITCH || c.type === ComponentType.AMMETER) drop = 0; 
            else drop = newCurrent * (c.properties.resistance || 0);

            return { 
                ...c, 
                current: newCurrent, 
                voltageDrop: drop,
                p1Potential: p1V,
                p2Potential: p2V,
                // Store history for next step (Backward Euler)
                prevCurrent: newCurrent,
                prevP1Potential: p1V,
                prevP2Potential: p2V
            };
        });
        
        // Only update React state if values changed significantly to save renders
        const hasChanged = nextComps.some((c, i) => {
            const old = currentComps[i];
            return Math.abs(c.current - old.current) > 0.0001 || Math.abs(c.voltageDrop - old.voltageDrop) > 0.0001;
        });

        if (hasChanged) {
            setComponents(nextComps);
        }

        animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);


  return (
    <div className="flex h-screen flex-col">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 justify-between z-20 shadow-sm">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">⚡</div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">{t('app.title')}</h1>
            </div>
            <div className="flex items-center gap-4">
                 <div className="flex items-center bg-gray-100 rounded-md p-0.5">
                    <button 
                        onClick={() => setLanguage('zh')}
                        className={`px-2 py-1 text-xs font-bold rounded ${language === 'zh' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        中
                    </button>
                    <button 
                        onClick={() => setLanguage('en')}
                        className={`px-2 py-1 text-xs font-bold rounded ${language === 'en' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        EN
                    </button>
                 </div>
                 <div className="w-px h-6 bg-gray-200"></div>
                 <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none">
                     <input type="checkbox" checked={showCurrent} onChange={(e) => setShowCurrent(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                     {t('app.showCurrent')}
                 </label>
            </div>
        </header>

        {/* Main Workspace */}
        <div className="flex flex-1 overflow-hidden">
            <Toolbar onAdd={handleAddComponent} onLoadPreset={handleLoadPreset} />
            
            <CircuitCanvas 
                components={components} 
                setComponents={setComponents}
                onSelect={setSelectedId}
                selectedId={selectedId}
                showCurrent={showCurrent}
            />

            <PropertiesPanel 
                component={components.find(c => c.id === selectedId) || null}
                onChange={handlePropertyChange}
                onDelete={handleDelete}
            />
        </div>

        {/* Gemini Assistant */}
        <AIAssistant components={components} />
    </div>
  );
};

export default App;
