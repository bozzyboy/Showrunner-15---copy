import React, { useState, useEffect } from 'react';
import { useShowrunnerStore } from '../store/showrunnerStore';
import { Character, Location, Prop, AssetType, Asset, GeminiModel, ShotReferenceImage } from '../types';
import { geminiService } from '../services/geminiService';
import { storeImageInDB, saveArtDept } from '../services/storageService';
import { useImageResolver } from '../hooks/useImageResolver';
import { GalleryModal } from '../components/shared/GalleryModal';
import { Download, UploadCloud, X, History, BrainCircuit, Sparkles, User, MapPin, Package, Wand2, Archive, Folder, FolderOpen, CopyPlus, LayoutGrid, Maximize2, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Helper component to display resolved images
const ResolvedImage: React.FC<{ urlOrId: string | undefined, className?: string }> = ({ urlOrId, className }) => {
    const src = useImageResolver(urlOrId);
    if (!src) return <div className={`bg-neutral-800 animate-pulse ${className}`} />;
    return <img src={src} className={className} alt="Asset" />;
};

const ArtDept: React.FC = () => {
    const { project, updateCharacter, updateLocation, updateProp, importArtDept } = useShowrunnerStore();
    const [selectedAsset, setSelectedAsset] = useState<{ id: string; type: AssetType } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isWritingPrompt, setIsWritingPrompt] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false); 
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
    
    // --- PAGE LEVEL CONTROLS ---
    const [selectedTextModel, setSelectedTextModel] = useState<GeminiModel>('gemini-2.5-flash');
    const [selectedImageModel, setSelectedImageModel] = useState<'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview'>('gemini-3-pro-image-preview');
    const [selectedResolution, setSelectedResolution] = useState<string>('1K');

    // Collapsible states
    const [isCharsOpen, setIsCharsOpen] = useState(true);
    const [isLocsOpen, setIsLocsOpen] = useState(true);
    const [isPropsOpen, setIsPropsOpen] = useState(true);
    
    // Local state for the editable prompt
    const [localPrompt, setLocalPrompt] = useState('');

    if (!project) return null;

    const getAsset = (): Asset | undefined => {
        if (!selectedAsset) return undefined;
        if (selectedAsset.type === 'character') return project.bible.characters.find(c => c.id === selectedAsset.id);
        if (selectedAsset.type === 'location') return project.bible.locations.find(l => l.id === selectedAsset.id);
        return project.bible.props.find(p => p.id === selectedAsset.id);
    };

    const activeAsset = getAsset();
    const activeProfile = activeAsset ? ('profile' in activeAsset ? activeAsset.profile : activeAsset.baseProfile) : null;
    const activeVisuals = activeAsset ? ('profile' in activeAsset ? activeAsset.profile : activeAsset.baseProfile.visuals) : null;

    const generatedImageUrl = activeVisuals?.generatedImageUrl;
    const imageHistory = activeVisuals?.imageHistory || [];
    const referenceImages = activeVisuals?.referenceImages || [];
    
    useEffect(() => {
        if (activeVisuals?.visualPrompt) {
            setLocalPrompt(activeVisuals.visualPrompt);
        } else {
            setLocalPrompt('');
        }
    }, [selectedAsset?.id]);

    const handleUpdate = (updates: any) => {
        if (!activeAsset || !selectedAsset) return;
        
        if (selectedAsset.type === 'character') {
            updateCharacter({ id: selectedAsset.id, profile: { ...(activeAsset as Character).profile, ...updates } });
        } else if (selectedAsset.type === 'location') {
            const loc = activeAsset as Location;
            updateLocation({ id: selectedAsset.id, baseProfile: { ...loc.baseProfile, visuals: { ...loc.baseProfile.visuals, ...updates } } });
        } else {
            const prop = activeAsset as Prop;
            updateProp({ id: selectedAsset.id, baseProfile: { ...prop.baseProfile, visuals: { ...prop.baseProfile.visuals, ...updates } } });
        }
    };
    
    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setLocalPrompt(val);
        handleUpdate({ visualPrompt: val });
    };

    const handleAutoWritePrompt = async () => {
        if (!activeAsset) return;
        setIsWritingPrompt(true);
        try {
            const generatedPrompt = await geminiService.generateAssetArtPrompt(activeAsset, project, selectedTextModel);
            setLocalPrompt(generatedPrompt);
            handleUpdate({ visualPrompt: generatedPrompt });
        } catch (e) {
            console.error(e);
            alert("Failed to auto-write prompt.");
        } finally {
            setIsWritingPrompt(false);
        }
    };

    const processAndStoreImage = async (base64OrDataUrl: string) => {
         const id = await storeImageInDB(base64OrDataUrl);
         const newHistory = [{ id: uuidv4(), url: id, timestamp: Date.now() }, ...imageHistory];
         handleUpdate({ generatedImageUrl: id, imageHistory: newHistory });
    };

    const handleGenerate = async () => {
        if (!activeProfile) return;
        let promptToUse = localPrompt;
        
        if (!promptToUse) {
            const identityName = 'name' in activeProfile ? activeProfile.name : activeProfile.identity.name;
            promptToUse = `Generate a cinematic concept art for: ${identityName}. Aspect Ratio 16:9.`;
        }

        setIsGenerating(true);
        try {
            const refsForService: ShotReferenceImage[] = referenceImages.map(id => ({
                id: uuidv4(),
                sourceType: 'user_upload',
                url: id,
                isActive: true,
                name: 'Reference'
            }));

            const base64 = await geminiService.generateVisual(promptToUse, selectedImageModel, selectedResolution, refsForService);
            const dataUrl = `data:image/png;base64,${base64}`;
            await processAndStoreImage(dataUrl);
        } catch (e) {
            console.error(e);
            alert("Failed to generate image.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDropMain = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const url = ev.target?.result as string;
                const resized = await geminiService.resizeImage(url, 1920, 0.85);
                await processAndStoreImage(resized);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDropReference = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                 const url = ev.target?.result as string;
                 const resized = await geminiService.resizeImage(url, 1024, 0.7);
                 const id = await storeImageInDB(resized);
                 handleUpdate({ referenceImages: [...referenceImages, id] });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddToReferences = () => {
        if (!generatedImageUrl) return;
        if (referenceImages.length >= 14) {
            alert("Reference limit reached (14 max).");
            return;
        }
        if (referenceImages.includes(generatedImageUrl)) return; 
        handleUpdate({ referenceImages: [...referenceImages, generatedImageUrl] });
    };
    
    const handleAddFromGallery = (imageId: string) => {
        if (referenceImages.length >= 14) {
            alert("Reference limit reached (14 max).");
            return;
        }
        if (referenceImages.includes(imageId)) return; 
        handleUpdate({ referenceImages: [...referenceImages, imageId] });
    };

    const removeReference = (idx: number) => {
        const newRefs = [...referenceImages];
        newRefs.splice(idx, 1);
        handleUpdate({ referenceImages: newRefs });
    };

    const ImageDownloadButton: React.FC<{ id: string }> = ({ id }) => {
        const src = useImageResolver(id);
        if (!src) return null;
        return (
             <a href={src} download={`asset_${id}.png`} className="p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors" title="Download">
                <Download size={14} />
            </a>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h1 className="text-3xl font-black text-primary">Art Department</h1>
                
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 bg-surface p-1.5 rounded-lg border border-subtle">
                        <div className="px-2 text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                            <Wand2 size={12}/> Writer:
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
                            onClick={() => saveArtDept(project)} 
                            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-panel text-primary-text rounded-md hover:bg-subtle"
                            title="Save Art Dept (Bible + Images)"
                        >
                            <Download size={14} /> Save .artdept
                        </button>
                        <button 
                            onClick={importArtDept} 
                            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-panel text-primary-text rounded-md hover:bg-subtle"
                        >
                            <Upload size={14} /> Load .artdept
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                <aside className="w-64 flex-shrink-0 bg-surface border border-subtle rounded-xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-subtle bg-panel flex justify-between items-center">
                        <h2 className="font-bold text-primary flex items-center gap-2"><Archive size={18} /> Assets</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {project.bible.characters.length > 0 && (
                            <div>
                                <button onClick={() => setIsCharsOpen(!isCharsOpen)} className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-primary-text hover:bg-panel rounded-md transition-colors">
                                    {isCharsOpen ? <FolderOpen size={14} className="text-accent"/> : <Folder size={14} className="text-accent"/>}
                                    <span>Characters</span>
                                    <span className="text-xs text-muted ml-auto">({project.bible.characters.length})</span>
                                </button>
                                {isCharsOpen && (
                                    <div className="pl-4 mt-1 space-y-0.5 border-l border-subtle ml-2.5">
                                        {project.bible.characters.map(c => (
                                            <button key={c.id} onClick={() => setSelectedAsset({ id: c.id, type: 'character' })} className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors ${selectedAsset?.id === c.id ? 'bg-accent/20 text-accent font-semibold' : 'text-muted hover:text-primary-text hover:bg-panel'}`}>
                                                <User size={12} />
                                                <span className="truncate">{c.profile.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {project.bible.locations.length > 0 && (
                            <div>
                                <button onClick={() => setIsLocsOpen(!isLocsOpen)} className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-primary-text hover:bg-panel rounded-md transition-colors">
                                    {isLocsOpen ? <FolderOpen size={14} className="text-accent"/> : <Folder size={14} className="text-accent"/>}
                                    <span>Locations</span>
                                    <span className="text-xs text-muted ml-auto">({project.bible.locations.length})</span>
                                </button>
                                {isLocsOpen && (
                                    <div className="pl-4 mt-1 space-y-0.5 border-l border-subtle ml-2.5">
                                        {project.bible.locations.map(l => (
                                            <button key={l.id} onClick={() => setSelectedAsset({ id: l.id, type: 'location' })} className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors ${selectedAsset?.id === l.id ? 'bg-accent/20 text-accent font-semibold' : 'text-muted hover:text-primary-text hover:bg-panel'}`}>
                                                <MapPin size={12} />
                                                <span className="truncate">{l.baseProfile.identity.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {project.bible.props.length > 0 && (
                            <div>
                                <button onClick={() => setIsPropsOpen(!isPropsOpen)} className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-primary-text hover:bg-panel rounded-md transition-colors">
                                    {isPropsOpen ? <FolderOpen size={14} className="text-accent"/> : <Folder size={14} className="text-accent"/>}
                                    <span>Props</span>
                                    <span className="text-xs text-muted ml-auto">({project.bible.props.length})</span>
                                </button>
                                {isPropsOpen && (
                                    <div className="pl-4 mt-1 space-y-0.5 border-l border-subtle ml-2.5">
                                        {project.bible.props.map(p => (
                                            <button key={p.id} onClick={() => setSelectedAsset({ id: p.id, type: 'prop' })} className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors ${selectedAsset?.id === p.id ? 'bg-accent/20 text-accent font-semibold' : 'text-muted hover:text-primary-text hover:bg-panel'}`}>
                                                <Package size={12} />
                                                <span className="truncate">{p.baseProfile.identity.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </aside>

                <main className="flex-1 bg-surface border border-subtle rounded-xl p-6 overflow-y-auto">
                    {activeAsset ? (
                        <div className="max-w-2xl mx-auto">
                            <h1 className="text-2xl font-black text-primary mb-6">{('profile' in activeAsset ? activeAsset.profile.name : activeAsset.baseProfile.identity.name)}</h1>
                            
                            <div 
                                className={`aspect-video w-full bg-panel rounded-lg mb-4 flex items-center justify-center overflow-hidden relative border-2 group ${isDragging ? 'border-accent' : 'border-transparent'}`}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDropMain}
                            >
                                {isGenerating ? (
                                    <div className="flex flex-col items-center text-muted">
                                        <BrainCircuit className="h-10 w-10 animate-spin text-accent" />
                                        <p className="text-sm mt-2">Generating...</p>
                                    </div>
                                ) : generatedImageUrl ? (
                                    <>
                                        <ResolvedImage urlOrId={generatedImageUrl} className="w-full h-full object-contain" />
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => setFullScreenImage(generatedImageUrl)} 
                                                className="p-1 bg-black/50 text-white rounded-full hover:bg-accent transition-colors" 
                                                title="Fullscreen"
                                            >
                                                <Maximize2 size={14} />
                                            </button>
                                            <button onClick={handleAddToReferences} className="p-1 bg-black/50 text-white rounded-full hover:bg-accent transition-colors" title="Add to References">
                                                <CopyPlus size={14} />
                                            </button>
                                            <ImageDownloadButton id={generatedImageUrl} />
                                            <button onClick={() => handleUpdate({ generatedImageUrl: undefined })} className="p-1 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors" title="Delete">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center text-muted flex flex-col items-center justify-center h-full w-full">
                                        <Sparkles className="h-10 w-10 mx-auto mb-2 text-subtle" />
                                        <p className="text-xs mb-3">Drag & Drop Image<br/>or Generate</p>
                                        <div className="relative">
                                            <button className="px-3 py-1 bg-subtle hover:bg-neutral-600 text-xs rounded-md text-primary-text flex items-center gap-1">
                                                <UploadCloud size={12} /> Upload
                                            </button>
                                            <input 
                                                type="file" 
                                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = async (ev) => {
                                                            const url = ev.target?.result as string;
                                                            const resized = await geminiService.resizeImage(url, 1920, 0.85);
                                                            await processAndStoreImage(resized);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mb-4">
                                <div className="flex justify-between items-end mb-1">
                                    <label className="text-xs font-bold text-muted uppercase">Visual Prompt</label>
                                    <button 
                                        onClick={handleAutoWritePrompt} 
                                        disabled={isWritingPrompt}
                                        className="flex items-center gap-1 text-[10px] bg-subtle hover:bg-neutral-600 px-2 py-1 rounded text-accent disabled:opacity-50"
                                    >
                                        {isWritingPrompt ? <BrainCircuit className="animate-spin w-3 h-3"/> : <Wand2 size={12}/>}
                                        Auto-Write (Uses {selectedTextModel === 'gemini-2.5-flash' ? 'Flash' : 'Pro'})
                                    </button>
                                </div>
                                <textarea 
                                    value={localPrompt}
                                    onChange={handlePromptChange}
                                    placeholder="Describe the image details, lighting, style..."
                                    className="w-full h-24 bg-panel border-subtle rounded-md p-3 text-sm text-primary-text focus:ring-accent focus:border-accent"
                                />
                            </div>

                            <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-3 bg-primary text-neutral-900 font-bold rounded-lg mb-6 hover:bg-slate-200 disabled:opacity-50">
                                {isGenerating ? 'Generating...' : `Generate with ${selectedImageModel === 'gemini-2.5-flash-image' ? 'Flash' : 'Pro'}`}
                            </button>

                            {imageHistory.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-[10px] uppercase font-bold text-muted mb-2 flex items-center gap-1"><History size={10}/> History</p>
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                        {imageHistory.map(img => (
                                            <div 
                                                key={img.id} 
                                                onClick={() => handleUpdate({ generatedImageUrl: img.url })}
                                                className="w-12 h-12 flex-shrink-0 rounded border border-subtle overflow-hidden cursor-pointer hover:border-accent"
                                            >
                                                <ResolvedImage urlOrId={img.url} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="mb-4">
                                <div className="flex justify-between items-end mb-2">
                                    <p className="text-[10px] uppercase font-bold text-muted">REFERENCES (max. 10 for Flash, 14 for Pro.)</p>
                                    <button 
                                        onClick={() => setIsGalleryOpen(true)} 
                                        className="text-[10px] flex items-center gap-1 text-accent hover:text-white transition-colors"
                                    >
                                        <LayoutGrid size={12} /> Browse Project
                                    </button>
                                </div>
                                <div 
                                    className="grid grid-cols-5 gap-2 min-h-[40px]"
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDropReference}
                                >
                                    {referenceImages.map((id, idx) => (
                                        <div key={idx} className="aspect-square rounded border border-subtle overflow-hidden relative group">
                                            <ResolvedImage urlOrId={id} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button onClick={() => removeReference(idx)} className="text-white hover:text-red-400"><X size={12}/></button>
                                            </div>
                                        </div>
                                    ))}
                                    {referenceImages.length < 14 && (
                                        <div className="aspect-square rounded border border-dashed border-subtle flex items-center justify-center text-muted/50 hover:text-muted hover:border-muted cursor-pointer relative">
                                            <UploadCloud size={14} />
                                            <input 
                                                type="file" 
                                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = async (ev) => {
                                                            const url = ev.target?.result as string;
                                                            const resized = await geminiService.resizeImage(url, 1024, 0.7);
                                                            const id = await storeImageInDB(resized);
                                                            handleUpdate({ referenceImages: [...referenceImages, id] });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted">
                            <p>Select an asset to begin.</p>
                        </div>
                    )}
                </main>
            </div>
            
            {isGalleryOpen && (
                <GalleryModal 
                    project={project} 
                    onClose={() => setIsGalleryOpen(false)} 
                    onSelect={handleAddFromGallery} 
                />
            )}

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

export default ArtDept;