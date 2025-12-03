
import * as React from 'react';
import { useShowrunnerStore } from '../../store/showrunnerStore';
import { Character, CharacterProfile } from '../../types';
import { debounce, set as lodashSet } from 'lodash-es';

interface AudioEditorProps {
  character: Character;
}

const InputField: React.FC<{ label: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; placeholder?: string }> = ({ label, value, onChange, type = "text", placeholder }) => (
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
            value={Array.isArray(value) ? value.join('\n') : (value || '')}
            onChange={onChange}
            rows={rows}
            className="mt-1 block w-full bg-neutral-700 border-subtle rounded-md shadow-sm p-2 text-sm text-primary-text focus:ring-accent focus:border-accent"
        />
    </div>
);

const AudioEditor: React.FC<AudioEditorProps> = ({ character }) => {
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
        const updatedProfile = JSON.parse(JSON.stringify(localProfile));
        lodashSet(updatedProfile, path, value);
        debouncedUpdate(updatedProfile);
    };

    const v = localProfile.vocalProfile;
    const dna = localProfile.visualDna;

    return (
        <div className="p-6 space-y-6">
            <div className="bg-panel border border-subtle rounded-xl p-4">
                <h3 className="text-md font-bold text-primary mb-3">Vocal Profile</h3>
                <div className="space-y-4">
                    {/* Added Gender and Age here for convenience as they affect voice */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <InputField label="Gender" value={dna?.gender} onChange={e => handleChange('visualDna.gender', e.target.value)} placeholder="e.g. Male, Female" />
                         <InputField label="Apparent Age" value={dna?.age?.apparent} onChange={e => handleChange('visualDna.age.apparent', e.target.value)} placeholder="e.g. 30s, Elderly" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <InputField label="Speaking Persona" value={v?.speakingPersona} onChange={e => handleChange('vocalProfile.speakingPersona', e.target.value)} />
                        <InputField label="Timbre" value={v?.timbre} onChange={e => handleChange('vocalProfile.timbre', e.target.value)} />
                        <InputField label="Pitch Range" value={v?.pitchRange} onChange={e => handleChange('vocalProfile.pitchRange', e.target.value)} />
                        <InputField label="Accent/Dialect" value={v?.accentDialect} onChange={e => handleChange('vocalProfile.accentDialect', e.target.value)} />
                    </div>
                    
                    {/* NEW PACING FIELD */}
                    <InputField label="Pacing (Speed)" value={v?.pacing} onChange={e => handleChange('vocalProfile.pacing', e.target.value)} placeholder="e.g. Fast, Slow, Deliberate" />

                    <TextareaField label="Speech Patterns / Cadence" value={v?.speechPatterns} onChange={e => handleChange('vocalProfile.speechPatterns', e.target.value)} rows={2} />
                </div>
            </div>

             <div className="bg-panel border border-subtle rounded-xl p-4">
                <h3 className="text-md font-bold text-primary mb-3">Voice Notes</h3>
                 <div className="space-y-4">
                    <InputField label="Timbre Description" value={v?.voiceNotes?.timbreDescription} onChange={e => handleChange('vocalProfile.voiceNotes.timbreDescription', e.target.value)} />
                    <InputField label="Pitch Notes" value={v?.voiceNotes?.pitchNotes} onChange={e => handleChange('vocalProfile.voiceNotes.pitchNotes', e.target.value)} />
                    <InputField label="Emotion Captured" value={v?.voiceNotes?.emotionCaptured} onChange={e => handleChange('vocalProfile.voiceNotes.emotionCaptured', e.target.value)} />
                    <InputField label="Accent Markers" value={v?.voiceNotes?.accentMarkers} onChange={e => handleChange('vocalProfile.voiceNotes.accentMarkers', e.target.value)} />
                    <InputField label="Delivery Style" value={v?.voiceNotes?.deliveryStyle} onChange={e => handleChange('vocalProfile.voiceNotes.deliveryStyle', e.target.value)} />
                 </div>
            </div>
        </div>
    );
};

export default AudioEditor;
