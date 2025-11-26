import React, { useState } from 'react';
import { ComponentType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ToolbarProps {
  onAdd: (type: ComponentType) => void;
  onLoadPreset: (preset: string) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onAdd, onLoadPreset }) => {
  const { t } = useLanguage();
  const [showPresets, setShowPresets] = useState(false);

  const items = [
    { type: ComponentType.WIRE, label: t('toolbar.wire'), icon: '—' },
    { type: ComponentType.BATTERY, label: t('toolbar.battery'), icon: '🔋' },
    { type: ComponentType.LIGHTBULB, label: t('toolbar.bulb'), icon: '💡' },
    { type: ComponentType.RESISTOR, label: t('toolbar.resistor'), icon: '⚡' }, 
    { type: ComponentType.SWITCH, label: t('toolbar.switch'), icon: '🔌' },
    { type: ComponentType.CAPACITOR, label: t('toolbar.capacitor'), icon: '┤├' },
    { type: ComponentType.INDUCTOR, label: t('toolbar.inductor'), icon: '꩜' },
    { type: ComponentType.AMMETER, label: t('toolbar.ammeter'), icon: 'A' },
    { type: ComponentType.VOLTMETER, label: t('toolbar.voltmeter'), icon: 'V' },
  ];

  return (
    <div className="w-24 bg-white border-r border-gray-200 flex flex-col items-center py-4 shadow-lg z-10 overflow-y-auto scrollbar-hide">
      <h2 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-wider">{t('toolbar.parts')}</h2>
      <div className="space-y-3 w-full px-2">
        {items.map((item) => (
          <button
            key={item.type}
            onClick={() => onAdd(item.type)}
            className="w-full flex flex-col items-center justify-center p-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-200 group"
            title={`${item.label}`}
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform block font-bold">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 w-full px-2 border-t pt-4 pb-4">
        <h2 className="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider text-center">{t('toolbar.presets')}</h2>
        <div className="w-full">
          <button 
            onClick={() => setShowPresets(!showPresets)}
            className={`w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 px-1 rounded flex items-center justify-center gap-1 transition-colors ${showPresets ? 'bg-gray-200' : ''}`}
          >
             <span>{t('toolbar.load')}</span>
             <svg className={`w-3 h-3 transition-transform ${showPresets ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </button>
          
          {showPresets && (
            <div className="flex flex-col gap-2 mt-3 w-full">
              <button onClick={() => { onLoadPreset('series'); setShowPresets(false); }} className="w-full text-xs py-1.5 px-1 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-600 hover:text-blue-600 rounded transition-colors text-center shadow-sm">
                {t('toolbar.series')}
              </button>
              <button onClick={() => { onLoadPreset('parallel'); setShowPresets(false); }} className="w-full text-xs py-1.5 px-1 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-600 hover:text-blue-600 rounded transition-colors text-center shadow-sm">
                {t('toolbar.parallel')}
              </button>
              <button onClick={() => { onLoadPreset('rc'); setShowPresets(false); }} className="w-full text-xs py-1.5 px-1 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-600 hover:text-blue-600 rounded transition-colors text-center shadow-sm">
                {t('toolbar.rcDemo')}
              </button>
              <button onClick={() => { onLoadPreset('rl'); setShowPresets(false); }} className="w-full text-xs py-1.5 px-1 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-600 hover:text-blue-600 rounded transition-colors text-center shadow-sm">
                {t('toolbar.rlDemo')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
