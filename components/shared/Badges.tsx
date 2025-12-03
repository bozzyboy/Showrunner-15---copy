
import React from 'react';
import { ConsistencyMode } from '../../types';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

export const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative group flex items-center">
        {children}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2 text-xs bg-panel border border-subtle rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {text}
        </div>
    </div>
);

export const ConsistencyBadge: React.FC<{ mode: ConsistencyMode; reasoning?: string }> = ({ mode, reasoning }) => {
    const modeConfig = {
        'STRICT': { icon: ShieldCheck, color: 'text-red-400', label: 'Canon (Strict)' },
        'FLEXIBLE': { icon: ShieldAlert, color: 'text-amber-400', label: 'Thematic (Flexible)' },
        'GENERATIVE': { icon: Shield, color: 'text-muted', label: 'Incidental (Generative)' }
    };

    // Safety check: Default to GENERATIVE if mode is missing or invalid to prevent crash
    const config = modeConfig[mode] || modeConfig['GENERATIVE'];
    const Icon = config.icon;

    const badgeContent = (
         <div className={`flex items-center gap-1.5 text-xs font-semibold ${config.color} bg-black/20 px-2 py-1 rounded-full`}>
            <Icon size={12} />
            <span>{config.label}</span>
        </div>
    );

    if (reasoning) {
        return <Tooltip text={reasoning}>{badgeContent}</Tooltip>;
    }
    
    return badgeContent;
};
