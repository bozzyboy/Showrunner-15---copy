import { Project } from '../types';
import { storeImageInDB, initDB } from './storageService';

/**
 * Traverses the project, migrates Base64 images to IndexedDB,
 * AND cleans up "Ghost" references (IDs that point to missing images).
 */
export const migrateProjectImages = async (project: Project): Promise<Project> => {
    let hasChanges = false;
    // Deep clone to avoid mutating the original object immediately
    let newProject = JSON.parse(JSON.stringify(project)); 

    // --- STEP 1: MIGRATE BASE64 TO INDEXEDDB ---
    
    // Helper to process a potential image string
    const processImage = async (val: string | undefined): Promise<string | undefined> => {
        if (!val) return val;
        // If it's already an ID, skip
        if (val.startsWith('img_')) return val;
        // If it's a data URI
        if (val.startsWith('data:image')) {
            hasChanges = true;
            return await storeImageInDB(val);
        }
        return val;
    };

    // 1. Bible Characters
    if (newProject.bible?.characters) {
        for (const char of newProject.bible.characters) {
            if (char.profile) {
                char.profile.generatedImageUrl = await processImage(char.profile.generatedImageUrl);
                if (char.profile.imageHistory) {
                    for (const h of char.profile.imageHistory) {
                        h.url = await processImage(h.url) || h.url;
                    }
                }
            }
        }
    }

    // 2. Bible Locations
    if (newProject.bible?.locations) {
        for (const loc of newProject.bible.locations) {
            if (loc.baseProfile?.visuals) {
                loc.baseProfile.visuals.generatedImageUrl = await processImage(loc.baseProfile.visuals.generatedImageUrl);
                if (loc.baseProfile.visuals.imageHistory) {
                    for (const h of loc.baseProfile.visuals.imageHistory) {
                        h.url = await processImage(h.url) || h.url;
                    }
                }
                if (loc.baseProfile.visuals.referenceImages) {
                     const newRefs = [];
                     for (const ref of loc.baseProfile.visuals.referenceImages) {
                         const id = await processImage(ref);
                         if (id) newRefs.push(id);
                     }
                     loc.baseProfile.visuals.referenceImages = newRefs;
                }
            }
        }
    }

    // 3. Bible Props
    if (newProject.bible?.props) {
        for (const prop of newProject.bible.props) {
            if (prop.baseProfile?.visuals) {
                prop.baseProfile.visuals.generatedImageUrl = await processImage(prop.baseProfile.visuals.generatedImageUrl);
                if (prop.baseProfile.visuals.imageHistory) {
                    for (const h of prop.baseProfile.visuals.imageHistory) {
                        h.url = await processImage(h.url) || h.url;
                    }
                }
                if (prop.baseProfile.visuals.referenceImages) {
                     const newRefs = [];
                     for (const ref of prop.baseProfile.visuals.referenceImages) {
                         const id = await processImage(ref);
                         if (id) newRefs.push(id);
                     }
                     prop.baseProfile.visuals.referenceImages = newRefs;
                }
            }
        }
    }

    // 4. Studio Shots
    if (newProject.studio?.shotsByScene) {
        for (const sceneId in newProject.studio.shotsByScene) {
            const shots = newProject.studio.shotsByScene[sceneId];
            for (const shot of shots) {
                shot.generatedImageUrl = await processImage(shot.generatedImageUrl);
                if (shot.imageHistory) {
                     for (const h of shot.imageHistory) {
                        h.url = await processImage(h.url) || h.url;
                    }
                }
                if (shot.referenceImages) {
                    for (const ref of shot.referenceImages) {
                        ref.url = await processImage(ref.url) || ref.url;
                    }
                }
            }
        }
    }

    if (hasChanges) {
        console.log("Migration complete: Legacy Base64 images moved to IndexedDB.");
    }

    // --- STEP 2: CLEAN UP GHOST REFERENCES (Dead Links) ---
    // This removes references to images that do NOT exist in the DB.
    try {
        newProject = await cleanupBrokenReferences(newProject);
    } catch (e) {
        console.error("Cleanup failed, proceeding with project load:", e);
    }

    return newProject;
};

// --- HELPER: CLEANUP LOGIC ---
const cleanupBrokenReferences = async (project: Project): Promise<Project> => {
    // FIX: Using native Promise wrapper because 'store.getAllKeys()' returns an IDBRequest, not a Promise.
    const getKeys = async (store: IDBObjectStore): Promise<IDBValidKey[]> => {
        return new Promise((resolve, reject) => {
            const request = store.getAllKeys();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    };

    try {
        const db = await initDB();
        const tx = db.transaction('images', 'readonly');
        const store = tx.objectStore('images');
        
        // Get ALL valid Image IDs currently in the database
        const keys = await getKeys(store); 
        const validImageIds = new Set(keys.map(k => String(k)));
        
        let cleanedCount = 0;

        // Check function: Returns the ID if valid, or undefined if invalid
        const verifyId = (id: string | undefined): string | undefined => {
            if (!id) return undefined;
            // Only check our generated IDs (starting with img_)
            if (id.startsWith('img_')) {
                if (!validImageIds.has(id)) {
                    cleanedCount++;
                    return undefined; // Remove it!
                }
            }
            return id;
        };

        // Check function for Arrays: Filters out invalid IDs
        const verifyArray = (ids: string[] | undefined): string[] => {
            if (!ids) return [];
            return ids.filter(id => {
                const isValid = !id.startsWith('img_') || validImageIds.has(id);
                if (!isValid) cleanedCount++;
                return isValid;
            });
        };

        // --- TRAVERSE AND CLEAN ---

        // 1. Characters
        project.bible.characters.forEach(c => {
            c.profile.generatedImageUrl = verifyId(c.profile.generatedImageUrl);
            if (c.profile.imageHistory) {
                c.profile.imageHistory = c.profile.imageHistory.filter(h => validImageIds.has(h.url));
            }
            // Add referenceImages cleanup if CharacterProfile has it (future proofing)
            if (c.profile.referenceImages) {
                c.profile.referenceImages = verifyArray(c.profile.referenceImages);
            }
        });

        // 2. Locations
        project.bible.locations.forEach(l => {
            const v = l.baseProfile.visuals;
            v.generatedImageUrl = verifyId(v.generatedImageUrl);
            v.referenceImageUrl = verifyId(v.referenceImageUrl);
            if (v.imageHistory) v.imageHistory = v.imageHistory.filter(h => validImageIds.has(h.url));
            if (v.referenceImages) v.referenceImages = verifyArray(v.referenceImages);
        });

        // 3. Props
        project.bible.props.forEach(p => {
            const v = p.baseProfile.visuals;
            v.generatedImageUrl = verifyId(v.generatedImageUrl);
            v.referenceImageUrl = verifyId(v.referenceImageUrl);
            if (v.imageHistory) v.imageHistory = v.imageHistory.filter(h => validImageIds.has(h.url));
            if (v.referenceImages) v.referenceImages = verifyArray(v.referenceImages);
        });

        // 4. Studio Shots
        if (project.studio?.shotsByScene) {
            Object.values(project.studio.shotsByScene).forEach(shots => {
                shots.forEach(shot => {
                    shot.generatedImageUrl = verifyId(shot.generatedImageUrl);
                    if (shot.imageHistory) {
                        shot.imageHistory = shot.imageHistory.filter(h => validImageIds.has(h.url));
                    }
                    if (shot.referenceImages) {
                        // Shot references are objects, check the .url property
                        shot.referenceImages = shot.referenceImages.filter(ref => {
                            const isValid = !ref.url.startsWith('img_') || validImageIds.has(ref.url);
                            if (!isValid) cleanedCount++;
                            return isValid;
                        });
                    }
                });
            });
        }

        if (cleanedCount > 0) {
            console.log(`[Project Health] Removed ${cleanedCount} broken image references from the project.`);
        }

    } catch (e) {
        console.error("Error during project cleanup:", e);
    }

    return project;
};