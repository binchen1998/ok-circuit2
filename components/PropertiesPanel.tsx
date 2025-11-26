import React from 'react';
import { CircuitComponent, ComponentType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface PropertiesPanelProps {
  component: CircuitComponent | null;
  onChange: (id: string, changes: Partial<CircuitComponent['properties']>) => void;
  onDelete: (id: string) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ component, onChange, onDelete }) => {
  const { t } = useLanguage();
  
  if (!component) {
    return (
      <div className="w-64 bg-white border-l border-gray-200 p-4 hidden md:block">
        <div className="text-center text-gray-400 mt-10">
           <p>{t('properties.selectComponent')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-l border-gray-200 p-6 shadow-xl z-10 flex flex-col">
      <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">{t(`toolbar.${component.type}`)}</h2>
      
      <div className="space-y-6 flex-1">
        
        {/* Resistance Control */}
        {(component.type === ComponentType.RESISTOR || component.type === ComponentType.LIGHTBULB) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('properties.resistance')}</label>
            <div className="flex items-center gap-2">
                <input 
                    type="range" 
                    min="1" max="100" 
                    value={component.properties.resistance} 
                    onChange={(e) => onChange(component.id, { resistance: Number(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-sm font-bold w-8">{component.properties.resistance}</span>
            </div>
          </div>
        )}

        {/* Capacitance Control */}
        {component.type === ComponentType.CAPACITOR && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('properties.capacitance')}</label>
            <div className="flex items-center gap-2">
                <input 
                    type="range" 
                    min="10" max="10000" step="10"
                    value={(component.properties.capacitance || 0.0001) * 1000000} 
                    onChange={(e) => onChange(component.id, { capacitance: Number(e.target.value) / 1000000 })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-sm font-bold w-12">{((component.properties.capacitance || 0) * 1000000).toFixed(0)}</span>
            </div>
          </div>
        )}

        {/* Inductance Control */}
        {component.type === ComponentType.INDUCTOR && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('properties.inductance')}</label>
            <div className="flex items-center gap-2">
                <input 
                    type="range" 
                    min="0.1" max="10" step="0.1"
                    value={component.properties.inductance} 
                    onChange={(e) => onChange(component.id, { inductance: Number(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-sm font-bold w-8">{component.properties.inductance}</span>
            </div>
          </div>
        )}

        {/* Voltage Control */}
        {component.type === ComponentType.BATTERY && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('properties.voltage')}</label>
            <div className="flex items-center gap-2">
                <input 
                    type="range" 
                    min="1.5" max="100" step="1.5"
                    value={component.properties.voltage} 
                    onChange={(e) => onChange(component.id, { voltage: Number(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-sm font-bold w-10">{component.properties.voltage}</span>
            </div>
          </div>
        )}

        {/* Switch Control */}
        {component.type === ComponentType.SWITCH && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
             <span className="text-sm font-medium text-gray-700">{t('properties.state')}</span>
             <button
                onClick={() => onChange(component.id, { isOpen: !component.properties.isOpen })}
                className={`px-3 py-1 rounded text-sm font-bold transition-colors ${component.properties.isOpen ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
             >
                {component.properties.isOpen ? t('properties.open') : t('properties.closed')}
             </button>
          </div>
        )}

        {/* Meter Readings (Large Display) */}
        {component.type === ComponentType.AMMETER && (
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 text-center shadow-inner">
             <div className="text-gray-400 text-xs uppercase tracking-widest mb-1">{t('properties.current')}</div>
             <div className="text-3xl font-mono font-bold text-green-400">{Math.abs(component.current).toFixed(4)} A</div>
          </div>
        )}

        {component.type === ComponentType.VOLTMETER && (
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 text-center shadow-inner">
             <div className="text-gray-400 text-xs uppercase tracking-widest mb-1">{t('properties.voltage')}</div>
             <div className="text-3xl font-mono font-bold text-yellow-400">{Math.abs(component.voltageDrop).toFixed(4)} V</div>
          </div>
        )}

        {/* Generic Readings for others */}
        {component.type !== ComponentType.AMMETER && component.type !== ComponentType.VOLTMETER && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('properties.liveReadings')}</h3>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('properties.current')}:</span>
                    <span className="font-mono font-bold">{Math.abs(component.current).toFixed(3)} A</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('properties.voltageDrop')}:</span>
                    <span className="font-mono font-bold">{Math.abs(component.voltageDrop).toFixed(3)} V</span>
                </div>
                {component.type !== ComponentType.CAPACITOR && component.type !== ComponentType.INDUCTOR && (
                  <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('properties.power')}:</span>
                      <span className="font-mono font-bold">{Math.abs(component.current * component.voltageDrop).toFixed(3)} W</span>
                  </div>
                )}
            </div>
        )}

      </div>

      <div className="mt-6 pt-4 border-t">
         <button 
            onClick={() => onDelete(component.id)}
            className="w-full flex items-center justify-center gap-2 bg-white border border-red-300 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
         >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            {t('properties.delete')}
         </button>
      </div>
    </div>
  );
};

export default PropertiesPanel;
