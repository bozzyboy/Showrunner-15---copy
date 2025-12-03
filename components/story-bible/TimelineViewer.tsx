import React, { useState, useMemo } from 'react';
import { useShowrunnerStore } from '../../store/showrunnerStore';
import { Asset, Season, Episode, Act, Sequel, Project } from '../../types';
import JsonViewer from '../shared/JsonViewer';
import { Search } from 'lucide-react';

interface TimelineViewerProps {
    asset: Asset;
}

interface SceneLocationInfo {
    fullPath: string;
    parentTitle: string;
}

const findSceneLocation = (sceneId: string, project: Project): SceneLocationInfo | null => {
    const isEpisodic = project.format.type === 'EPISODIC';
    if (isEpisodic) {
        for (const season of project.script.seasons || []) {
            for (const episode of season.episodes || []) {
                const scene = episode.scenes.find(s => s.id === sceneId);
                if (scene) {
                    return {
                        fullPath: `S${season.seasonNumber}E${episode.episodeNumber} / Scene ${scene.sceneNumber}`,
                        parentTitle: `Episode: ${episode.title}`
                    };
                }
            }
        }
    } else {
         for (const sequel of project.script.sequels || []) {
            for (const act of sequel.acts || []) {
                const scene = act.scenes.find(s => s.id === sceneId);
                if (scene) {
                    return {
                        fullPath: `P${sequel.partNumber}A${act.actNumber} / Scene ${scene.sceneNumber}`,
                        parentTitle: `Act: ${act.title}`
                    };
                }
            }
        }
    }
    return null;
};

const TimelineViewer: React.FC<TimelineViewerProps> = ({ asset }) => {
    const project = useShowrunnerStore(state => state.project);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTimeline = useMemo(() => {
        if (!asset.timeline) return [];
        if (!searchTerm.trim()) return asset.timeline;
        
        const lowercasedTerm = searchTerm.toLowerCase();
        
        return asset.timeline.filter(snapshot => {
            // Search in trigger text
            if (snapshot.trigger.toLowerCase().includes(lowercasedTerm)) {
                return true;
            }
            // Search in the stringified changes object
            try {
                const changesString = JSON.stringify(snapshot.changes).toLowerCase();
                if (changesString.includes(lowercasedTerm)) {
                    return true;
                }
            } catch (e) { /* ignore errors */ }
            
            return false;
        });
    }, [asset.timeline, searchTerm]);
    
    if (!project || !asset.timeline || asset.timeline.length === 0) {
        return (
            <div className="p-6 text-center text-muted">
                <p>This asset has no recorded state changes in the timeline yet.</p>
                <p className="text-sm">Changes will be automatically added when the Asset Analyzer detects them in the script.</p>
            </div>
        )
    }

    return (
        <div className="p-6">
            <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input 
                    type="text"
                    placeholder="Search timeline changes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-panel border-subtle rounded-md pl-9 p-2 text-sm text-primary-text focus:ring-accent focus:border-accent"
                />
            </div>

            <div className="space-y-4">
                {filteredTimeline.map(snapshot => {
                    const locationInfo = findSceneLocation(snapshot.sceneId, project);
                    return (
                        <div key={snapshot.id} className="bg-panel border border-subtle rounded-xl p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-primary flex-1 pr-4">{snapshot.trigger}</h3>
                                {locationInfo && (
                                    <div className="text-right flex-shrink-0">
                                        <span className="text-xs font-mono bg-surface px-2 py-1 rounded-md text-muted block">
                                            {locationInfo.fullPath}
                                        </span>
                                        <span className="text-xs text-muted/70 mt-1 block truncate max-w-[200px]" title={locationInfo.parentTitle}>
                                            {locationInfo.parentTitle}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <JsonViewer data={snapshot.changes} />
                        </div>
                    )
                })}
                {filteredTimeline.length === 0 && (
                    <p className="text-center text-muted py-8">No timeline entries match your search.</p>
                )}
            </div>
        </div>
    );
};

export default TimelineViewer;