import { Project, Character, Location, Prop, StateSnapshot, Episode, Act } from '../types';

// Helper to create a master timeline of scene IDs in chronological order
const getSceneTimeline = (project: Project): string[] => {
    const sceneIds: string[] = [];
    const isEpisodic = project.format.type === 'EPISODIC';

    if (isEpisodic) {
        project.script.seasons?.forEach(season => {
            season.episodes.forEach(episode => {
                episode.scenes.forEach(scene => sceneIds.push(scene.id));
            });
        });
    } else {
        project.script.sequels?.forEach(sequel => {
            sequel.acts.forEach(act => {
                act.scenes.forEach(scene => sceneIds.push(scene.id));
            });
        });
    }
    return sceneIds;
};

/**
 * Resolves the state of an asset at a specific point in time (sceneId).
 * It starts with the asset's baseProfile and applies every StateSnapshot
 * from the asset's timeline in chronological order up to that scene.
 * 
 * @param asset The character, location, or prop to resolve.
 * @param sceneId The ID of the scene to resolve the state for.
 * @param project The full project object, needed to establish scene chronology.
 * @returns A new, temporary "resolved" asset object representing its state at that moment.
 */
export function resolveAssetState<T extends Character | Location | Prop>(
    asset: T,
    sceneId: string,
    project: Project
): T {
    // FIX: Use a type guard to handle the different profile structures of Character vs. Location/Prop.
    const initialProfile = 'profile' in asset ? asset.profile : asset.baseProfile;
    // Deep clone the base profile to avoid direct mutation
    let resolvedProfile = JSON.parse(JSON.stringify(initialProfile));

    if (asset.timeline && asset.timeline.length > 0) {
        const sceneTimeline = getSceneTimeline(project);
        const targetSceneIndex = sceneTimeline.indexOf(sceneId);

        if (targetSceneIndex === -1) {
            console.warn(`Scene ID "${sceneId}" not found in project timeline. Returning base state.`);
            if ('profile' in asset) {
                return { ...asset, profile: resolvedProfile };
            }
            return { ...asset, baseProfile: resolvedProfile };
        }

        // Filter and sort snapshots that occur at or before the target scene
        const applicableSnapshots = asset.timeline
            .map(snapshot => ({
                ...snapshot,
                sceneIndex: sceneTimeline.indexOf(snapshot.sceneId)
            }))
            .filter(snapshot => snapshot.sceneIndex !== -1 && snapshot.sceneIndex <= targetSceneIndex)
            .sort((a, b) => a.sceneIndex - b.sceneIndex);
        
        // Apply changes from each snapshot sequentially
        for (const snapshot of applicableSnapshots) {
             // A simple merge. For nested objects, this is not a deep merge,
             // but `snapshot.changes` should contain the full nested object if a property inside it changes.
             // For example, a change to hair color should provide the entire 'hair' object in `changes`.
            resolvedProfile = { ...resolvedProfile, ...snapshot.changes };
        }
    }

    // Return a new asset object with the resolved profile
    if ('profile' in asset) {
        return { ...asset, profile: resolvedProfile };
    }
    return { ...asset, baseProfile: resolvedProfile };
}