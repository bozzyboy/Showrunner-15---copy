import React, { useState, useEffect } from 'react';
import { useShowrunnerStore } from '../../store/showrunnerStore';
import { Asset, AssetType, Character, Location, Prop, CharacterProfile, GeminiModel } from '../../types';
import { ConsistencyBadge } from '../shared/Badges';
import { AssetAppearances } from '../shared/AssetInfo';
import { Lock, BrainCircuit, AlertTriangle } from 'lucide-react';
import VisualsEditor from './VisualsEditor';
import JsonViewer from '../shared/JsonViewer';
import TimelineViewer from './TimelineViewer';
import AudioEditor from './AudioEditor';
import CoreIdentityEditor from './CoreIdentityEditor';
import { geminiService } from '../../services/geminiService';

interface DetailViewProps {
  asset: Asset;
  type: AssetType;
  selectedModel: GeminiModel; // New Prop
}

const CanonLockToggle: React.FC<{ asset: Asset; type: AssetType }> = ({ asset, type }) => {
    const { updateAssetConsistency } = useShowrunnerStore();
    const isLocked = asset.consistencyMode === 'STRICT';

    const handleToggle = () => {
        const newMode = isLocked ? 'FLEXIBLE' : 'STRICT';
        updateAssetConsistency(type, asset.id, newMode);
    };

    return (
        <button onClick={handleToggle} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${isLocked ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-subtle text-primary-text hover:bg-neutral-600'}`}>
            <Lock size={12} />
            {isLocked ? 'Canon Locked' : 'Lock Canon'}
        </button>
    );
};


const DetailView: React.FC<DetailViewProps> = ({ asset, type, selectedModel }) => {
    const { project, populateCharacterProfile } = useShowrunnerStore();
    const [activeTab, setActiveTab] = useState<'Overview' | 'Visuals' | 'Audio' | 'Timeline' | 'Raw Data'>('Overview');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset tab when switching assets
    useEffect(() => {
        setActiveTab('Overview');
        setError(null);
    }, [asset.id]);

    const handleAutoPopulate = async () => {
      if (!project || type !== 'character') return;
      setIsGenerating(true);
      setError(null);
      try {
        // Use the selectedModel passed from props instead of global store model
        const fullProfile = await geminiService.generateCharacterProfile(asset as Character, project, selectedModel);
        populateCharacterProfile(asset.id, fullProfile);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
      } finally {
        setIsGenerating(false);
      }
    };
    
    const renderContent = () => {
        switch (activeTab) {
            case 'Overview':
                if (type === 'character') return <CoreIdentityEditor character={asset as Character} />;
                return (
                    <div className="p-6">
                        <p className="text-primary-text">{('baseProfile' in asset) ? (asset.baseProfile?.narrative?.description || 'No description yet.') : 'No description yet.'}</p>
                        <AssetAppearances assetName={('profile' in asset) ? asset.profile.name : asset.baseProfile.identity.name} />
                    </div>
                );
            case 'Visuals':
                if (type === 'character') return <VisualsEditor character={asset as Character} />;
                return <p className="p-6 text-muted">Visual editor for this asset type is not yet available.</p>;
            case 'Audio':
                if (type === 'character') return <AudioEditor character={asset as Character} />;
                 return <p className="p-6 text-muted">Audio editor for this asset type is not yet available.</p>;
            case 'Timeline':
                return <TimelineViewer asset={asset} />;
            case 'Raw Data':
                const dataToShow = type === 'character' ? (asset as Character).profile : (asset as Location | Prop).baseProfile;
                return (
                    <div className="p-6 space-y-4">
                        <div>
                            <h3 className="text-lg font-bold text-primary mb-2">Profile Data</h3>
                            <JsonViewer data={dataToShow} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-primary mb-2">Timeline Snapshots</h3>
                            <JsonViewer data={asset.timeline} />
                        </div>
                    </div>
                )
            default:
                const name = ('profile' in asset) ? asset.profile.name : asset.baseProfile.identity.name;
                return (
                    <div className="p-6">
                        <p className="text-primary-text">{('baseProfile' in asset) ? (asset.baseProfile?.narrative?.description || 'No description yet.') : 'No description yet.'}</p>
                        <AssetAppearances assetName={name} />
                    </div>
                )
        }
    }

    const assetName = type === 'character' ? (asset as Character).profile.name : (asset as Location | Prop).baseProfile.identity.name;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-subtle flex-shrink-0">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black text-primary">{assetName}</h2>
                        {type === 'character' && <p className="text-sm uppercase text-muted font-bold tracking-wider mt-1">{(asset as Character).profile.coreIdentity?.primaryNarrativeRole}</p>}
                    </div>
                    <div className="flex items-center gap-4">
                        {asset.analysis && <ConsistencyBadge mode={asset.consistencyMode} reasoning={asset.analysis.reasoning} />}
                        <CanonLockToggle asset={asset} type={type} />
                    </div>
                </div>
                 {type === 'character' && (
                  <div className="mt-4">
                    <button 
                      onClick={handleAutoPopulate} 
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-neutral-900 bg-primary rounded-md hover:bg-slate-200 disabled:bg-neutral-600 disabled:text-neutral-400 disabled:cursor-wait transition-colors"
                      title={`Auto-populate using ${selectedModel === 'gemini-2.5-flash' ? 'Flash' : 'Pro'}`}
                    >
                      {isGenerating ? <BrainCircuit className="animate-spin h-5 w-5" /> : <BrainCircuit size={16} />}
                      {isGenerating ? 'Generating Profile...' : 'Auto-Populate with AI'}
                    </button>
                    {error && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 p-2 rounded-md">
                        <AlertTriangle size={14}/>
                        <span>{error}</span>
                      </div>
                    )}
                  </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-subtle flex-shrink-0">
                <button onClick={() => setActiveTab('Overview')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'Overview' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-primary-text'}`}>
                    Overview
                </button>
                <button onClick={() => setActiveTab('Visuals')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'Visuals' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-primary-text'}`}>
                    Visuals
                </button>
                <button onClick={() => setActiveTab('Audio')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'Audio' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-primary-text'}`}>
                    Audio
                </button>
                <button onClick={() => setActiveTab('Timeline')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'Timeline' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-primary-text'}`}>
                    Timeline
                </button>
                 <button onClick={() => setActiveTab('Raw Data')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'Raw Data' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-primary-text'}`}>
                    Raw Data
                </button>
            </div>
            
            {/* Content */}
            <div className="flex-grow overflow-y-auto">
                 {renderContent()}
            </div>
        </div>
    );
};

export default DetailView;