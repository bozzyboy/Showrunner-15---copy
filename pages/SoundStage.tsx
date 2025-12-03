import React, { useState, useMemo, useRef } from 'react';
import { useShowrunnerStore } from '../store/showrunnerStore';
import { Character, GeminiModel } from '../types';
import { geminiService } from '../services/geminiService';
import { Mic, Play, Settings2, User, Volume2, Wand2, Loader2, AlertTriangle } from 'lucide-react';

const SoundStage: React.FC = () => {
    const { project } = useShowrunnerStore();
    const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
    const [previewText, setPreviewText] = useState("It’s been quiet lately… I’ve had time to think, and maybe that’s what I needed most.");
    const [isGenerating, setIsGenerating] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    
    // Derived state for the selected character
    const selectedCharacter = useMemo(() => 
        project?.bible.characters.find(c => c.id === selectedCharId), 
    [project, selectedCharId]);

    // Construct the ElevenLabs Voice Design Prompt
    const voicePrompt = useMemo(() => {
        if (!selectedCharacter) return '';
        const p = selectedCharacter.profile;
        const dna = p.visualDna;
        const voc = p.vocalProfile;
        
        // Formula: [Age] [Gender] with a [Tone] voice and [Accent] accent. [Occupation]. Speaking [Pacing].
        const parts = [
            dna?.age?.apparent,
            dna?.gender,
            voc?.timbre ? `with a ${voc.timbre} voice` : '',
            voc?.accentDialect ? `and a ${voc.accentDialect} accent` : '',
            p.vocationalProfile?.currentOccupation ? `. ${p.vocationalProfile.currentOccupation}` : '',
            voc?.pacing ? `. Speaking ${voc.pacing}` : '',
        ];
        
        return parts.filter(Boolean).join(' ').trim() + ". Perfect audio quality.";
    }, [selectedCharacter]);

    if (!project) return null;

    const handleGeneratePreview = async () => {
        if (!selectedCharacter) return;
        setIsGenerating(true);
        setError(null);
        setAudioUrl(null);

        try {
            // Using Google Cloud TTS via GeminiService
            const dataUrl = await geminiService.generateSpeech(previewText, selectedCharacter);
            setAudioUrl(dataUrl);
            
            // Auto-play
            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.play().catch(e => console.warn("Auto-play prevented:", e));
                }
            }, 100);

        } catch (err: any) {
            console.error("Speech Gen Error:", err);
            setError(err.message || "Failed to generate audio.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-[calc(100vh-60px)] flex flex-col">
            <header className="flex justify-between items-center mb-6 shrink-0">
                <h1 className="text-3xl font-black text-primary">Sound Stage</h1>
                <div className="flex gap-2">
                     <span className="text-xs font-mono bg-panel px-2 py-1 rounded text-muted flex items-center gap-2">
                        <Volume2 size={12}/> ElevenLabs Voice Design
                     </span>
                </div>
            </header>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Left: Character Selector */}
                <aside className="w-64 flex-shrink-0 bg-surface border border-subtle rounded-xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-subtle bg-panel">
                        <h2 className="font-bold text-primary flex items-center gap-2"><User size={18} /> Cast</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {project.bible.characters.map(char => (
                            <button 
                                key={char.id} 
                                onClick={() => { setSelectedCharId(char.id); setAudioUrl(null); setError(null); }}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${selectedCharId === char.id ? 'bg-primary text-neutral-900 font-bold' : 'text-primary-text hover:bg-subtle'}`}
                            >
                                {char.profile.name}
                            </button>
                        ))}
                        {project.bible.characters.length === 0 && (
                            <p className="p-4 text-xs text-muted text-center">No characters found. Create them in the Story Bible first.</p>
                        )}
                    </div>
                </aside>

                {/* Right: Voice Designer */}
                <main className="flex-1 bg-surface border border-subtle rounded-xl p-6 overflow-y-auto">
                    {selectedCharacter ? (
                        <div className="max-w-3xl mx-auto space-y-8">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-primary">{selectedCharacter.profile.name}</h2>
                                    <p className="text-muted text-sm">{selectedCharacter.profile.coreIdentity.primaryNarrativeRole}</p>
                                </div>
                            </div>

                            {/* Prompt Construction Area */}
                            <div className="bg-panel border border-subtle rounded-lg p-6">
                                <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Settings2 size={14}/> Voice Attributes (Source Data)
                                </h3>
                                
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-base/50 p-3 rounded border border-subtle">
                                        <label className="text-[10px] text-muted block uppercase">Gender</label>
                                        <p className="text-primary-text text-sm font-medium">{selectedCharacter.profile.visualDna?.gender || 'Not set'}</p>
                                    </div>
                                    <div className="bg-base/50 p-3 rounded border border-subtle">
                                        <label className="text-[10px] text-muted block uppercase">Age</label>
                                        <p className="text-primary-text text-sm font-medium">{selectedCharacter.profile.visualDna?.age?.apparent || 'Not set'}</p>
                                    </div>
                                    <div className="bg-base/50 p-3 rounded border border-subtle">
                                        <label className="text-[10px] text-muted block uppercase">Accent</label>
                                        <p className="text-primary-text text-sm font-medium">{selectedCharacter.profile.vocalProfile?.accentDialect || 'Not set'}</p>
                                    </div>
                                    <div className="bg-base/50 p-3 rounded border border-subtle">
                                        <label className="text-[10px] text-muted block uppercase">Timbre/Tone</label>
                                        <p className="text-primary-text text-sm font-medium">{selectedCharacter.profile.vocalProfile?.timbre || 'Not set'}</p>
                                    </div>
                                    <div className="bg-base/50 p-3 rounded border border-subtle">
                                        <label className="text-[10px] text-muted block uppercase">Pacing</label>
                                        <p className="text-primary-text text-sm font-medium">{selectedCharacter.profile.vocalProfile?.pacing || 'Not set'}</p>
                                    </div>
                                    <div className="bg-base/50 p-3 rounded border border-subtle">
                                        <label className="text-[10px] text-muted block uppercase">Occupation</label>
                                        <p className="text-primary-text text-sm font-medium">{selectedCharacter.profile.vocationalProfile?.currentOccupation || 'Not set'}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-accent block">GENERATED ELEVENLABS PROMPT</label>
                                    <div className="w-full bg-base border border-accent/50 rounded-md p-4 text-sm font-mono text-green-400">
                                        {voicePrompt}
                                    </div>
                                    <p className="text-[10px] text-muted">This prompt is auto-constructed from the Story Bible data above.</p>
                                </div>
                            </div>

                            {/* Testing Area */}
                            <div className="bg-panel border border-subtle rounded-lg p-6">
                                <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Mic size={14}/> Google Cloud Voice Preview (Placeholder)
                                </h3>
                                
                                <div className="mb-4">
                                    <label className="text-xs font-bold text-muted block mb-2">PREVIEW TEXT</label>
                                    <textarea 
                                        value={previewText}
                                        onChange={(e) => setPreviewText(e.target.value)}
                                        className="w-full h-24 bg-base border-subtle rounded-md p-3 text-sm text-primary-text focus:ring-accent focus:border-accent"
                                    />
                                    <p className="text-[10px] text-muted mt-1">Use text that matches the character's personality for best results.</p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={handleGeneratePreview}
                                        disabled={isGenerating || !previewText}
                                        className="flex items-center gap-2 px-6 py-3 bg-primary text-neutral-900 font-bold rounded-md hover:bg-white transition-colors disabled:bg-neutral-600 disabled:text-neutral-400 disabled:cursor-not-allowed"
                                    >
                                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                                        {isGenerating ? "Generating..." : "Generate Voice Preview"}
                                    </button>
                                    
                                    {audioUrl && (
                                        <audio ref={audioRef} controls src={audioUrl} className="h-10" />
                                    )}
                                </div>
                                
                                {error && (
                                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded flex items-start gap-2 text-xs text-red-300">
                                        <AlertTriangle size={14} className="mt-0.5 shrink-0"/>
                                        <div>
                                            <p className="font-bold">Generation Failed</p>
                                            <p>{error}</p>
                                            <p className="mt-1 opacity-70">Note: This feature requires a Google Cloud API Key with "Cloud Text-to-Speech API" enabled.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted">
                            <Wand2 size={48} className="mb-4 opacity-20"/>
                            <p>Select a character to design their voice.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default SoundStage;