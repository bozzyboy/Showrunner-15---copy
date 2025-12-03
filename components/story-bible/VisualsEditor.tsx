
import * as React from 'react';
import { useShowrunnerStore } from '../../store/showrunnerStore';
import { Character, CharacterProfile } from '../../types';
import { debounce, set as lodashSet } from 'lodash-es';

interface VisualsEditorProps {
  character: Character;
}

const InputField: React.FC<{ label: string; value: string | number | null; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; placeholder?: string }> = ({ label, value, onChange, type = "text", placeholder }) => (
    <div>
        <label className="block text-xs font-medium text-muted">{label}</label>
        <input 
            type={type} 
            value={value ?? ''} 
            onChange={onChange}
            placeholder={placeholder}
            className="mt-1 block w-full bg-neutral-700 border-subtle rounded-md shadow-sm p-2 text-sm text-primary-text focus:ring-accent focus:border-accent" 
        />
    </div>
);

const TextareaField: React.FC<{ label: string; value: string[] | string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; rows?: number }> = ({ label, value, onChange, rows = 3 }) => (
    <div>
        <label className="block text-xs font-medium text-muted">{label}</label>
        <textarea
            value={Array.isArray(value) ? value.join('\n') : value}
            onChange={onChange}
            rows={rows}
            className="mt-1 block w-full bg-neutral-700 border-subtle rounded-md shadow-sm p-2 text-sm text-primary-text focus:ring-accent focus:border-accent"
        />
    </div>
);

const VisualsEditor: React.FC<VisualsEditorProps> = ({ character }) => {
    const updateCharacter = useShowrunnerStore(state => state.updateCharacter);
    
    const [localProfile, dispatch] = React.useReducer((state: CharacterProfile, action: { path: string, value: any }) => {
        const newState = JSON.parse(JSON.stringify(state));
        lodashSet(newState, action.path, action.value);
        return newState;
    }, character.profile);
    
    // Use React.useCallback to prevent dispatcher null errors
    const debouncedUpdate = React.useCallback(debounce((newProfile: CharacterProfile) => {
        updateCharacter({
            id: character.id,
            profile: newProfile
        });
    }, 500), [character.id, updateCharacter]);

    const handleChange = (path: string, value: any) => {
        dispatch({ path, value });
        // We need to create a new object to pass to the debounced function
        const updatedProfile = JSON.parse(JSON.stringify(localProfile));
        lodashSet(updatedProfile, path, value);
        debouncedUpdate(updatedProfile);
    };
    
    const p = localProfile;
    const v = p.visualDna || {}; // Default to empty object if missing
    const o = p.outfitMatrix || {}; // Default to empty object if missing

    return (
        <div className="p-6 space-y-6">
            {/* Visual DNA */}
            <div className="bg-panel border border-subtle rounded-xl p-4">
                <h3 className="text-md font-bold text-primary mb-3">Visual DNA</h3>
                <div className="space-y-4">
                    {/* NEW GENDER FIELD */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <InputField label="Gender" value={v.gender} onChange={e => handleChange('visualDna.gender', e.target.value)} placeholder="e.g. Male, Female" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Apparent Age" value={v.age?.apparent} onChange={e => handleChange('visualDna.age.apparent', e.target.value)} />
                        <InputField label="Chronological Age" type="number" value={v.age?.chronological} onChange={e => handleChange('visualDna.age.chronological', e.target.value ? parseInt(e.target.value) : null)} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Ethnicity" value={v.ethnicCulturalBackground?.ethnicity} onChange={e => handleChange('visualDna.ethnicCulturalBackground.ethnicity', e.target.value)} />
                        <InputField label="Nationality / Region" value={v.ethnicCulturalBackground?.nationalityRegion} onChange={e => handleChange('visualDna.ethnicCulturalBackground.nationalityRegion', e.target.value)} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Eye Color" value={v.eyes?.color} onChange={e => handleChange('visualDna.eyes.color', e.target.value)} />
                        <InputField label="Eye Shape" value={v.eyes?.shape} onChange={e => handleChange('visualDna.eyes.shape', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputField label="Hair Color" value={v.hair?.color} onChange={e => handleChange('visualDna.hair.color', e.target.value)} />
                        <InputField label="Hair Texture" value={v.hair?.texture} onChange={e => handleChange('visualDna.hair.texture', e.target.value)} />
                        <InputField label="Hair Style/Cut" value={v.hair?.styleCut} onChange={e => handleChange('visualDna.hair.styleCut', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputField label="Height" value={v.buildPhysique?.height} onChange={e => handleChange('visualDna.buildPhysique.height', e.target.value)} />
                        <InputField label="Weight/Frame" value={v.buildPhysique?.weightFrame} onChange={e => handleChange('visualDna.buildPhysique.weightFrame', e.target.value)} />
                        <InputField label="Posture" value={v.buildPhysique?.posture} onChange={e => handleChange('visualDna.buildPhysique.posture', e.target.value)} />
                    </div>
                    <TextareaField label="Distinctive Physical Traits (one per line)" value={v.buildPhysique?.distinctiveTraits || []} onChange={e => handleChange('visualDna.buildPhysique.distinctiveTraits', e.target.value.split('\n'))} />
                </div>
            </div>

             {/* Outfit Matrix */}
            <div className="bg-panel border border-subtle rounded-xl p-4">
                 <h3 className="text-md font-bold text-primary mb-3">Outfit Matrix</h3>
                 <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-primary-text">Signature Look</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <InputField label="Headwear" value={o.signatureLook?.headwear} onChange={e => handleChange('outfitMatrix.signatureLook.headwear', e.target.value)} />
                        <InputField label="Tops" value={o.signatureLook?.tops} onChange={e => handleChange('outfitMatrix.signatureLook.tops', e.target.value)} />
                        <InputField label="Bottoms" value={o.signatureLook?.bottoms} onChange={e => handleChange('outfitMatrix.signatureLook.bottoms', e.target.value)} />
                        <InputField label="Footwear" value={o.signatureLook?.footwear} onChange={e => handleChange('outfitMatrix.signatureLook.footwear', e.target.value)} />
                    </div>
                     <TextareaField label="Accessories (one per line)" value={o.signatureLook?.accessories || []} onChange={e => handleChange('outfitMatrix.signatureLook.accessories', e.target.value.split('\n'))} />
                 </div>
            </div>
        </div>
    );
};

export default VisualsEditor;
