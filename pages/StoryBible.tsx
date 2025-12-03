import React, { useState, useMemo } from 'react';
import { useShowrunnerStore } from '../store/showrunnerStore';
import { saveBible } from '../services/storageService';
import { Book, Building, User, MapPin, Download, Upload, Package, Wand2 } from 'lucide-react';
import { Asset, AssetType, GeminiModel } from '../types';
import DetailView from '../components/story-bible/DetailView';

const StoryBible: React.FC = () => {
    const { project, importBible } = useShowrunnerStore();
    const [selectedAssetInfo, setSelectedAssetInfo] = useState<{ id: string; type: AssetType; } | null>(null);
    
    // --- PAGE LEVEL CONTROLS ---
    const [selectedTextModel, setSelectedTextModel] = useState<GeminiModel>('gemini-2.5-flash');

    // Safe accessors to prevent crashes if bible or arrays are undefined
    const characters = project?.bible?.characters || [];
    const locations = project?.bible?.locations || [];
    const props = project?.bible?.props || [];

    const selectedAsset = useMemo(() => {
        if (!project || !selectedAssetInfo) return null;
        const { id, type } = selectedAssetInfo;
        
        switch (type) {
            case 'character': return characters.find(c => c.id === id) || null;
            case 'location': return locations.find(l => l.id === id) || null;
            case 'prop': return props.find(p => p.id === id) || null;
            default: return null;
        }
    }, [project, selectedAssetInfo, characters, locations, props]);

    if (!project) return null;

    const handleSelectAsset = (asset: Asset, type: AssetType) => {
        setSelectedAssetInfo({ id: asset.id, type: type });
    }
    
    const getIcon = (type: AssetType) => {
        switch (type) {
            case 'character': return <User className="w-4 h-4 text-accent" />;
            case 'location': return <MapPin className="w-4 h-4 text-accent" />;
            case 'prop': return <Package className="w-4 h-4 text-accent" />;
            default: return null;
        }
    };

    const allAssetsCount = characters.length + locations.length + props.length;

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h1 className="text-3xl font-black text-primary">Story Bible</h1>
                
                <div className="flex gap-4 items-center">
                    {/* TEXT MODEL SELECTOR */}
                    <div className="flex items-center gap-2 bg-surface p-1.5 rounded-lg border border-subtle">
                        <div className="px-2 text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                            <Wand2 size={12}/> AI Model:
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

                    <div className="flex gap-2 border-l border-subtle pl-4">
                        <button 
                            onClick={() => saveBible(project)} 
                            disabled={!project.bible?.synopsis}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-panel text-primary-text rounded-md hover:bg-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download size={14} /> Save .bible
                        </button>
                        <button 
                            onClick={importBible} 
                            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-panel text-primary-text rounded-md hover:bg-subtle transition-colors"
                        >
                            <Upload size={14} /> Load .bible
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="flex-grow flex gap-6 overflow-hidden">
                {/* Master List */}
                <aside className="w-1/3 max-w-xs bg-surface border border-subtle rounded-xl p-4 overflow-y-auto">
                    <h2 className="text-lg font-bold text-primary mb-4 px-2">Asset Ledger</h2>
                    <nav className="space-y-1">
                         {characters.length > 0 && <h3 className="font-bold text-xs uppercase text-muted px-3 py-2">Characters</h3>}
                         {characters.map(char => (
                             <button key={char.id} onClick={() => handleSelectAsset(char, 'character')} className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedAssetInfo?.id === char.id ? 'bg-panel text-primary font-semibold' : 'text-primary-text hover:bg-panel'}`}>
                                 {getIcon('character')}
                                 <span>{char.profile.name}</span>
                             </button>
                         ))}

                         {locations.length > 0 && <h3 className="font-bold text-xs uppercase text-muted px-3 py-2 mt-4">Locations</h3>}
                         {locations.map(loc => (
                             <button key={loc.id} onClick={() => handleSelectAsset(loc, 'location')} className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedAssetInfo?.id === loc.id ? 'bg-panel text-primary font-semibold' : 'text-primary-text hover:bg-panel'}`}>
                                 {getIcon('location')}
                                 <span>{loc.baseProfile.identity.name}</span>
                             </button>
                         ))}

                         {props.length > 0 && <h3 className="font-bold text-xs uppercase text-muted px-3 py-2 mt-4">Props</h3>}
                         {props.map(prop => (
                             <button key={prop.id} onClick={() => handleSelectAsset(prop, 'prop')} className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedAssetInfo?.id === prop.id ? 'bg-panel text-primary font-semibold' : 'text-primary-text hover:bg-panel'}`}>
                                 {getIcon('prop')}
                                 <span>{prop.baseProfile.identity.name}</span>
                             </button>
                         ))}

                         {allAssetsCount === 0 && (
                            <p className="text-muted text-sm px-2 mt-4">No assets found. Go to the Scriptwriter, write scenes, and run the Asset Analyzer to populate your bible.</p>
                         )}
                    </nav>
                </aside>

                {/* Detail View */}
                <main className="flex-1 bg-surface border border-subtle rounded-xl overflow-y-auto">
                    {selectedAsset && selectedAssetInfo ? (
                        <DetailView 
                            key={selectedAsset.id} 
                            asset={selectedAsset} 
                            type={selectedAssetInfo.type} 
                            selectedModel={selectedTextModel} // Pass the selected model
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted">
                            <Book size={48} className="mb-4 text-subtle" />
                            <h2 className="text-xl font-bold text-primary">Select an Asset</h2>
                            <p>Choose an asset from the ledger to view and edit its details.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default StoryBible;