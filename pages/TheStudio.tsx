import React, { useState } from 'react';
import { useShowrunnerStore } from '../store/showrunnerStore';
import { Scene, Shot, GeminiModel } from '../types';
import { DirectorDeck } from '../components/studio/DirectorDeck';
import { Clapperboard, Film, PlusCircle, Archive, BrainCircuit, Wand2, Sparkles, Download, Upload, Trash2, Lock, Unlock } from 'lucide-react';
import { saveStudio } from '../services/storageService';

const TheStudio: React.FC = () => {
    const { project, addShot, updateShot, deleteShot, generateShotsForScene, importStudio } = useShowrunnerStore(); 
    const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
    const [activeShotId, setActiveShotId] = useState<string | null>(null);
    const [isGeneratingShots, setIsGeneratingShots] = useState(false);

    // --- PAGE LEVEL CONTROLS (Global to The Studio) ---
    const [selectedTextModel, setSelectedTextModel] = useState<GeminiModel>('gemini-2.5-flash');
    const [selectedImageModel, setSelectedImageModel] = useState<'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview'>('gemini-3-pro-image-preview');
    const [selectedResolution, setSelectedResolution] = useState<string>('1K');

    if (!project) return null;

    const getAllScenes = () => {
        const scenes: { itemTitle: string, scene: Scene }[] = [];
        const isEpisodic = project.format.type === 'EPISODIC';
        
        if (isEpisodic) {
            project.script.seasons?.forEach(s => {
                s.episodes.forEach(e => {
                    e.scenes.forEach(sc => scenes.push({ itemTitle: `S${s.seasonNumber}E${e.episodeNumber}`, scene: sc }));
                });
            });
        } else {
             project.script.sequels?.forEach(s => {
                s.acts.forEach(a => {
                    a.scenes.forEach(sc => scenes.push({ itemTitle: `Part ${s.partNumber} Act ${a.actNumber}`, scene: sc }));
                });
            });
        }
        return scenes;
    };

    const allScenes = getAllScenes();
    const activeSceneData = allScenes.find(s => s.scene.id === activeSceneId);
    const activeScene = activeSceneData?.scene;
    
    const activeShots = activeSceneId ? (project.studio.shotsByScene[activeSceneId] || []) : [];
    const activeShot = activeShots.find(s => s.id === activeShotId);

    const handleAddShot = () => {
        if (!activeSceneId) return;
        addShot(activeSceneId);
    };

    const handleGenerateShots = async () => {
        if (!activeSceneId) return;
        if (activeShots.length > 0) {
            if (!confirm("This scene already has shots. Generating new ones will overwrite them. Continue?")) return;
        }
        setIsGeneratingShots(true);
        try {
            await generateShotsForScene(activeSceneId);
        } catch (e) {
            alert("Failed to generate shots.");
            console.error(e);
        } finally {
            setIsGeneratingShots(false);
        }
    };

    const handleShotDescriptionChange = (shotId: string, newDesc: string) => {
        if (!activeSceneId) return;
        updateShot(activeSceneId, shotId, { description: newDesc });
    };

    const toggleShotLock = (shot: Shot) => {
        if (!activeSceneId) return;
        updateShot(activeSceneId, shot.id, { isLocked: !shot.isLocked });
    };

    const handleRemoveShot = (e: React.MouseEvent, shotId: string) => {
        e.stopPropagation();
        e.preventDefault(); 
        if (!activeSceneId) return;
        if (window.confirm("Are you sure you want to delete this shot?")) {
            deleteShot(activeSceneId, shotId);
            if (activeShotId === shotId) {
                setActiveShotId(null);
            }
        }
    };

    return (
        <div className="h-full flex flex-col">
             {/* --- PAGE HEADER --- */}
             <div className="flex justify-between items-center mb-2 shrink-0 p-2">
                <h1 className="text-3xl font-black text-primary">The Studio</h1>
                
                <div className="flex gap-4">
                    {/* TEXT MODEL SELECTOR */}
                    <div className="flex items-center gap-2 bg-surface p-1.5 rounded-lg border border-subtle">
                        <div className="px-2 text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                            Writer:
                        </div>
                        <select 
                            value={selectedTextModel}
                            onChange={(e) => setSelectedTextModel(e.target.value as GeminiModel)}
                            className="bg-panel border-subtle rounded-md text-xs text-primary-text p-1.5 focus:ring-accent focus:border-accent min-w-[140px]"
                        >
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                            <option value="gemini-3-pro-preview">Gemini 3.0 Pro</option>
                        </select>
                    </div>

                    {/* IMAGE MODEL SELECTOR */}
                    <div className="flex items-center gap-2 bg-surface p-1.5 rounded-lg border border-subtle">
                         <div className="px-2 text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                            <Sparkles size={12}/> Artist:
                         </div>
                         <select 
                            value={selectedImageModel}
                            onChange={(e) => setSelectedImageModel(e.target.value as any)}
                            className="bg-panel border-subtle rounded-md text-xs text-primary-text p-1.5 focus:ring-accent focus:border-accent min-w-[140px]"
                         >
                             <option value="gemini-2.5-flash-image">Gemini 2.5 Flash</option>
                             <option value="gemini-3-pro-image-preview">Gemini 3.0 Pro</option>
                         </select>

                         <select
                            value={selectedResolution}
                            onChange={(e) => setSelectedResolution(e.target.value)}
                            disabled={selectedImageModel !== 'gemini-3-pro-image-preview'}
                            className="bg-panel border-subtle rounded-md text-xs text-primary-text p-1.5 focus:ring-accent focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
                            title="Resolution (Pro model only)"
                         >
                             <option value="1K">1K</option>
                             <option value="2K">2K</option>
                             <option value="4K">4K</option>
                         </select>
                    </div>

                    <div className="flex gap-2 border-l border-subtle pl-4 ml-4">
                        <button 
                            onClick={() => saveStudio(project)} 
                            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-panel text-primary-text rounded-md hover:bg-subtle"
                            title="Save Studio data & images"
                        >
                            <Download size={14} /> Save .thestudio
                        </button>
                        <button 
                            onClick={importStudio} 
                            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-panel text-primary-text rounded-md hover:bg-subtle"
                        >
                            <Upload size={14} /> Load .thestudio
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex gap-0 overflow-hidden">
                {/* 1. Scene List (Left) */}
                <aside className="w-64 bg-surface border-r border-subtle flex flex-col overflow-hidden flex-shrink-0">
                    <div className="p-4 border-b border-subtle bg-panel">
                        <h2 className="font-bold text-primary flex items-center gap-2"><Clapperboard size={18}/> Scenes</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {allScenes.map(({ itemTitle, scene }) => (
                            <button 
                                key={scene.id} 
                                onClick={() => { setActiveSceneId(scene.id); setActiveShotId(null); }}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeSceneId === scene.id ? 'bg-primary text-neutral-900 font-bold' : 'text-primary-text hover:bg-subtle'}`}
                            >
                                <span className="text-xs opacity-70 block">{itemTitle}</span>
                                Scene {scene.sceneNumber}: {scene.setting}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* 2. Shot List (Middle) */}
                <div className="w-72 bg-base border-r border-subtle flex flex-col overflow-hidden flex-shrink-0">
                    <div className="p-4 border-b border-subtle flex justify-between items-center bg-panel">
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-primary flex items-center gap-2"><Film size={18}/> Shots</h2>
                        </div>
                        <div className="flex gap-2">
                            {activeSceneId && (
                                <button onClick={handleGenerateShots} disabled={isGeneratingShots} className="text-muted hover:text-accent disabled:opacity-30" title="AI Generate Shot List">
                                    {isGeneratingShots ? <BrainCircuit size={18} className="animate-spin"/> : <Wand2 size={18}/>}
                                </button>
                            )}
                            {/* Disable Add button if no shots exist (forcing auto-gen first) */}
                            <button 
                                onClick={handleAddShot} 
                                disabled={!activeSceneId || activeShots.length === 0} 
                                className="text-muted hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed" 
                                title={activeShots.length === 0 ? "Generate shot list first" : "Add Shot Manually"}
                            >
                                <PlusCircle size={18}/>
                            </button>
                        </div>
                    </div>
                    
                    {!activeScene ? (
                        <div className="p-8 text-center text-muted text-sm">Select a scene</div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {activeShots.length === 0 && !isGeneratingShots && (
                                <div className="p-4 text-center">
                                    <p className="text-muted text-xs mb-4">No shots planned. Please auto-generate the initial shot list to begin.</p>
                                    <button onClick={handleGenerateShots} className="w-full py-2 bg-primary text-neutral-900 text-xs font-bold rounded hover:bg-white flex items-center justify-center gap-2">
                                        <Wand2 size={14}/> Auto-Generate Shot List
                                    </button>
                                </div>
                            )}
                            
                            {isGeneratingShots && (
                                <div className="p-8 flex flex-col items-center justify-center text-muted">
                                    <BrainCircuit size={24} className="animate-spin text-accent mb-2"/>
                                    <p className="text-xs">Directing Scene...</p>
                                </div>
                            )}
                            
                            {activeShots.map((shot, idx) => {
                                const isUserShot = shot.origin === 'user';
                                return (
                                    <div 
                                        key={shot.id} 
                                        onClick={() => setActiveShotId(shot.id)}
                                        className={`p-3 rounded-lg border cursor-pointer transition-colors 
                                            ${activeShotId === shot.id ? 'bg-accent/10' : 'bg-surface'} 
                                            ${isUserShot ? 'border-yellow-500' : (activeShotId === shot.id ? 'border-accent' : 'border-subtle hover:border-muted')}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`font-bold text-xs flex items-center gap-2 ${isUserShot ? 'text-yellow-500' : 'text-primary'}`}>
                                                Shot {idx + 1} {shot.generatedImageUrl && <span className="text-[9px] bg-green-900/50 text-green-400 px-1 rounded">IMG</span>}
                                            </span>
                                            <div className="flex gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); toggleShotLock(shot); }} className={`p-1 rounded ${shot.isLocked ? 'text-red-400 hover:bg-red-900/20' : 'text-muted hover:text-green-400 hover:bg-green-900/20'}`}>
                                                    {shot.isLocked ? <Lock size={12}/> : <Unlock size={12}/>}
                                                </button>
                                                {!shot.isLocked && (
                                                    <button onClick={(e) => handleRemoveShot(e, shot.id)} className="p-1 text-muted hover:text-red-400 rounded hover:bg-red-900/20" title="Delete Shot">
                                                        <Trash2 size={12}/>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <textarea 
                                            value={shot.description}
                                            onChange={(e) => handleShotDescriptionChange(shot.id, e.target.value)}
                                            disabled={shot.isLocked}
                                            className="w-full bg-black/20 border border-subtle rounded p-1 text-xs text-muted resize-y focus:ring-accent focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
                                            rows={3}
                                        />
                                        {shot.referenceImages && shot.referenceImages.length > 0 && (
                                            <div className="flex gap-1 mt-2">
                                                {shot.referenceImages.slice(0, 5).map(ref => (
                                                    <div key={ref.id} className="w-4 h-4 rounded-full overflow-hidden border border-subtle">
                                                        <img src={ref.url} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                                {shot.referenceImages.length > 5 && <span className="text-[9px] text-muted self-center">+{shot.referenceImages.length - 5}</span>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 3. Director's Deck (Right) */}
                <main className="flex-1 overflow-hidden bg-black/10">
                    {activeShot && activeScene ? (
                        <DirectorDeck 
                            key={activeShot.id} 
                            shot={activeShot} 
                            scene={activeScene} 
                            selectedTextModel={selectedTextModel}
                            selectedImageModel={selectedImageModel}
                            selectedResolution={selectedResolution}
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted">
                            <p>Select a shot to open the Director's Deck.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default TheStudio;