
import * as React from 'react';
import { useShowrunnerStore } from '../../store/showrunnerStore';
import { Character, CharacterProfile } from '../../types';
import { debounce, set as lodashSet } from 'lodash-es';

interface CoreIdentityEditorProps {
  character: Character;
}

const InputField: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, value, onChange }) => (
    <div>
        <label className="block text-xs font-medium text-muted">{label}</label>
        <input 
            type="text"
            value={value || ''} 
            onChange={onChange}
            className="mt-1 block w-full bg-neutral-700 border-subtle rounded-md shadow-sm p-2 text-sm text-primary-text focus:ring-accent focus:border-accent" 
        />
    </div>
);

const TextareaField: React.FC<{ label: string; value: string[] | string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; rows?: number }> = ({ label, value, onChange, rows = 3 }) => (
    <div>
        <label className="block text-xs font-medium text-muted">{label}</label>
        <textarea
            value={Array.isArray(value) ? value.join('\n') : (value || '')}
            onChange={onChange}
            rows={rows}
            className="mt-1 block w-full bg-neutral-700 border-subtle rounded-md shadow-sm p-2 text-sm text-primary-text focus:ring-accent focus:border-accent"
        />
    </div>
);

const CoreIdentityEditor: React.FC<CoreIdentityEditorProps> = ({ character }) => {
    const updateCharacter = useShowrunnerStore(state => state.updateCharacter);
    
    // Use React.useReducer via namespace import
    const [localProfile, dispatch] = React.useReducer((state: CharacterProfile, action: { path: string, value: any }) => {
        const newState = JSON.parse(JSON.stringify(state)); // Deep copy
        lodashSet(newState, action.path, action.value); // Use lodash to set nested property
        return newState;
    }, character.profile);
    
    // Use React.useCallback via namespace import
    const debouncedUpdate = React.useCallback(debounce((newProfile: CharacterProfile) => {
        updateCharacter({
            id: character.id,
            profile: newProfile
        });
    }, 500), [character.id, updateCharacter]);

    const handleChange = (path: string, value: any) => {
        // Update local state immediately for responsiveness
        dispatch({ path, value });
        
        // Create a new object to pass to the debounced function to avoid stale closures
        const updatedProfile = JSON.parse(JSON.stringify(localProfile));
        lodashSet(updatedProfile, path, value);
        
        // Trigger the debounced update to the global store
        debouncedUpdate(updatedProfile);
    };

    const p = localProfile;
    const c = p.coreIdentity;
    const pe = p.persona;

    return (
        <div className="p-6 space-y-6">
            {/* Core Identity */}
            <div className="bg-panel border border-subtle rounded-xl p-4">
                <h3 className="text-md font-bold text-primary mb-3">Core Identity</h3>
                <div className="space-y-4">
                    <InputField label="Name" value={c?.name} onChange={e => handleChange('coreIdentity.name', e.target.value)} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputField label="First Name" value={c?.fullLegalName?.first} onChange={e => handleChange('coreIdentity.fullLegalName.first', e.target.value)} />
                        <InputField label="Middle Name" value={c?.fullLegalName?.middle} onChange={e => handleChange('coreIdentity.fullLegalName.middle', e.target.value)} />
                        <InputField label="Last Name" value={c?.fullLegalName?.last} onChange={e => handleChange('coreIdentity.fullLegalName.last', e.target.value)} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Primary Role" value={c?.primaryNarrativeRole} onChange={e => handleChange('coreIdentity.primaryNarrativeRole', e.target.value)} />
                        <InputField label="Title / Honorific" value={c?.titleHonorific} onChange={e => handleChange('coreIdentity.titleHonorific', e.target.value)} />
                    </div>
                    <TextareaField label="Archetypes (one per line)" value={c?.characterArchetypes} onChange={e => handleChange('coreIdentity.characterArchetypes', e.target.value.split('\n'))} />
                </div>
            </div>

            {/* Persona */}
            <div className="bg-panel border border-subtle rounded-xl p-4">
                <h3 className="text-md font-bold text-primary mb-3">Persona</h3>
                <div className="space-y-4">
                    <TextareaField label="Key Childhood Events" value={pe?.backstory?.keyChildhoodEvents} onChange={e => handleChange('persona.backstory.keyChildhoodEvents', e.target.value.split('\n'))} />
                    <TextareaField label="Key Adult Events" value={pe?.backstory?.keyAdultEvents} onChange={e => handleChange('persona.backstory.keyAdultEvents', e.target.value.split('\n'))} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="External Goal" value={pe?.motivations?.externalGoal} onChange={e => handleChange('persona.motivations.externalGoal', e.target.value)} />
                        <InputField label="Internal Need" value={pe?.motivations?.internalNeed} onChange={e => handleChange('persona.motivations.internalNeed', e.target.value)} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Surface Fear" value={pe?.fears?.surfaceFear} onChange={e => handleChange('persona.fears.surfaceFear', e.target.value)} />
                        <InputField label="Deep Fear" value={pe?.fears?.deepFear} onChange={e => handleChange('persona.fears.deepFear', e.target.value)} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoreIdentityEditor;
