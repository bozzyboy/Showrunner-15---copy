import React, { useState, useEffect } from 'react';
import { Scene, Shot, ShotReferenceImage, VideoPromptJSON, GeminiModel, CharacterImage } from '../../types';
import { useShowrunnerStore } from '../../store/showrunnerStore';
import { geminiService } from '../../services/geminiService';
import { storeImageInDB } from '../../services/storageService';
import { useImageResolver } from '../../hooks/useImageResolver';
import { GalleryModal } from '../shared/GalleryModal';
import { BrainCircuit, Image as ImageIcon, Wand2, UploadCloud, Trash2, X, Film, FileJson, FileText, Maximize2, LayoutGrid, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface DirectorDeckProps {
    shot: Shot;
    scene: Scene;
    selectedTextModel: GeminiModel;
    selectedImageModel: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';
    selectedResolution: string;
}

// Helper to resolve images
const ResolvedImage: React.FC<{ urlOrId: string | undefined, className?: string }> = ({ urlOrId, className }) => {
    const src = useImageResolver(urlOrId);
    if (!src) return <div className={`bg-neutral-800 animate-pulse ${className}`} />;
    return <img src={src} className={className} alt="Shot Asset" />;
};

export const DirectorDeck: React.FC<DirectorDeckProps> = ({ shot, scene, selectedTextModel, selectedImageModel, selectedResolution }) => {
    const { project, updateShot } = useShowrunnerStore();
    const [isWritingPrompt, setIsWritingPrompt] = useState(false);
    const [isDraftingJson, setIsDraftingJson] = useState(false);
    const [isGeneratingImg, setIsGeneratingImg] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isKeyReady, setIsKeyReady] = useState(false);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    // 'main' for the top area, 'edit' for the editing bay
    const [activeGalleryTarget, setActiveGalleryTarget] = useState<'main' | 'edit'>('main');

    // -- Image State (Main) --
    const [imagePrompt, setImagePrompt] = useState(shot.visualPromptText || '');
    
    // -- Image Editing Bay State --
    const [editPrompt, setEditPrompt] = useState('');
    const [editImageId, setEditImageId] = useState<string | null>(null);
    const [editReferences, setEditReferences] = useState<ShotReferenceImage[]>([]);
    const [isGeneratingEdit, setIsGeneratingEdit] = useState(false);
    
    // -- Video State --
    const [videoJsonString, setVideoJsonString] = useState(shot.videoPromptJSON ? JSON.stringify(shot.videoPromptJSON, null, 2) : '');
    const [videoPlan, setVideoPlan] = useState(shot.videoPlan || '');

    // Sync Text Prompt
    useEffect(() => {
        const timeout = setTimeout(() => {
             updateShot(scene.id, shot.id, { visualPromptText: imagePrompt });
        }, 800);
        return () => clearTimeout(timeout);
    }, [imagePrompt, scene.id, shot.id, updateShot]);
    
    // Sync Video Plan
    useEffect(() => {
        const timeout = setTimeout(() => {
            updateShot(scene.id, shot.id, { videoPlan });
        }, 800);
        return () => clearTimeout(timeout);
    }, [videoPlan, scene.id, shot.id, updateShot]);

    // Sync Video JSON
    useEffect(() => {
        const timeout = setTimeout(() => {
            try {
                if (!videoJsonString) return;
                const parsed = JSON.parse(videoJsonString);
                updateShot(scene.id, shot.id, { videoPromptJSON: parsed });
            } catch (e) {
                // Invalid JSON, don't update store yet
            }
        }, 1000);
        return () => clearTimeout(timeout);
    }, [videoJsonString, scene.id, shot.id, updateShot]);

    // Check Key for Pro Models
    useEffect(() => {
        const checkKey = async () => {
             if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setIsKeyReady(hasKey);
            } else {
                setIsKeyReady(true);
            }
        };
        checkKey();
    }, []);

    // --- LOGIC: Auto-Populate References (Main Only) ---
    useEffect(() => {
        if ((!shot.referenceImages || shot.referenceImages.length === 0) && project && scene.assets) {
            const newRefs: ShotReferenceImage[] = [];
            const addRef = (name: string, type: ShotReferenceImage['sourceType'], list: any[]) => {
                const item = list.find((i: any) => {
                    const itemName = i.profile ? i.profile.name : i.baseProfile.identity.name;
                    return itemName.toLowerCase() === name.toLowerCase();
                });
                if (item) {
                     const imgId = item.profile ? item.profile.generatedImageUrl : item.baseProfile.visuals.generatedImageUrl;
                     if (imgId) {
                         newRefs.push({
                             id: uuidv4(),
                             sourceType: type,
                             url: imgId, 
                             isActive: true,
                             name: name
                         });
                     }
                }
            };
            scene.assets.characters.forEach(name => addRef(name, 'character', project.bible.characters));
            scene.assets.locations.forEach(name => addRef(name, 'location', project.bible.locations));
            scene.assets.props.forEach(name => addRef(name, 'prop', project.bible.props));

            if (newRefs.length > 0) {
                updateShot(scene.id, shot.id, { referenceImages: newRefs });
            }
        }
    }, [scene.id, shot.id, shot.referenceImages, project, scene.assets, updateShot]);

    // --- GENERATORS ---
    const handleAutoWritePrompt = async () => {
        setIsWritingPrompt(true);
        setError(null);
        try {
            const resultPrompt = await geminiService.generateShotImagePrompt(scene, shot, project!, selectedTextModel);
            setImagePrompt(resultPrompt);
            updateShot(scene.id, shot.id, { visualPromptText: resultPrompt });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsWritingPrompt(false);
        }
    };

    const handleDraftVideoJson = async () => {
        setIsDraftingJson(true);
        setError(null);
        try {
            const result = await geminiService.generateShotVideoPrompt(scene, shot, project!, selectedTextModel);
            setVideoJsonString(JSON.stringify(result.videoJSON, null, 2));
            setVideoPlan(result.videoPlan);
            updateShot(scene.id, shot.id, { videoPromptJSON: result.videoJSON, videoPlan: result.videoPlan });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsDraftingJson(false);
        }
    };

    const handleGenerateImage = async () => {
        if (!imagePrompt) return;
        setIsGeneratingImg(true);
        setError(null);
        try {
            const references = shot.referenceImages || [];
            if (references.filter(r => r.isActive).length > 14) {
                throw new Error("Too many active reference images. Max 14.");
            }
            const base64 = await geminiService.generateShotImage(imagePrompt, references, selectedImageModel, selectedResolution); 
            const dataUrl = `data:image/png;base64,${base64}`;
            const id = await storeImageInDB(dataUrl);
            const newHistory = [{ id: uuidv4(), url: id, timestamp: Date.now() }, ...(shot.imageHistory || [])];
            updateShot(scene.id, shot.id, { 
                generatedImageUrl: id,
                imageHistory: newHistory
            });
        } catch (err: any) {
             setError(err.message);
             if (err.message.includes("API Key")) setIsKeyReady(false);
        } finally {
            setIsGeneratingImg(false);
        }
    };

    const handleGenerateEdit = async () => {
        if (!editPrompt) return;
        setIsGeneratingEdit(true);
        setError(null);
        try {
             if (editReferences.filter(r => r.isActive).length > 14) {
                throw new Error("Too many active references in editing bay.");
            }
            const base64 = await geminiService.generateShotImage(editPrompt, editReferences, selectedImageModel, selectedResolution);
            const dataUrl = `data:image/png;base64,${base64}`;
            const id = await storeImageInDB(dataUrl);
            setEditImageId(id);
        } catch (err: any) {
            setError("Edit Bay Error: " + err.message);
        } finally {
            setIsGeneratingEdit(false);
        }
    };

    const handleSendToConception = () => {
        if (!editImageId) return;
        const newHistory = [{ id: uuidv4(), url: editImageId, timestamp: Date.now() }, ...(shot.imageHistory || [])];
        updateShot(scene.id, shot.id, { generatedImageUrl: editImageId, imageHistory: newHistory });
        if (editPrompt) {
             updateShot(scene.id, shot.id, { visualPromptText: editPrompt });
             setImagePrompt(editPrompt);
        }
    };

    const handleSendDownForEdit = () => {
        if (!shot.generatedImageUrl) return;
        const newRef: ShotReferenceImage = {
            id: uuidv4(),
            sourceType: 'user_upload',
            url: shot.generatedImageUrl,
            isActive: true,
            name: 'Conception Image'
        };
        // Replace existing first item or prepend if empty
        const newRefs = [...editReferences];
        if (newRefs.length > 0) {
            newRefs[0] = newRef;
        } else {
            newRefs.push(newRef);
        }
        setEditReferences(newRefs);
    };

    const processAndStoreShotImage = async (base64OrDataUrl: string) => {
        const id = await storeImageInDB(base64OrDataUrl);
        const newHistory = [{ id: uuidv4(), url: id, timestamp: Date.now() }, ...(shot.imageHistory || [])];
        updateShot(scene.id, shot.id, { generatedImageUrl: id, imageHistory: newHistory });
    }

    // --- UPLOAD HANDLERS (MAIN) ---
    const handleMainImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const url = ev.target?.result as string;
                const resized = await geminiService.resizeImage(url, 1920, 0.85);
                await processAndStoreShotImage(resized);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleDropMain = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
             const reader = new FileReader();
            reader.onload = async (ev) => {
                const url = ev.target?.result as string;
                const resized = await geminiService.resizeImage(url, 1920, 0.85);
                await processAndStoreShotImage(resized);
            };
            reader.readAsDataURL(file);
        }
    };

    // --- REFERENCE HANDLERS (SHARED LOGIC) ---
    const processReferenceFile = async (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const url = ev.target?.result as string;
                const resized = await geminiService.resizeImage(url, 1024, 0.7);
                const id = await storeImageInDB(resized);
                resolve(id);
            };
            reader.readAsDataURL(file);
        });
    };

    const addReference = async (target: 'main' | 'edit', file: File) => {
        const id = await processReferenceFile(file);
        const newRef: ShotReferenceImage = {
            id: uuidv4(),
            sourceType: 'user_upload',
            url: id,
            isActive: true,
            name: file.name
        };

        if (target === 'main') {
             updateShot(scene.id, shot.id, { referenceImages: [...(shot.referenceImages || []), newRef] });
        } else {
             setEditReferences(prev => [...prev, newRef]);
        }
    };

    const handleGallerySelect = (imageId: string) => {
         const newRef: ShotReferenceImage = {
            id: uuidv4(),
            sourceType: 'user_upload',
            url: imageId,
            isActive: true,
            name: 'Gallery Asset'
        };
        if (activeGalleryTarget === 'main') {
            updateShot(scene.id, shot.id, { referenceImages: [...(shot.referenceImages || []), newRef] });
        } else {
            setEditReferences(prev => [...prev, newRef]);
        }
    };

    const toggleRef = (target: 'main' | 'edit', id: string) => {
        if (target === 'main') {
            const newRefs = (shot.referenceImages || []).map(r => r.id === id ? { ...r, isActive: !r.isActive } : r);
            updateShot(scene.id, shot.id, { referenceImages: newRefs });
        } else {
            setEditReferences(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
        }
    };

    const deleteRef = (e: React.MouseEvent, target: 'main' | 'edit', id: string) => {
        e.stopPropagation();
        if (target === 'main') {
            const newRefs = (shot.referenceImages || []).filter(r => r.id !== id);
            updateShot(scene.id, shot.id, { referenceImages: newRefs });
        } else {
            setEditReferences(prev => prev.filter(r => r.id !== id));
        }
    };

    const handleDropReference = (e: React.DragEvent<HTMLDivElement>, target: 'main' | 'edit') => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) addReference(target, file);
    };

    // --- RENDER ---
    const activeRefsMain = (shot.referenceImages || []).filter(r => r.isActive).length;
    const activeRefsEdit = editReferences.filter(r => r.isActive).length;

    return (
        <div className="flex h-full flex-col">
            <div className="p-3 border-b border-subtle flex items-center justify-between bg-black/20">
                <h3 className="font-bold text-primary text-sm uppercase tracking-wider">Director's Deck</h3>
            </div>
            
            {error && <div className="p-2 bg-red-900/30 text-red-300 text-xs border-b border-red-900/50">{error}</div>}

            <div className="flex-1 flex overflow-hidden">
                
                {/* COLUMN 1: IMAGE GENERATION & EDITING */}
                <div className="flex-1 flex flex-col border-r border-subtle overflow-y-auto min-w-[340px]">
                    
                    {/* --- MAIN BAY --- */}
                    <div className="p-4 border-b border-subtle">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold text-muted flex items-center gap-2"><ImageIcon size={14}/> VISUAL CONCEPTION (STEP 1)</h4>
                             <div className="flex items-center gap-1 opacity-70">
                                 <span className="text-[10px] bg-neutral-800 px-1.5 py-0.5 rounded border border-subtle">
                                    Img: {selectedImageModel === 'gemini-2.5-flash-image' ? 'Flash' : 'Pro'}
                                 </span>
                                 {selectedImageModel === 'gemini-3-pro-image-preview' && (
                                    <span className="text-[10px] bg-neutral-800 px-1.5 py-0.5 rounded border border-subtle">
                                        {selectedResolution}
                                    </span>
                                 )}
                             </div>
                        </div>
                        
                        {/* Main Viewport */}
                        <div 
                            className="w-full h-64 bg-black rounded-lg border border-subtle mb-3 relative overflow-hidden group flex items-center justify-center"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDropMain}
                        >
                             {isGeneratingImg ? (
                                 <div className="text-center">
                                     <BrainCircuit className="w-8 h-8 text-accent animate-spin mx-auto mb-2"/>
                                     <p className="text-xs text-muted">Rendering...</p>
                                 </div>
                             ) : shot.generatedImageUrl ? (
                                 <>
                                    <ResolvedImage urlOrId={shot.generatedImageUrl} className="w-full h-full object-contain" />
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setFullScreenImage(shot.generatedImageUrl!); }} 
                                            className="p-1 bg-black/60 text-white rounded hover:bg-accent"
                                            title="Fullscreen"
                                        >
                                            <Maximize2 size={12}/>
                                        </button>
                                        <button onClick={() => updateShot(scene.id, shot.id, { generatedImageUrl: undefined })} className="p-1 bg-black/60 text-white rounded hover:bg-red-500"><Trash2 size={12}/></button>
                                    </div>
                                 </>
                             ) : (
                                 <div className="text-center text-muted">
                                     <p className="text-xs mb-2">No Visual</p>
                                     <div className="relative inline-block">
                                         <button className="text-[10px] bg-subtle px-2 py-1 rounded hover:bg-neutral-600">Upload</button>
                                         <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleMainImageUpload} accept="image/*" />
                                     </div>
                                 </div>
                             )}
                        </div>

                        {/* Send Down Button */}
                        {shot.generatedImageUrl && (
                            <button 
                                onClick={handleSendDownForEdit}
                                className="w-full mb-3 py-1.5 bg-neutral-800 text-muted border border-subtle rounded text-xs font-bold flex items-center justify-center gap-2 hover:bg-neutral-700 hover:text-white transition-colors"
                            >
                                <ArrowDownCircle size={14}/> Send Down for Edit
                            </button>
                        )}

                        {/* History */}
                        {(shot.imageHistory || []).length > 0 && (
                            <div className="mb-4">
                                 <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    {(shot.imageHistory || []).map(img => (
                                        <div key={img.id} onClick={() => updateShot(scene.id, shot.id, { generatedImageUrl: img.url })} className="w-10 h-10 flex-shrink-0 rounded border border-subtle overflow-hidden cursor-pointer hover:border-accent">
                                            <ResolvedImage urlOrId={img.url} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Text Prompt */}
                        <div className="mb-4">
                            <div className="flex justify-between items-end mb-1">
                                <label className="text-[10px] font-bold text-muted block">IMAGE PROMPT</label>
                                <button 
                                    onClick={handleAutoWritePrompt} 
                                    disabled={isWritingPrompt} 
                                    className="text-[10px] flex items-center gap-1 text-accent hover:underline"
                                    title={`Auto-write using ${selectedTextModel}`}
                                >
                                    {isWritingPrompt ? <BrainCircuit className="w-3 h-3 animate-spin"/> : <Wand2 size={10}/>} Auto-Write
                                </button>
                            </div>
                            <textarea 
                                value={imagePrompt} 
                                onChange={(e) => setImagePrompt(e.target.value)} 
                                className="w-full h-20 bg-panel border-subtle rounded p-2 text-xs text-primary-text focus:border-accent"
                                placeholder="Describe the shot visually..."
                            />
                        </div>

                        {/* Generate Button */}
                        <button 
                            onClick={handleGenerateImage} 
                            disabled={isGeneratingImg || !imagePrompt || (!isKeyReady && selectedImageModel === 'gemini-3-pro-image-preview') || activeRefsMain > 14} 
                            className="w-full py-2 bg-primary text-black font-bold text-xs rounded hover:bg-white disabled:bg-neutral-700 disabled:text-neutral-500 mb-6"
                        >
                            {isGeneratingImg ? 'Generating...' : `Generate Image (${selectedImageModel === 'gemini-2.5-flash-image' ? 'Flash' : 'Pro'})`}
                        </button>

                        {/* References (Main) - Updated UI */}
                         <div>
                            <div className="flex justify-between items-end mb-2">
                                 <div className="flex flex-col">
                                     <label className="text-[10px] font-bold text-muted block mb-1">REFERENCES (max. 10 for Flash, 14 for Pro.)</label>
                                     <span className="text-[9px] text-red-400 opacity-80">Will be restored to defaults if all are removed. Please use the editing bay below for edits.</span>
                                 </div>
                                 <button 
                                    onClick={() => { setActiveGalleryTarget('main'); setIsGalleryOpen(true); }} 
                                    className="text-[10px] flex items-center gap-1 text-accent hover:text-white transition-colors"
                                >
                                    <LayoutGrid size={12} /> Browse Project
                                </button>
                            </div>
                            <div className="grid grid-cols-6 gap-2 min-h-[40px]" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropReference(e, 'main')}>
                                {(shot.referenceImages || []).map(ref => (
                                    <div key={ref.id} className={`aspect-square relative rounded border overflow-hidden group ${ref.isActive ? 'border-accent' : 'border-subtle opacity-50 grayscale'}`}>
                                        <ResolvedImage urlOrId={ref.url} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => toggleRef('main', ref.id)}>
                                             <button onClick={(e) => deleteRef(e, 'main', ref.id)} className="absolute top-0.5 right-0.5 text-white hover:text-red-400"><X size={10}/></button>
                                        </div>
                                    </div>
                                ))}
                                {(shot.referenceImages || []).length < 14 && (
                                    <div className="aspect-square border border-dashed border-subtle rounded flex items-center justify-center text-muted/30 relative">
                                        <UploadCloud size={14}/>
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files && addReference('main', e.target.files[0])} accept="image/*" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- EDITING BAY --- */}
                    <div className="p-4 bg-black/20 flex-1">
                         <div className="flex items-center justify-between mb-3 border-t border-subtle pt-4">
                            <h4 className="text-xs font-bold text-muted flex items-center gap-2"><Wand2 size={14}/> IMAGE EDITING BAY</h4>
                         </div>

                         {/* Edit Viewport */}
                        <div 
                            className="w-full h-48 bg-black rounded-lg border border-subtle mb-3 relative overflow-hidden group flex items-center justify-center"
                        >
                             {isGeneratingEdit ? (
                                 <div className="text-center">
                                     <BrainCircuit className="w-6 h-6 text-accent animate-spin mx-auto mb-2"/>
                                     <p className="text-xs text-muted">Processing...</p>
                                 </div>
                             ) : editImageId ? (
                                 <>
                                    <ResolvedImage urlOrId={editImageId} className="w-full h-full object-contain" />
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button onClick={() => setFullScreenImage(editImageId)} className="p-1 bg-black/60 text-white rounded hover:bg-accent"><Maximize2 size={12}/></button>
                                        <button onClick={() => setEditImageId(null)} className="p-1 bg-black/60 text-white rounded hover:bg-red-500"><Trash2 size={12}/></button>
                                    </div>
                                 </>
                             ) : (
                                 <div className="text-center text-muted">
                                     <p className="text-xs mb-2">Editor Empty</p>
                                     <div className="relative inline-block">
                                         <button className="text-[10px] bg-subtle px-2 py-1 rounded hover:bg-neutral-600">Upload</button>
                                         <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                                             const file = e.target.files?.[0];
                                             if(file) {
                                                const reader = new FileReader();
                                                reader.onload = async (ev) => {
                                                    const url = ev.target?.result as string;
                                                    const resized = await geminiService.resizeImage(url, 1920, 0.85);
                                                    const id = await storeImageInDB(resized);
                                                    setEditImageId(id);
                                                };
                                                reader.readAsDataURL(file);
                                             }
                                         }} accept="image/*" />
                                     </div>
                                 </div>
                             )}
                        </div>

                         {/* Send to Conception Button */}
                         {editImageId && (
                            <button 
                                onClick={handleSendToConception}
                                className="w-full mb-4 py-1.5 bg-green-900/40 text-green-300 border border-green-800 rounded text-xs font-bold flex items-center justify-center gap-2 hover:bg-green-800/50"
                            >
                                <ArrowUpCircle size={14}/> Send to Conception Area
                            </button>
                         )}

                         {/* Edit Prompt */}
                         <div className="mb-4">
                            <label className="text-[10px] font-bold text-muted block mb-1">EDITING PROMPT</label>
                            <textarea 
                                value={editPrompt} 
                                onChange={(e) => setEditPrompt(e.target.value)} 
                                className="w-full h-16 bg-panel border-subtle rounded p-2 text-xs text-primary-text focus:border-accent"
                                placeholder="Describe changes or new generation..."
                            />
                         </div>
                         
                         <button 
                            onClick={handleGenerateEdit}
                            disabled={isGeneratingEdit}
                            className="w-full py-2 bg-subtle text-primary-text font-bold text-xs rounded hover:bg-neutral-600 mb-4"
                        >
                            {isGeneratingEdit ? 'Rendering...' : 'Generate / Edit'}
                        </button>

                         {/* References (Edit) */}
                         <div>
                            <div className="flex justify-between items-end mb-2">
                                 <label className="text-[10px] font-bold text-muted block mb-1">EDIT REFERENCES (max. 10 for Flash, 14 for Pro.)</label>
                                 <button 
                                    onClick={() => { setActiveGalleryTarget('edit'); setIsGalleryOpen(true); }} 
                                    className="text-[10px] flex items-center gap-1 text-accent hover:text-white transition-colors"
                                >
                                    <LayoutGrid size={12} /> Browse Project
                                </button>
                            </div>
                            <div className="grid grid-cols-6 gap-2 min-h-[40px]" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropReference(e, 'edit')}>
                                {editReferences.map(ref => (
                                    <div key={ref.id} className={`aspect-square relative rounded border overflow-hidden group ${ref.isActive ? 'border-accent' : 'border-subtle opacity-50 grayscale'}`}>
                                        <ResolvedImage urlOrId={ref.url} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => toggleRef('edit', ref.id)}>
                                             <button onClick={(e) => deleteRef(e, 'edit', ref.id)} className="absolute top-0.5 right-0.5 text-white hover:text-red-400"><X size={10}/></button>
                                        </div>
                                    </div>
                                ))}
                                {editReferences.length < 14 && (
                                    <div className="aspect-square border border-dashed border-subtle rounded flex items-center justify-center text-muted/30 relative">
                                        <UploadCloud size={14}/>
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files && addReference('edit', e.target.files[0])} accept="image/*" />
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* COLUMN 2: VIDEO GENERATION */}
                <div className="flex-1 flex flex-col overflow-y-auto p-4 min-w-[300px] bg-panel/20">
                    <h4 className="text-xs font-bold text-muted mb-3 flex items-center gap-2"><Film size={14}/> VIDEO GENERATION (STEP 2)</h4>
                    
                    <div className="aspect-video bg-black rounded-lg border border-subtle mb-3 flex items-center justify-center text-muted relative">
                         {shot.generatedVideoUrl ? (
                             <video src={shot.generatedVideoUrl} controls className="w-full h-full" />
                         ) : (
                             <div className="text-center">
                                 <Film className="w-8 h-8 mx-auto mb-2 opacity-20"/>
                                 <p className="text-xs opacity-50">No Video Generated</p>
                             </div>
                         )}
                         {shot.generatedImageUrl && (
                             <div className="absolute bottom-2 right-2 w-16 h-9 border border-white/20 rounded overflow-hidden shadow-lg">
                                 <ResolvedImage urlOrId={shot.generatedImageUrl} className="w-full h-full object-cover opacity-80" />
                             </div>
                         )}
                    </div>

                    <div className="flex-1 flex flex-col mb-4 min-h-[150px]">
                        <div className="flex justify-between items-end mb-1">
                             <label className="text-[10px] font-bold text-muted block mb-1">VIDEO JSON PROMPT (EDITABLE)</label>
                             <button 
                                onClick={handleDraftVideoJson} 
                                disabled={isDraftingJson} 
                                className="text-[10px] flex items-center gap-1 text-accent hover:underline"
                                title={`Draft using ${selectedTextModel}`}
                            >
                                {isDraftingJson ? <BrainCircuit className="w-3 h-3 animate-spin"/> : <FileJson size={10}/>} Draft Video JSON
                            </button>
                        </div>
                        <textarea 
                            value={videoJsonString} 
                            onChange={(e) => setVideoJsonString(e.target.value)} 
                            className="flex-1 bg-neutral-900 border-subtle rounded p-2 text-[10px] font-mono text-green-400 focus:border-accent"
                            spellCheck={false}
                        />
                    </div>
                    
                    <div className="flex-1 flex flex-col mb-4 min-h-[100px]">
                        <label className="text-[10px] font-bold text-muted block mb-1 flex items-center gap-1"><FileText size={10}/> NARRATIVE SUMMARY (OPTIMIZED SHOT LIST)</label>
                        <textarea 
                            value={videoPlan} 
                            onChange={(e) => setVideoPlan(e.target.value)} 
                            className="flex-1 bg-neutral-900 border-subtle rounded p-2 text-xs font-sans text-primary-text focus:border-accent"
                            placeholder="A human-readable summary of the video segments will appear here..."
                        />
                    </div>

                    <button disabled className="w-full py-2 bg-neutral-700 text-neutral-400 font-bold text-xs rounded cursor-not-allowed">
                        Generate Video (Veo 3.1) - Coming Soon
                    </button>
                    <p className="text-[9px] text-muted text-center mt-2">Requires Veo access. Input Image will be used as the starting frame.</p>
                </div>

            </div>

            {/* Gallery Modal */}
            {isGalleryOpen && (
                <GalleryModal 
                    project={project} 
                    onClose={() => setIsGalleryOpen(false)} 
                    onSelect={handleGallerySelect} 
                />
            )}

             {/* Fullscreen Modal */}
             {fullScreenImage && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-8" onClick={() => setFullScreenImage(null)}>
                    <button 
                        onClick={() => setFullScreenImage(null)} 
                        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                    >
                        <X size={32}/>
                    </button>
                    <div className="w-full h-full flex items-center justify-center pointer-events-none">
                        <ResolvedImage urlOrId={fullScreenImage} className="max-w-full max-h-full object-contain pointer-events-auto shadow-2xl" />
                    </div>
                </div>
            )}
        </div>
    );
};