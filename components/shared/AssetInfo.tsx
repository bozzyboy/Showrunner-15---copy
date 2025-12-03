import React, { useMemo, useState } from 'react';
import { useShowrunnerStore } from '../../store/showrunnerStore';
import { Asset } from '../../types';

const getAssetName = (asset: Asset): string => {
    if ('profile' in asset) { // It's a Character
        return asset.profile.name;
    }
    if ('baseProfile' in asset) { // It's a Location or Prop
        return asset.baseProfile.identity.name;
    }
    return 'Unknown Asset';
};


const useAssetAppearances = (assetName: string) => {
    const project = useShowrunnerStore(state => state.project);

    const appearances = useMemo(() => {
        if (!project || !assetName) return [];

        const results: string[] = [];
        const isEpisodic = project.format.type === 'EPISODIC';
        const assetNameLower = assetName.toLowerCase();

        if (isEpisodic) {
            project.script.seasons?.forEach(season => {
                season.episodes.forEach(episode => {
                    episode.scenes.forEach(scene => {
                        if (scene.assets?.characters.some(c => c.toLowerCase() === assetNameLower) ||
                            scene.assets?.locations.some(l => l.toLowerCase() === assetNameLower) ||
                            scene.assets?.props.some(p => p.toLowerCase() === assetNameLower)) {
                            results.push(`S${season.seasonNumber}E${episode.episodeNumber}: Sc ${scene.sceneNumber}`);
                        }
                    });
                });
            });
        } else {
            project.script.sequels?.forEach(sequel => {
                sequel.acts.forEach(act => {
                    act.scenes.forEach(scene => {
                         if (scene.assets?.characters.some(c => c.toLowerCase() === assetNameLower) ||
                             scene.assets?.locations.some(l => l.toLowerCase() === assetNameLower) ||
                             scene.assets?.props.some(p => p.toLowerCase() === assetNameLower)) {
                            results.push(`P${sequel.partNumber}A${act.actNumber}: Sc ${scene.sceneNumber}`);
                        }
                    });
                });
            });
        }
        return results;
    }, [project, assetName]);

    return appearances;
}

export const AssetAppearances: React.FC<{ assetName: string }> = ({ assetName }) => {
    const appearances = useAssetAppearances(assetName);
    const [isExpanded, setIsExpanded] = useState(false);
    const TRUNCATE_LIMIT = 5;

    if (appearances.length === 0) {
        return null;
    }
    
    const displayedAppearances = isExpanded ? appearances : appearances.slice(0, TRUNCATE_LIMIT);

    return (
        <div className="mt-4 border-t border-subtle pt-4">
            <h4 className="text-xs font-bold text-muted mb-2">APPEARANCES</h4>
            <div className="flex flex-wrap gap-1.5">
                {displayedAppearances.map(app => (
                    <span key={app} className="text-xs bg-panel px-2 py-0.5 rounded-full text-primary-text">
                        {app}
                    </span>
                ))}
                {appearances.length > TRUNCATE_LIMIT && !isExpanded && (
                     <button 
                        onClick={() => setIsExpanded(true)}
                        className="text-xs bg-panel px-2 py-0.5 rounded-full text-muted hover:text-primary-text hover:bg-subtle transition-colors cursor-pointer"
                    >
                        +{appearances.length - TRUNCATE_LIMIT} more
                    </button>
                )}
                 {isExpanded && (
                    <button 
                        onClick={() => setIsExpanded(false)}
                        className="text-xs bg-panel px-2 py-0.5 rounded-full text-muted hover:text-primary-text hover:bg-subtle transition-colors cursor-pointer"
                    >
                        Show less
                    </button>
                )}
            </div>
        </div>
    );
};
