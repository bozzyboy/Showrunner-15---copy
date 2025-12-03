import { Project, Bible, Script, Season, Sequel, ContinuityBrief, Studio, Shot } from '../types';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { v4 as uuidv4 } from 'uuid';

// --- HELPERS ---

const getTimestamp = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day}${month}${year}_${hours}-${minutes}`;
}

const getFileName = (projectName: string, extension: string) => {
    return `${projectName.replace(/ /g, '_')}_${getTimestamp()}.${extension}`;
}

// --- INTELLIGENT NAMING & FOLDER CLASSIFICATION ---

// Determines the friendly filename (e.g., Char_Bob_img123.png)
const findContextForImageId = (id: string, project: Project): string | null => {
    // 1. Bible Characters
    const char = project.bible.characters.find(c => c.profile.generatedImageUrl === id);
    if (char) return `Char_${char.profile.name.replace(/[^a-zA-Z0-9]/g, '')}`; 
    
    // 2. Bible Locations
    const loc = project.bible.locations.find(l => l.baseProfile.visuals.generatedImageUrl === id);
    if (loc) return `Loc_${loc.baseProfile.identity.name.replace(/[^a-zA-Z0-9]/g, '')}`;
    
    // 3. Bible Props
    const prop = project.bible.props.find(p => p.baseProfile.visuals.generatedImageUrl === id);
    if (prop) return `Prop_${prop.baseProfile.identity.name.replace(/[^a-zA-Z0-9]/g, '')}`;
    
    // 4. Studio Shots
    // We need to scan all scenes to find where this shot lives
    let shotName = null;
    const isEpisodic = project.format.type === 'EPISODIC';
    
    const scanShots = (shots: Shot[], prefix: string) => {
        const shot = shots.find(s => s.generatedImageUrl === id);
        if (shot) {
            shotName = `${prefix}_Shot${shot.shotNumber}`;
        }
    };

    if (isEpisodic && project.script.seasons) {
        project.script.seasons.forEach(s => {
            s.episodes.forEach(e => {
                e.scenes.forEach(sc => {
                    const shots = project.studio.shotsByScene[sc.id];
                    if (shots) scanShots(shots, `S${s.seasonNumber}E${e.episodeNumber}_Sc${sc.sceneNumber}`);
                });
            });
        });
    } else if (project.script.sequels) {
        project.script.sequels.forEach(s => {
            s.acts.forEach(a => {
                a.scenes.forEach(sc => {
                    const shots = project.studio.shotsByScene[sc.id];
                    if (shots) scanShots(shots, `P${s.partNumber}A${a.actNumber}_Sc${sc.sceneNumber}`);
                });
            });
        });
    }

    return shotName;
};

// Determines which folder the image goes into (artdept, shots, or history)
const classifyImageFolder = (id: string, project: Project): string => {
    // 1. ART DEPT (Highest Priority: Active Bible Assets)
    if (project.bible.characters.some(c => c.profile.generatedImageUrl === id) ||
        project.bible.locations.some(l => l.baseProfile.visuals.generatedImageUrl === id) ||
        project.bible.props.some(p => p.baseProfile.visuals.generatedImageUrl === id)) {
        return 'artdept';
    }

    // 2. SHOTS (Active Studio Shots)
    let isShot = false;
    Object.values(project.studio.shotsByScene || {}).forEach(shots => {
        if (shots.some(s => s.generatedImageUrl === id)) isShot = true;
    });
    if (isShot) return 'shots';

    // 3. HISTORY (Everything else: Reference images, old generations, unused assets)
    return 'history';
};

// --- INDEXED DB SETUP ---
const DB_NAME = 'ShowrunnerDB';
const DB_VERSION = 3;
const PROJECT_STORE = 'projects';
const IMAGE_STORE = 'images';
const HASH_STORE = 'image_hashes';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PROJECT_STORE)) db.createObjectStore(PROJECT_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE);
      if (!db.objectStoreNames.contains(HASH_STORE)) db.createObjectStore(HASH_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// --- HASHING ---
async function computeBlobHash(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- IMAGE OPERATIONS ---
export const storeImageInDB = async (base64OrBlob: string | Blob): Promise<string> => {
    let blob: Blob;
    if (typeof base64OrBlob === 'string') {
        try {
            const arr = base64OrBlob.split(',');
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) u8arr[n] = bstr.charCodeAt(n);
            blob = new Blob([u8arr], { type: mime });
        } catch (e) {
            throw e;
        }
    } else {
        blob = base64OrBlob;
    }

    const hash = await computeBlobHash(blob);
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
        const tx = db.transaction([IMAGE_STORE, HASH_STORE], 'readwrite');
        const imageStore = tx.objectStore(IMAGE_STORE);
        const hashStore = tx.objectStore(HASH_STORE);

        const hashRequest = hashStore.get(hash);

        hashRequest.onsuccess = () => {
            const existingId = hashRequest.result;
            if (existingId) {
                const verifyRequest = imageStore.get(existingId);
                verifyRequest.onsuccess = () => {
                    if (verifyRequest.result) {
                        resolve(existingId);
                    } else {
                        console.warn(`[Storage] Repaired ghost image ${existingId}.`);
                        imageStore.put(blob, existingId);
                        tx.oncomplete = () => resolve(existingId);
                    }
                };
                verifyRequest.onerror = () => {
                    const newId = `img_${uuidv4()}`;
                    imageStore.put(blob, newId);
                    hashStore.put(newId, hash);
                    tx.oncomplete = () => resolve(newId);
                }
            } else {
                const newId = `img_${uuidv4()}`;
                imageStore.put(blob, newId);
                hashStore.put(newId, hash);
                tx.oncomplete = () => resolve(newId);
                tx.onerror = () => reject(tx.error);
            }
        };
        hashRequest.onerror = () => reject(hashRequest.error);
    });
};

export const getImageFromDB = async (id: string): Promise<Blob | null> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IMAGE_STORE, 'readonly');
        const store = tx.objectStore(IMAGE_STORE);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};

// --- REUSABLE EXPORT/IMPORT LOGIC ---

async function exportDataWithImages(data: any, baseFileName: string, extension: string, projectContext?: Project, onStatusUpdate?: (status: string) => void) {
    try {
        onStatusUpdate?.("Preparing data...");
        await new Promise(resolve => setTimeout(resolve, 10));

        const zip = new JSZip();
        const jsonString = JSON.stringify(data, null, 2);
        
        // Save main data file. Use 'project.json' for full projects, 'data.json' for sub-modules
        const mainDataFile = extension === 'zip' || extension === 'showrunner' ? 'project.json' : 'data.json';
        zip.file(mainDataFile, jsonString);

        // Find Image IDs
        const imageIds = new Set<string>();
        const regex = /"(img_[a-f0-9\-]+)"/g;
        let match;
        while ((match = regex.exec(jsonString)) !== null) {
            imageIds.add(match[1]);
        }

        if (imageIds.size > 0) {
            let processed = 0;
            onStatusUpdate?.(`Packing ${imageIds.size} assets...`);
            
            for (const id of imageIds) {
                const blob = await getImageFromDB(id);
                if (blob) {
                    const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
                    
                    // Default to ID filename in 'history' folder
                    let filename = `${id}.${ext}`;
                    let folder = 'history';

                    // If we have context, classify it properly
                    if (projectContext) {
                        const friendlyName = findContextForImageId(id, projectContext);
                        const classification = classifyImageFolder(id, projectContext);
                        
                        folder = classification;
                        if (friendlyName) {
                            filename = `${friendlyName}__${id}.${ext}`;
                        }
                    }

                    zip.folder(folder)?.file(filename, blob);
                }
                processed++;
            }
        }

        onStatusUpdate?.("Compressing...");
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, getFileName(baseFileName, extension));
        onStatusUpdate?.("Done!");

    } catch (e: any) {
        console.error("Export failed", e);
        alert(`Failed to export .${extension} file: ` + e.message);
    }
}

async function importDataWithImages<T>(extension: string): Promise<T | null> {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = `.${extension},.zip,.showrunner,.json`; 
        
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) { resolve(null); return; }

            try {
                const zip = await JSZip.loadAsync(file);
                
                // 1. EXTRACT AND HASH IMAGES (PHASE 1 - No Transaction)
                const imagesToStore: { id: string, blob: Blob }[] = [];
                const promises: Promise<void>[] = [];

                zip.forEach((relativePath, fileEntry) => {
                    if (fileEntry.dir) return;
                    const fileName = relativePath.split('/').pop();
                    if (!fileName) return;

                    // Robust Regex matches "img_UUID" anywhere in filename
                    const uuidRegex = /(img_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
                    const match = fileName.match(uuidRegex);
                    
                    if (match) {
                        const imageId = match[1];
                        promises.push((async () => {
                            const blob = await fileEntry.async('blob');
                            imagesToStore.push({ id: imageId, blob });
                        })());
                    }
                });

                await Promise.all(promises);

                const preparedImages: { id: string, blob: Blob, hash: string }[] = [];
                for (const item of imagesToStore) {
                    const hash = await computeBlobHash(item.blob);
                    preparedImages.push({ ...item, hash });
                }

                // 2. WRITE TO DB (PHASE 2 - Transaction)
                if (preparedImages.length > 0) {
                    const db = await initDB();
                    const tx = db.transaction(['images', 'image_hashes'], 'readwrite');
                    const imageStore = tx.objectStore('images');
                    const hashStore = tx.objectStore('image_hashes');
                    
                    for (const img of preparedImages) {
                        imageStore.put(img.blob, img.id);
                        hashStore.put(img.id, img.hash);
                    }
                    
                    await new Promise<void>((resolveTx, rejectTx) => {
                        tx.oncomplete = () => resolveTx();
                        tx.onerror = () => rejectTx(tx.error);
                    });
                    console.log(`[Import] Restored ${preparedImages.length} images.`);
                }

                // 3. EXTRACT DATA JSON
                let dataFile = zip.file("project.json") || zip.file("data.json");
                if (!dataFile) {
                    const jsonFiles = zip.file(/\.json$/);
                    if (jsonFiles.length > 0) dataFile = jsonFiles[0];
                }
                
                if (!dataFile) throw new Error("Archive missing data JSON");
                
                const jsonText = await dataFile.async("text");
                resolve(JSON.parse(jsonText));

            } catch (zipError) {
                // Legacy JSON text file fallback
                try {
                    const text = await file.text();
                    if (text.trim().startsWith('{')) {
                        resolve(JSON.parse(text));
                    } else {
                        alert("File format not recognized.");
                        resolve(null);
                    }
                } catch (textError) {
                    console.error("Import failed:", zipError);
                    alert("Failed to load file.");
                    resolve(null);
                }
            }
        };
        input.click();
    });
}

// --- PROJECT PERSISTENCE ---

export const saveProjectToDB = async (project: Project) => {
  try {
      const db = await initDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(PROJECT_STORE, 'readwrite');
        const store = tx.objectStore(PROJECT_STORE);
        const request = store.put({ id: 'autosave', data: project });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
  } catch (error) {
      console.error("Failed to save to IndexedDB", error);
  }
};

export const loadProjectFromDB = async (): Promise<Project | null> => {
   try {
       const db = await initDB();
       return new Promise((resolve, reject) => {
         const tx = db.transaction(PROJECT_STORE, 'readonly');
         const store = tx.objectStore(PROJECT_STORE);
         const request = store.get('autosave');
         request.onsuccess = () => resolve(request.result ? request.result.data : null);
         request.onerror = () => resolve(null);
       });
   } catch (error) {
       return null;
   }
};

// --- EXPORT FUNCTIONS ---

// MAIN PROJECT SAVE (Now back to .zip)
export async function saveProject(project: Project, onStatusUpdate?: (status: string) => void) {
    await exportDataWithImages(project, project.metadata.name, 'zip', project, onStatusUpdate);
}

// MODULE SAVES
export async function saveStudio(project: Project) {
    if (!project.studio) return;
    await exportDataWithImages(project.studio, `${project.metadata.name}_Studio`, 'thestudio', project);
}

export async function saveArtDept(project: Project) {
    if (!project.bible) return;
    await exportDataWithImages(project.bible, `${project.metadata.name}_ArtDept`, 'artdept', project);
}

export async function saveBible(project: Project) {
    await exportDataWithImages(project.bible, project.metadata.name, 'bible', project);
}

export async function saveScript(project: Project) {
    await exportDataWithImages(project.script, project.metadata.name, 'script', project);
}

function downloadJSON(data: object, baseFileName: string, extension: string) {
     const fileName = getFileName(baseFileName, extension);
     const jsonString = JSON.stringify(data, null, 2);
     const blob = new Blob([jsonString], { type: 'application/json' });
     saveAs(blob, fileName);
}
export function saveContinuityBrief(project: Project, installment: Season | Sequel) { 
    if (!installment.continuityBrief) return; 
    const isEpisodic = 'episodes' in installment; 
    const partNumber = isEpisodic ? installment.seasonNumber : installment.partNumber; 
    const fileName = `${project.metadata.name.replace(/ /g, '_')}-${isEpisodic ? 'S'+partNumber : 'P'+partNumber}-Brief`; 
    downloadJSON(installment.continuityBrief, fileName, 'json'); 
}


// --- IMPORT FUNCTIONS ---

export const selectAndLoadProjectFile = async () => {
    const project = await importDataWithImages<Project>('zip');
    if (project) await saveProjectToDB(project);
    return project;
};

export const selectAndLoadStudio = async () => importDataWithImages<Studio>('thestudio');
export const selectAndLoadArtDept = async () => importDataWithImages<Bible>('artdept');
export const selectAndLoadBible = async () => importDataWithImages<Bible>('bible');
export const selectAndLoadScript = async () => importDataWithImages<Script>('script');

function uploadJSON<T>(accept: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) { reject(new Error("No file")); return; }
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data: T = JSON.parse(event.target?.result as string);
                    resolve(data);
                } catch (err) { reject(err); }
            };
            reader.readAsText(file);
        };
        input.click();
    });
}
export async function loadContinuityBrief(): Promise<ContinuityBrief> { return await uploadJSON<ContinuityBrief>('.brief,.json,application/json'); }