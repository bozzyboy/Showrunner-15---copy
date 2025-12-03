
import React, { useState, useMemo } from 'react';
import { AssetType, Character, Location, Prop, Project, Season, Sequel, Episode, Act, Scene } from '../../types';
import { X, LayoutGrid, Search, Image as ImageIcon, User, MapPin, Package, Clapperboard, Film, ChevronDown, ChevronRight } from 'lucide-react';
import { useImageResolver } from '../../hooks/useImageResolver';

// Helper component to display resolved images
const ResolvedImage: React.FC<{ urlOrId: string | undefined, className?: string }> = ({ urlOrId, className }) => {
    const src = useImageResolver(urlOrId);
    if (!src) return <div className={`bg-neutral-800 animate-pulse ${className}`} />;
    return <img src={src} className={className} alt="Asset" />;
};

interface GalleryModalProps {
    onClose: () => void;
    onSelect: (imageId: string) => void;
    project: Project;
}

const CollapsibleSection: React.FC<{ 
    title: string; 
    icon: React.ReactNode; 
    items: any[]; 
    onSelect: (id: string) => void; 
    onClose: () => void;
    defaultOpen?: boolean;
}> = ({ title, icon, items, onSelect, onClose, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (items.length === 0) return null;

    return (
        <div className="mb-4 border border-subtle rounded-lg bg-panel overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full flex items-center justify-between p-3 bg-surface hover:bg-neutral-800 transition-colors"
            >
                <h4 className="text-xs font-bold text-primary flex items-center gap-2 uppercase">
                    {icon} {title} <span className="text-muted font-normal ml-1">({items.length})</span>
                </h4>
                {isOpen ? <ChevronDown size={14} className="text-muted"/> : <ChevronRight size={14} className="text-muted"/>}
            </button>
            
            {isOpen && (
                <div className="p-4 bg-base/30 border-t border-subtle">
                    <div className="grid grid-cols-4 md:grid-cols-5 gap-4">
                        {items.map(item => (
                            <div 
                                key={item.uniqueKey} 
                                onClick={() => { onSelect(item.imageId); onClose(); }}
                                className="group cursor-pointer border border-subtle rounded-lg overflow-hidden bg-panel hover:border-accent transition-all relative"
                            >
                                <div className="aspect-video w-full overflow-hidden relative">
                                    <ResolvedImage urlOrId={item.imageId} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="bg-black/70 text-white text-[10px] px-2 py-1 rounded font-bold uppercase">Select</span>
                                    </div>
                                    {item.type === 'video' && (
                                        <div className="absolute bottom-1 right-1 bg-black/60 p-1 rounded text-white">
                                            <Film size={10} />
                                        </div>
                                    )}
                                </div>
                                <div className="p-2">
                                    <p className="text-xs font-semibold text-primary-text truncate" title={item.name}>{item.name}</p>
                                    <p className="text-[9px] text-muted uppercase truncate">{item.subtext}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export const GalleryModal: React.FC<GalleryModalProps> = ({ onClose, onSelect, project }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Aggregate and categorize all assets
    const galleryData = useMemo(() => {
        const characters: any[] = [];
        const locations: any[] = [];
        const props: any[] = [];
        const shots: any[] = [];
        const videos: any[] = [];
        
        // 1. Bible Assets
        project.bible.characters.forEach((c: Character) => {
            if (c.profile.generatedImageUrl) {
                characters.push({ uniqueKey: `char-${c.id}`, name: c.profile.name, subtext: c.profile.coreIdentity.primaryNarrativeRole, type: 'character', imageId: c.profile.generatedImageUrl });
            }
        });
        project.bible.locations.forEach((l: Location) => {
            if (l.baseProfile.visuals.generatedImageUrl) {
                locations.push({ uniqueKey: `loc-${l.id}`, name: l.baseProfile.identity.name, subtext: 'Location', type: 'location', imageId: l.baseProfile.visuals.generatedImageUrl });
            }
        });
        project.bible.props.forEach((p: Prop) => {
            if (p.baseProfile.visuals.generatedImageUrl) {
                props.push({ uniqueKey: `prop-${p.id}`, name: p.baseProfile.identity.name, subtext: 'Prop', type: 'prop', imageId: p.baseProfile.visuals.generatedImageUrl });
            }
        });

        // 2. Studio Assets (Shots & Videos)
        if (project.studio && project.studio.shotsByScene) {
            // Helper to map scene IDs to readable names
            const sceneMap = new Map<string, string>();
            const isEpisodic = project.format.type === 'EPISODIC';
            
            if (isEpisodic) {
                 const seasons: Season[] = project.script.seasons || [];
                 seasons.forEach((season: Season) => {
                    season.episodes?.forEach((episode: Episode) => {
                        episode.scenes?.forEach((scene: Scene) => {
                             sceneMap.set(scene.id, `S${season.seasonNumber}E${episode.episodeNumber} Sc ${scene.sceneNumber}`);
                        });
                    });
                });
            } else {
                 const sequels: Sequel[] = project.script.sequels || [];
                 sequels.forEach((sequel: Sequel) => {
                    sequel.acts?.forEach((act: Act) => {
                        act.scenes?.forEach((scene: Scene) => {
                             sceneMap.set(scene.id, `P${sequel.partNumber}A${act.actNumber} Sc ${scene.sceneNumber}`);
                        });
                    });
                });
            }

            Object.entries(project.studio.shotsByScene).forEach(([sceneId, sceneShots]) => {
                const sceneName = sceneMap.get(sceneId) || 'Unknown Scene';
                sceneShots.forEach((shot) => {
                    // Storyboards (Shots)
                    if (shot.generatedImageUrl) {
                        shots.push({
                            uniqueKey: `shot-${shot.id}`,
                            name: `Shot ${shot.shotNumber}`,
                            subtext: sceneName,
                            type: 'shot',
                            imageId: shot.generatedImageUrl
                        });
                    }
                    // Videos
                    if (shot.generatedVideoUrl) {
                         // Videos are represented by their thumbnails (generatedImageUrl) usually, 
                         // but if we had a separate video thumb, we'd use that. 
                         // For now, we assume if video exists, we use the image as thumb but mark it as video.
                         videos.push({
                            uniqueKey: `vid-${shot.id}`,
                            name: `Video: Shot ${shot.shotNumber}`,
                            subtext: sceneName,
                            type: 'video',
                            imageId: shot.generatedImageUrl // Thumb
                        });
                    }
                });
            });
        }

        return { characters, locations, props, shots, videos };
    }, [project]);

    const filterItems = (items: any[]) => items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.subtext.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredChars = filterItems(galleryData.characters);
    const filteredLocs = filterItems(galleryData.locations);
    const filteredProps = filterItems(galleryData.props);
    const filteredShots = filterItems(galleryData.shots);
    const filteredVideos = filterItems(galleryData.videos);

    const hasResults = filteredChars.length > 0 || filteredLocs.length > 0 || filteredProps.length > 0 || filteredShots.length > 0 || filteredVideos.length > 0;
    
    // If searching, expand all sections that have results. If not searching, collapse by default.
    const shouldExpand = searchTerm.length > 0;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8">
            <div className="bg-surface border border-subtle rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl">
                <div className="p-4 border-b border-subtle flex justify-between items-center bg-panel">
                    <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                        <LayoutGrid size={20} className="text-accent"/> Project Gallery
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-4 border-b border-subtle bg-base/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Search characters, locations, shots..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-neutral-800 border-subtle rounded-md pl-9 p-2 text-sm text-primary-text focus:ring-accent focus:border-accent"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-subtle scrollbar-track-transparent">
                    {!hasResults ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted">
                            <ImageIcon size={48} className="mb-2 opacity-20"/>
                            <p>No assets found matching "{searchTerm}"</p>
                        </div>
                    ) : (
                        <>
                            <CollapsibleSection title="Characters" icon={<User size={14}/>} items={filteredChars} onSelect={onSelect} onClose={onClose} defaultOpen={shouldExpand} />
                            <CollapsibleSection title="Locations" icon={<MapPin size={14}/>} items={filteredLocs} onSelect={onSelect} onClose={onClose} defaultOpen={shouldExpand} />
                            <CollapsibleSection title="Props" icon={<Package size={14}/>} items={filteredProps} onSelect={onSelect} onClose={onClose} defaultOpen={shouldExpand} />
                            <CollapsibleSection title="Storyboards" icon={<Clapperboard size={14}/>} items={filteredShots} onSelect={onSelect} onClose={onClose} defaultOpen={shouldExpand} />
                            <CollapsibleSection title="Videos" icon={<Film size={14}/>} items={filteredVideos} onSelect={onSelect} onClose={onClose} defaultOpen={shouldExpand} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
