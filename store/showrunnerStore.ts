
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { debounce } from 'lodash-es';
import { 
  Project, GeminiModel, Bible, Script, Season, Sequel, Episode, Act, 
  Scene, Shot, Character, Location, Prop, ContinuityBrief, 
  CharacterProfile, AssetType, ConsistencyMode, ScreenplayItem, AssetAnalysisResult,
  StateSnapshot, LocationBaseProfile, PropBaseProfile, ShotReferenceImage,
  Studio, SceneHistoryEntry, AIModelConfig
} from '../types';
import { saveProjectToDB, loadProjectFromDB, selectAndLoadProjectFile, selectAndLoadBible, selectAndLoadScript, selectAndLoadStudio, selectAndLoadArtDept } from '../services/storageService';
import { migrateProjectImages } from '../services/migrationService';
import { geminiService } from '../services/geminiService';
import { modelGateway } from '../services/modelGateway';

const debouncedSave = debounce((project: Project) => {
    saveProjectToDB(project);
}, 2000);

const createDefaultCharacterProfile = (name: string): CharacterProfile => ({
    name,
    coreIdentity: { name, primaryNarrativeRole: 'Unknown', fullLegalName: { first: '', middle: '', last: '' }, nicknamesAliases: [], titleHonorific: '', secondarySupportingRoles: [], characterArchetypes: [] },
    persona: { backstory: { keyChildhoodEvents: [], keyAdultEvents: [], familyDynamics: '' }, motivations: { externalGoal: '', internalNeed: '', coreDrive: '' }, fears: { surfaceFear: '', deepFear: '' } },
    vocationalProfile: { currentOccupation: '', pastOccupations: [], hardSkills: [], softSkills: [], expertiseLevel: '', credentialsAwards: [] },
    visualDna: { gender: '', age: { chronological: null, apparent: '' }, ethnicCulturalBackground: { ethnicity: '', nationalityRegion: '' }, eyes: { color: '', shape: '' }, hair: { color: '', texture: '', styleCut: '' }, buildPhysique: { height: '', weightFrame: '', posture: '', distinctiveTraits: [] }, uniqueIdentifiers: { scars: [], tattoos: [], other: { birthmarks: '', piercings: [], prosthetics: '' } } },
    outfitMatrix: { signatureLook: { headwear: '', tops: '', bottoms: '', footwear: '', accessories: [] }, contextSpecificVariants: { combatAction: { description: '', notes: '' }, formalCeremonial: { description: '', notes: '' }, incognitoCasual: { description: '', notes: '' }, weatherSpecific: { description: '', notes: '' } } },
    vocalProfile: { speakingPersona: '', timbre: '', pitchRange: '', speechPatterns: '', pacing: '', accentDialect: '', languageFluency: { native: [], learned: [], codeSwitching: false }, voiceNotes: { timbreDescription: '', pitchNotes: '', emotionCaptured: '', accentMarkers: '', deliveryStyle: '' } },
    catchphrases: { publicTagline: '', privateMantra: '', quotationNotes: { contextsUsed: '', frequency: '', originStory: '' } },
    additionalNotes: { moodBoard: { overallAesthetic: '', colorPalette: '', atmosphere: '' }, characterTimeline: { keyDates: [], arcProgression: '', flashbackTriggers: '' }, relationshipMap: { connectionTypes: '', tensionLevels: '', secrets: '' }, locationSetting: { keyPlaces: [], emotionalAssociations: '', frequencyOfVisits: '' }, researchNotes: { historicalEra: '', culturalDeepDive: '', techSpecs: '' }, miscellaneous: { playlist: '', fanArtInspiration: '', deletedScenes: '' } }
});

const createDefaultLocationBaseProfile = (name: string): LocationBaseProfile => ({
    identity: { name },
    narrative: { description: '', vibe: '' },
    visuals: { architectureStyle: '', keyElements: [], lighting: '', visualPrompt: '' },
    audioProfile: { voiceIdentity: { timbre: '', pitch: '' }, speechPatterns: { pacing: '', idioms: [] }, signatureSounds: [], quirks: [] }
});

const createDefaultPropBaseProfile = (name: string): PropBaseProfile => ({
    identity: { name },
    narrative: { description: '' },
    visuals: { material: '', era: '', markings: [], visualPrompt: '' },
    audioProfile: { voiceIdentity: { timbre: '', pitch: '' }, speechPatterns: { pacing: '', idioms: [] }, signatureSounds: [], quirks: [] }
});

// Helper to add history
const addHistoryEntry = (item: Episode | Act, actionType: SceneHistoryEntry['actionType'], description: string, scenes: Scene[]): SceneHistoryEntry[] => {
    const currentHistory = item.sceneHistory || [];
    const newEntry: SceneHistoryEntry = {
        id: uuidv4(),
        timestamp: Date.now(),
        actionType,
        description,
        snapshot: JSON.parse(JSON.stringify(scenes)) // Deep copy
    };
    // Keep last 30 entries
    return [newEntry, ...currentHistory].slice(0, 30);
};

const getStoredKey = (provider: string) => localStorage.getItem(`apikey_${provider}`) || '';

interface ShowrunnerState {
  project: Project | null;
  isLoaded: boolean;
  generationModel: GeminiModel;
  lastMovedSceneId: string | null; // For UI highlighting
  
  // Model Gateway State
  availableModels: AIModelConfig[];
  customModels: AIModelConfig[];
  apiKeys: Record<string, string>;

  // Lifecycle
  setProject: (project: Project) => void;
  createNewProject: (params: { name: string; logline: string; format: any; style: any; supportingText?: string }) => void;
  updateProject: (updates: Partial<Project>) => void;
  updateProjectName: (name: string) => void;
  closeProject: () => void;
  loadAutosave: () => void;
  importProject: () => void;
  importBible: () => void;
  importScript: () => void;
  importStudio: () => void; 
  importArtDept: () => void;

  setGenerationModel: (model: GeminiModel) => void;
  updateSynopsis: (synopsis: string) => void;
  setGeneratedStructure: (items: (Episode | Act)[]) => void;
  populateCharacterProfile: (id: string, profile: CharacterProfile) => void;
  updateCharacter: (updates: Partial<Character> & { id: string }) => void;
  updateLocation: (updates: Partial<Location> & { id: string }) => void;
  updateProp: (updates: Partial<Prop> & { id: string }) => void;
  updateAssetConsistency: (type: AssetType, id: string, mode: ConsistencyMode) => void;
  addSeason: () => void;
  deleteSeason: (id: string) => void;
  addSequel: () => void;
  deleteSequel: (id: string) => void;
  toggleInstallmentLock: (id: string) => void;
  updateContinuityBrief: (installmentId: string, updates: Partial<ContinuityBrief>) => void;
  addEpisodeToSeason: (seasonId: string, params: { title: string; logline: string }) => void;
  addActToSequel: (sequelId: string, params: { title: string; summary: string }) => void;
  updateEpisode: (id: string, updates: Partial<Episode>) => void;
  updateAct: (id: string, updates: Partial<Act>) => void;
  deleteEpisodeFromSeason: (seasonId: string, episodeId: string) => void;
  deleteActFromSequel: (sequelId: string, actId: string) => void;
  setScenesForItem: (itemId: string, scenes: Scene[]) => void; 
  updateSceneSummary: (itemId: string, sceneId: string, summary: string) => void;
  lockSceneSummaries: (itemId: string) => void;
  toggleSceneContentLock: (itemId: string, sceneId: string) => void;
  setAllScreenplaysForItem: (itemId: string, result: { scenes: { sceneId: string; screenplay: ScreenplayItem[] }[] }) => void;
  approveEpisodeActScreenplay: (itemId: string) => void;
  addScreenplayLine: (itemId: string, sceneId: string, index: number, type: ScreenplayItem['type']) => void;
  updateScreenplayLine: (itemId: string, sceneId: string, index: number, text: string) => void;
  deleteScreenplayLine: (itemId: string, sceneId: string, index: number) => void;
  setAnalyzedAssets: (itemId: string, result: AssetAnalysisResult) => void;
  addShot: (sceneId: string) => void;
  updateShot: (sceneId: string, shotId: string, updates: Partial<Shot>) => void;
  deleteShot: (sceneId: string, shotId: string) => void;
  addScene: (itemId: string) => void;
  deleteScene: (itemId: string, sceneId: string) => void;
  reorderScenes: (itemId: string, newScenes: Scene[]) => void;
  revertSceneHistory: (itemId: string, historyId: string) => void;
  revertToInitial: (itemId: string) => void;
  undoSceneAction: (itemId: string) => void;
  redoSceneAction: (itemId: string) => void;
  clearLastMovedSceneId: () => void;
  generateShotsForScene: (sceneId: string) => Promise<void>;
  
  // Model Gateway Actions
  fetchModels: () => Promise<void>;
  updateApiKey: (provider: string, key: string) => void;
  addCustomModel: (model: AIModelConfig) => void;
  removeCustomModel: (id: string) => void;
}

export const useShowrunnerStore = create<ShowrunnerState>((set, get) => ({
  project: null,
  isLoaded: false,
  generationModel: 'gemini-2.5-flash',
  lastMovedSceneId: null,
  availableModels: [],
  customModels: JSON.parse(localStorage.getItem('custom_models') || '[]'),
  apiKeys: {
      'google_native': localStorage.getItem('gemini_api_key') || '',
      'kie': getStoredKey('kie'),
      'wavespeed': getStoredKey('wavespeed'),
      'openai_compatible': getStoredKey('openai_compatible')
  },

  setProject: (project) => {
    set({ project, isLoaded: true });
    debouncedSave(project);
  },

  createNewProject: ({ name, logline, format, style, supportingText }) => {
    // Treat all new formats as 'sequels' (single story structure) unless explicit EPISODIC
    const isEpisodic = format.type === 'EPISODIC';
    
    const newProject: Project = {
      metadata: {
        id: uuidv4(),
        name,
        author: 'User',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      logline,
      format,
      style,
      supportingText,
      bible: {
        synopsis: '',
        characters: [],
        locations: [],
        props: [],
        lore: {},
      },
      script: {
        seasons: isEpisodic ? [] : undefined,
        sequels: !isEpisodic ? [] : undefined,
      },
      art: {},
      studio: {
        shotsByScene: {},
      },
    };
    get().setProject(newProject);
  },

  updateProject: (updates) => {
    set((state) => {
      if (!state.project) return {};
      const updatedProject = { ...state.project, ...updates, metadata: { ...state.project.metadata, updatedAt: Date.now() } };
      debouncedSave(updatedProject);
      return { project: updatedProject };
    });
  },

  updateProjectName: (name) => {
    set((state) => {
        if (!state.project) return {};
        const updatedProject = { ...state.project, metadata: { ...state.project.metadata, name, updatedAt: Date.now() } };
        debouncedSave(updatedProject);
        return { project: updatedProject };
    });
  },

  closeProject: () => {
    set({ project: null });
  },

  loadAutosave: async () => {
    // 1. Fetch Remote Models
    await get().fetchModels();

    // 2. Load Project
    let project = await loadProjectFromDB();
    if (project) {
        project = await migrateProjectImages(project);
        set({ project, isLoaded: true });
        saveProjectToDB(project);
    } else {
        set({ isLoaded: true });
    }
  },

  importProject: async () => {
      const project = await selectAndLoadProjectFile();
      if (project) {
          const migrated = await migrateProjectImages(project);
          set({ project: migrated, isLoaded: true });
          debouncedSave(migrated);
      }
  },

  importBible: async () => {
      const bible = await selectAndLoadBible();
      if (bible) {
          const { project, updateProject } = get();
          if (project) updateProject({ bible });
      }
  },

  importScript: async () => {
      const script = await selectAndLoadScript();
      if (script) {
          const { project, updateProject } = get();
          if (project) updateProject({ script });
      }
  },

  importStudio: async () => {
      const studio = await selectAndLoadStudio();
      if (studio) {
          const { project, updateProject } = get();
          if (project) updateProject({ studio });
      }
  },

  importArtDept: async () => {
      const bible = await selectAndLoadArtDept();
      if (bible) {
           const { project, updateProject } = get();
           if (project) updateProject({ bible });
      }
  },

  setGenerationModel: (model) => set({ generationModel: model }),

  updateSynopsis: (synopsis) => {
    set((state) => {
        if (!state.project) return {};
        const updatedProject = {
            ...state.project,
            bible: { ...state.project.bible, synopsis }
        };
        debouncedSave(updatedProject);
        return { project: updatedProject };
    });
  },

  setGeneratedStructure: (items) => {
      set((state) => {
          if (!state.project) return {};
          const isEpisodic = state.project.format.type === 'EPISODIC';
          let seasons = state.project.script.seasons;
          let sequels = state.project.script.sequels;

          if (isEpisodic) {
              const season: Season = {
                  id: uuidv4(),
                  seasonNumber: 1,
                  title: "Season 1",
                  logline: state.project.bible.synopsis || "",
                  continuityBrief: undefined,
                  episodes: items as Episode[],
                  isLocked: false
              };
              seasons = [season];
          } else {
              const sequel: Sequel = {
                  id: uuidv4(),
                  partNumber: 1,
                  title: "Part 1",
                  summary: state.project.bible.synopsis || "",
                  continuityBrief: undefined,
                  acts: items as Act[],
                  isLocked: false
              };
              sequels = [sequel];
          }

          const updatedProject = {
              ...state.project,
              script: {
                  seasons: isEpisodic ? seasons : undefined,
                  sequels: !isEpisodic ? sequels : undefined,
              }
          };
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  populateCharacterProfile: (id, profile) => {
      set((state) => {
          if (!state.project) return {};
          const chars = state.project.bible.characters.map(c => 
             c.id === id ? { ...c, profile } : c
          );
          const updatedProject = {
              ...state.project,
              bible: { ...state.project.bible, characters: chars }
          };
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  updateCharacter: (updates) => {
      set((state) => {
          if (!state.project) return {};
          const chars = state.project.bible.characters.map(c => 
             c.id === updates.id ? { ...c, ...updates } : c
          );
          const updatedProject = {
              ...state.project,
              bible: { ...state.project.bible, characters: chars }
          };
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  updateLocation: (updates) => {
    set((state) => {
        if (!state.project) return {};
        const locs = state.project.bible.locations.map(l => 
           l.id === updates.id ? { ...l, ...updates } : l
        );
        const updatedProject = {
            ...state.project,
            bible: { ...state.project.bible, locations: locs }
        };
        debouncedSave(updatedProject);
        return { project: updatedProject };
    });
  },

  updateProp: (updates) => {
    set((state) => {
        if (!state.project) return {};
        const props = state.project.bible.props.map(p => 
           p.id === updates.id ? { ...p, ...updates } : p
        );
        const updatedProject = {
            ...state.project,
            bible: { ...state.project.bible, props }
        };
        debouncedSave(updatedProject);
        return { project: updatedProject };
    });
  },

  updateAssetConsistency: (type, id, mode) => {
    set((state) => {
        if (!state.project) return {};
        const updateList = <T extends { id: string, consistencyMode: ConsistencyMode }>(list: T[]) => 
            list.map(item => item.id === id ? { ...item, consistencyMode: mode } : item);

        const bible = { ...state.project.bible };
        if (type === 'character') bible.characters = updateList(bible.characters);
        if (type === 'location') bible.locations = updateList(bible.locations);
        if (type === 'prop') bible.props = updateList(bible.props);

        const updatedProject = { ...state.project, bible };
        debouncedSave(updatedProject);
        return { project: updatedProject };
    });
  },

  addSeason: () => {
      set(state => {
          if (!state.project || !state.project.script.seasons) return {};
          const nextNum = state.project.script.seasons.length + 1;
          const newSeason: Season = {
              id: uuidv4(),
              seasonNumber: nextNum,
              title: `Season ${nextNum}`,
              logline: '',
              episodes: [],
              isLocked: false
          };
          const updatedProject = {
              ...state.project,
              script: { ...state.project.script, seasons: [...state.project.script.seasons, newSeason] }
          };
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  deleteSeason: (id) => {
      set(state => {
          if (!state.project || !state.project.script.seasons) return {};
          const updatedSeasons = state.project.script.seasons.filter(s => s.id !== id);
          const renumbered = updatedSeasons.map((s, i) => ({ ...s, seasonNumber: i + 1, title: `Season ${i+1}` }));
          const updatedProject = {
              ...state.project,
              script: { ...state.project.script, seasons: renumbered }
          };
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  addSequel: () => {
    set(state => {
        if (!state.project || !state.project.script.sequels) return {};
        const nextNum = state.project.script.sequels.length + 1;
        const newSequel: Sequel = {
            id: uuidv4(),
            partNumber: nextNum,
            title: `Part ${nextNum}`,
            summary: '',
            acts: [],
            isLocked: false
        };
        const updatedProject = {
            ...state.project,
            script: { ...state.project.script, sequels: [...state.project.script.sequels, newSequel] }
        };
        debouncedSave(updatedProject);
        return { project: updatedProject };
    });
  },

  deleteSequel: (id) => {
      set(state => {
          if (!state.project || !state.project.script.sequels) return {};
          const updatedSequels = state.project.script.sequels.filter(s => s.id !== id);
          const renumbered = updatedSequels.map((s, i) => ({ ...s, partNumber: i + 1, title: `Part ${i+1}` }));
          const updatedProject = {
              ...state.project,
              script: { ...state.project.script, sequels: renumbered }
          };
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  toggleInstallmentLock: (id) => {
      set(state => {
          if (!state.project) return {};
          const isEpisodic = state.project.format.type === 'EPISODIC';
          let updatedProject;
          if (isEpisodic) {
               const seasons = state.project.script.seasons?.map(s => s.id === id ? { ...s, isLocked: !s.isLocked } : s);
               updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
          } else {
               const sequels = state.project.script.sequels?.map(s => s.id === id ? { ...s, isLocked: !s.isLocked } : s);
               updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
          }
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  updateContinuityBrief: (installmentId, updates) => {
      set(state => {
        if (!state.project) return {};
        const updateInstallment = (inst: Season | Sequel) => {
            if (inst.id !== installmentId) return inst;
            const existingBrief = inst.continuityBrief || {
                id: uuidv4(),
                projectId: state.project!.metadata.id,
                installmentId: inst.id,
                installmentTitle: inst.title,
                generatedAt: Date.now(),
                summary: '',
                characterResolutions: [],
                worldStateChanges: [],
                lingeringHooks: [],
                isLocked: false
            };
            return { ...inst, continuityBrief: { ...existingBrief, ...updates } };
        };
        const isEpisodic = state.project.format.type === 'EPISODIC';
        let updatedProject;
        if (isEpisodic) {
             const seasons = state.project.script.seasons?.map(updateInstallment as (s: Season) => Season);
             updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
        } else {
             const sequels = state.project.script.sequels?.map(updateInstallment as (s: Sequel) => Sequel);
             updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
        }
        debouncedSave(updatedProject);
        return { project: updatedProject };
      });
  },

  addEpisodeToSeason: (seasonId, { title, logline }) => {
      set(state => {
          if (!state.project || !state.project.script.seasons) return {};
          const seasons = state.project.script.seasons.map(season => {
              if (season.id !== seasonId) return season;
              const nextNum = season.episodes.length + 1;
              const newEpisode: Episode = { id: uuidv4(), episodeNumber: nextNum, title, logline, scenes: [], sceneSummariesLocked: false };
              return { ...season, episodes: [...season.episodes, newEpisode] };
          });
          const updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  addActToSequel: (sequelId, { title, summary }) => {
    set(state => {
        if (!state.project || !state.project.script.sequels) return {};
        const sequels = state.project.script.sequels.map(sequel => {
            if (sequel.id !== sequelId) return sequel;
            const nextNum = sequel.acts.length + 1;
            const newAct: Act = { id: uuidv4(), actNumber: nextNum, title, summary, scenes: [], sceneSummariesLocked: false };
            return { ...sequel, acts: [...sequel.acts, newAct] };
        });
        const updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
        debouncedSave(updatedProject);
        return { project: updatedProject };
    });
  },

  updateEpisode: (id, updates) => {
      set(state => {
          if (!state.project || !state.project.script.seasons) return {};
          const seasons = state.project.script.seasons.map(season => ({ ...season, episodes: season.episodes.map(ep => ep.id === id ? { ...ep, ...updates } : ep) }));
          const updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  updateAct: (id, updates) => {
      set(state => {
          if (!state.project || !state.project.script.sequels) return {};
          const sequels = state.project.script.sequels.map(sequel => ({ ...sequel, acts: sequel.acts.map(act => act.id === id ? { ...act, ...updates } : act) }));
          const updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  deleteEpisodeFromSeason: (seasonId, episodeId) => {
      set(state => {
          if (!state.project || !state.project.script.seasons) return {};
          const seasons = state.project.script.seasons.map(season => {
              if (season.id !== seasonId) return season;
              const filteredEpisodes = season.episodes.filter(ep => ep.id !== episodeId);
              const renumberedEpisodes = filteredEpisodes.map((ep, idx) => ({ ...ep, episodeNumber: idx + 1 }));
              return { ...season, episodes: renumberedEpisodes };
          });
          const updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  deleteActFromSequel: (sequelId, actId) => {
      set(state => {
          if (!state.project || !state.project.script.sequels) return {};
          const sequels = state.project.script.sequels.map(sequel => {
              if (sequel.id !== sequelId) return sequel;
              const filteredActs = sequel.acts.filter(act => act.id !== actId);
              const renumberedActs = filteredActs.map((act, idx) => ({ ...act, actNumber: idx + 1 }));
              return { ...sequel, acts: renumberedActs };
          });
          const updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  setScenesForItem: (itemId, scenes) => {
      set(state => {
          if (!state.project) return {};
          const isEpisodic = state.project.format.type === 'EPISODIC';
          let updatedProject;
          if (isEpisodic) {
              const seasons = state.project.script.seasons!.map(season => ({ ...season, episodes: season.episodes.map(ep => ep.id === itemId ? { ...ep, scenes } : ep) }));
              updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
          } else {
              const sequels = state.project.script.sequels!.map(sequel => ({ ...sequel, acts: sequel.acts.map(act => act.id === itemId ? { ...act, scenes } : act) }));
               updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
          }
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  updateSceneSummary: (itemId, sceneId, summary) => {
      set(state => {
          if (!state.project) return {};
          const updateScenes = (scenes: Scene[]) => scenes.map(s => s.id === sceneId ? { ...s, summary } : s);
          let updatedProject;
          if (state.project.format.type === 'EPISODIC') {
              const seasons = state.project.script.seasons!.map(s => ({ ...s, episodes: s.episodes.map(e => e.id === itemId ? { ...e, scenes: updateScenes(e.scenes) } : e) }));
               updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
          } else {
              const sequels = state.project.script.sequels!.map(s => ({ ...s, acts: s.acts.map(a => a.id === itemId ? { ...a, scenes: updateScenes(a.scenes) } : a) }));
               updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
          }
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  lockSceneSummaries: (itemId) => {
    set(state => {
        if (!state.project) return {};
        let updatedProject;
        if (state.project.format.type === 'EPISODIC') {
             const seasons = state.project.script.seasons!.map(s => ({ ...s, episodes: s.episodes.map(e => e.id === itemId ? { ...e, sceneSummariesLocked: true } : e) }));
             updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
        } else {
             const sequels = state.project.script.sequels!.map(s => ({ ...s, acts: s.acts.map(a => a.id === itemId ? { ...a, sceneSummariesLocked: true } : a) }));
             updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
        }
        debouncedSave(updatedProject);
        return { project: updatedProject };
    });
  },

  toggleSceneContentLock: (itemId, sceneId) => {
      set(state => {
          if (!state.project) return {};
          const updateScenes = (scenes: Scene[]) => scenes.map(s => s.id === sceneId ? { ...s, isContentLocked: !s.isContentLocked } : s);
           let updatedProject;
           if (state.project.format.type === 'EPISODIC') {
              const seasons = state.project.script.seasons!.map(s => ({ ...s, episodes: s.episodes.map(e => e.id === itemId ? { ...e, scenes: updateScenes(e.scenes) } : e) }));
               updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
          } else {
              const sequels = state.project.script.sequels!.map(s => ({ ...s, acts: s.acts.map(a => a.id === itemId ? { ...a, scenes: updateScenes(a.scenes) } : a) }));
               updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
          }
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  setAllScreenplaysForItem: (itemId, result) => {
      set(state => {
          if (!state.project) return {};
          const updateScenes = (scenes: Scene[]) => scenes.map(s => {
              const match = result.scenes.find(r => r.sceneId === s.id);
              if (match) return { ...s, content: match.screenplay };
              return s;
          });
          let updatedProject;
          if (state.project.format.type === 'EPISODIC') {
              const seasons = state.project.script.seasons!.map(s => ({ ...s, episodes: s.episodes.map(e => e.id === itemId ? { ...e, scenes: updateScenes(e.scenes) } : e) }));
               updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
          } else {
              const sequels = state.project.script.sequels!.map(s => ({ ...s, acts: s.acts.map(a => a.id === itemId ? { ...a, scenes: updateScenes(a.scenes) } : a) }));
               updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
          }
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  approveEpisodeActScreenplay: (itemId) => {
      set(state => {
          if (!state.project) return {};
           let updatedProject;
           if (state.project.format.type === 'EPISODIC') {
              const seasons = state.project.script.seasons!.map(s => ({ ...s, episodes: s.episodes.map(e => e.id === itemId ? { ...e, isScreenplayApproved: true } : e) }));
               updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
          } else {
              const sequels = state.project.script.sequels!.map(s => ({ ...s, acts: s.acts.map(a => a.id === itemId ? { ...a, isScreenplayApproved: true } : a) }));
               updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
          }
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  addScreenplayLine: (itemId, sceneId, index, type) => {
      set(state => {
          if (!state.project) return {};
          const updateScenes = (scenes: Scene[]) => scenes.map(s => {
              if (s.id !== sceneId) return s;
              const newContent = [...s.content];
              newContent.splice(index + 1, 0, { type, text: '' });
              return { ...s, content: newContent };
          });
           let updatedProject;
           if (state.project.format.type === 'EPISODIC') {
              const seasons = state.project.script.seasons!.map(s => ({ ...s, episodes: s.episodes.map(e => e.id === itemId ? { ...e, scenes: updateScenes(e.scenes) } : e) }));
               updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
          } else {
              const sequels = state.project.script.sequels!.map(s => ({ ...s, acts: s.acts.map(a => a.id === itemId ? { ...a, scenes: updateScenes(a.scenes) } : a) }));
               updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
          }
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  updateScreenplayLine: (itemId, sceneId, index, text) => {
      set(state => {
           if (!state.project) return {};
           const updateScenes = (scenes: Scene[]) => scenes.map(s => {
              if (s.id !== sceneId) return s;
              const newContent = [...s.content];
              newContent[index] = { ...newContent[index], text };
              return { ...s, content: newContent };
          });
           let updatedProject;
           if (state.project.format.type === 'EPISODIC') {
              const seasons = state.project.script.seasons!.map(s => ({ ...s, episodes: s.episodes.map(e => e.id === itemId ? { ...e, scenes: updateScenes(e.scenes) } : e) }));
               updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
          } else {
              const sequels = state.project.script.sequels!.map(s => ({ ...s, acts: s.acts.map(a => a.id === itemId ? { ...a, scenes: updateScenes(a.scenes) } : a) }));
               updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
          }
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  deleteScreenplayLine: (itemId, sceneId, index) => {
      set(state => {
           if (!state.project) return {};
           const updateScenes = (scenes: Scene[]) => scenes.map(s => {
              if (s.id !== sceneId) return s;
              const newContent = [...s.content];
              newContent.splice(index, 1);
              return { ...s, content: newContent };
          });
          let updatedProject;
          if (state.project.format.type === 'EPISODIC') {
              const seasons = state.project.script.seasons!.map(s => ({ ...s, episodes: s.episodes.map(e => e.id === itemId ? { ...e, scenes: updateScenes(e.scenes) } : e) }));
               updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
          } else {
              const sequels = state.project.script.sequels!.map(s => ({ ...s, acts: s.acts.map(a => a.id === itemId ? { ...a, scenes: updateScenes(a.scenes) } : a) }));
               updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
          }
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  setAnalyzedAssets: (itemId, result) => {
      set(state => {
          if (!state.project) return {};
          const bible = { ...state.project.bible };
          
          result.identifiedCharacters.forEach(newChar => {
              const exists = bible.characters.find(c => c.profile.name === newChar.profile.name);
              if (!exists) {
                   const defaultProfile = createDefaultCharacterProfile(newChar.profile.name);
                   const char: Character = { id: uuidv4(), profile: { ...defaultProfile, ...newChar.profile }, timeline: [], consistencyMode: newChar.consistencyMode || 'GENERATIVE', analysis: newChar.analysis, appearances: 0 };
                   bible.characters.push(char);
              }
          });

          result.identifiedLocations.forEach(newLoc => {
               const exists = bible.locations.find(l => l.baseProfile.identity.name === newLoc.baseProfile.identity.name);
               if (!exists) {
                   const defaultProfile = createDefaultLocationBaseProfile(newLoc.baseProfile.identity.name);
                   const loc: Location = { id: uuidv4(), baseProfile: { ...defaultProfile, ...newLoc.baseProfile }, timeline: [], consistencyMode: newLoc.consistencyMode || 'GENERATIVE', analysis: newLoc.analysis, appearances: 0 };
                   bible.locations.push(loc);
               }
          });

           result.identifiedProps.forEach(newProp => {
               const exists = bible.props.find(p => p.baseProfile.identity.name === newProp.baseProfile.identity.name);
               if (!exists) {
                   const defaultProfile = createDefaultPropBaseProfile(newProp.baseProfile.identity.name);
                   const prop: Prop = { id: uuidv4(), baseProfile: { ...defaultProfile, ...newProp.baseProfile }, timeline: [], consistencyMode: newProp.consistencyMode || 'GENERATIVE', analysis: newProp.analysis, appearances: 0 };
                   bible.props.push(prop);
               }
          });

          result.assetStateChanges.forEach(change => {
               const snapshot: StateSnapshot = { ...change.snapshot, id: uuidv4() };
               if (change.assetType === 'character') {
                   const asset = bible.characters.find(c => c.profile.name === change.assetName);
                   if (asset) asset.timeline.push(snapshot);
               } else if (change.assetType === 'location') {
                   const asset = bible.locations.find(l => l.baseProfile.identity.name === change.assetName);
                   if (asset) asset.timeline.push(snapshot);
               } else {
                   const asset = bible.props.find(p => p.baseProfile.identity.name === change.assetName);
                   if (asset) asset.timeline.push(snapshot);
               }
          });

          const updateScenes = (scenes: Scene[]) => scenes.map(s => {
              const map = result.sceneAssetMapping.find(m => m.sceneId === s.id);
              if (map) return { ...s, assets: map.assets };
              return s;
          });

          let script = state.project.script;
          if (state.project.format.type === 'EPISODIC') {
              const seasons = script.seasons!.map(s => ({ ...s, episodes: s.episodes.map(e => e.id === itemId ? { ...e, scenes: updateScenes(e.scenes) } : e) }));
              script = { ...script, seasons };
          } else {
              const sequels = script.sequels!.map(s => ({ ...s, acts: s.acts.map(a => a.id === itemId ? { ...a, scenes: updateScenes(a.scenes) } : a) }));
              script = { ...script, sequels };
          }

          const updatedProject = { ...state.project, bible, script };
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  addShot: (sceneId) => {
    set(state => {
        if (!state.project) return {};
        const currentShots = state.project.studio.shotsByScene[sceneId] || [];
        const nextNum = currentShots.length + 1;
        // Default locked upon creation, AND now origin: 'user'
        const newShot: Shot = { 
            id: uuidv4(), 
            shotNumber: nextNum, 
            description: "New shot", 
            isLocked: true,
            origin: 'user' // Added
        };
        const updatedShotsByScene = { ...state.project.studio.shotsByScene, [sceneId]: [...currentShots, newShot] };
        const updatedProject = { ...state.project, studio: { ...state.project.studio, shotsByScene: updatedShotsByScene } };
        debouncedSave(updatedProject);
        return { project: updatedProject };
    });
  },

  updateShot: (sceneId, shotId, updates) => {
      set(state => {
          if (!state.project) return {};
          const sceneShots = state.project.studio.shotsByScene[sceneId] || [];
          const updatedShots = sceneShots.map(shot => {
              if (shot.id === shotId) return { ...shot, ...updates };
              return shot;
          });
          const updatedProject = {
              ...state.project,
              studio: { ...state.project.studio, shotsByScene: { ...state.project.studio.shotsByScene, [sceneId]: updatedShots } },
              metadata: { ...state.project.metadata, updatedAt: Date.now() }
          };
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  deleteShot: (sceneId, shotId) => {
      set(state => {
          if (!state.project) return {};
          const currentShots = state.project.studio.shotsByScene[sceneId] || [];
          const updatedShots = currentShots.filter(s => s.id !== shotId);
          // Renumber shots
          const renumberedShots = updatedShots.map((s, idx) => ({ ...s, shotNumber: idx + 1 }));
          
          const updatedShotsByScene = { ...state.project.studio.shotsByScene, [sceneId]: renumberedShots };
          const updatedProject = { ...state.project, studio: { ...state.project.studio, shotsByScene: updatedShotsByScene } };
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  addScene: (itemId) => {
    set(state => {
        if (!state.project) return {};
        
        const createScene = (currentScenes: Scene[]): Scene => ({
            id: uuidv4(),
            sceneNumber: currentScenes.length + 1,
            setting: 'INT. UNKNOWN - DAY',
            summary: '',
            content: [],
            assets: { characters: [], locations: [], props: [] },
            isContentLocked: false
        });

        const updateScenesInItem = (item: Episode | Act) => {
            if (item.id !== itemId) return item;
            const newHistory = addHistoryEntry(item, 'add', `Added Scene ${item.scenes.length + 1}`, item.scenes);
            // Clear redo stack on new action
            const cleanRedoStack = undefined;
            return { 
                ...item, 
                scenes: [...item.scenes, createScene(item.scenes)],
                sceneHistory: newHistory,
                sceneRedoStack: cleanRedoStack
            };
        };

        let updatedProject;
        if (state.project.format.type === 'EPISODIC') {
            const seasons = state.project.script.seasons!.map(s => ({
                ...s,
                episodes: s.episodes.map(updateScenesInItem as (e: Episode) => Episode)
            }));
            updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
        } else {
            const sequels = state.project.script.sequels!.map(s => ({
                ...s,
                acts: s.acts.map(updateScenesInItem as (a: Act) => Act)
            }));
            updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
        }
        debouncedSave(updatedProject);
        return { project: updatedProject };
    });
  },

  deleteScene: (itemId, sceneId) => {
    set(state => {
        if (!state.project) return {};

        const updateScenesInItem = (item: Episode | Act) => {
            if (item.id !== itemId) return item;
            
            const sceneToDelete = item.scenes.find(s => s.id === sceneId);
            const newHistory = addHistoryEntry(item, 'delete', `Deleted Scene ${sceneToDelete?.sceneNumber || 'Unknown'}`, item.scenes);

            const filtered = item.scenes.filter(s => s.id !== sceneId);
            const renumbered = filtered.map((s, i) => ({ ...s, sceneNumber: i + 1 }));
            
            // Clear redo stack on new action
            const cleanRedoStack = undefined;

            return { ...item, scenes: renumbered, sceneHistory: newHistory, sceneRedoStack: cleanRedoStack };
        };

        let updatedProject;
        if (state.project.format.type === 'EPISODIC') {
            const seasons = state.project.script.seasons!.map(s => ({
                ...s,
                episodes: s.episodes.map(updateScenesInItem as (e: Episode) => Episode)
            }));
            updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
        } else {
            const sequels = state.project.script.sequels!.map(s => ({
                ...s,
                acts: s.acts.map(updateScenesInItem as (a: Act) => Act)
            }));
            updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
        }
        debouncedSave(updatedProject);
        return { project: updatedProject };
    });
  },

  reorderScenes: (itemId, newScenes) => {
      set(state => {
          if (!state.project) return {};
          
          const updateScenesInItem = (item: Episode | Act) => {
                if (item.id !== itemId) return item;

                let description = 'Reordered Scenes';
                
                // Detailed move description
                // Find first scene where the ID at the new index is different from the old ID
                let movedScene: Scene | undefined;
                let oldIndex = -1;
                let newIndex = -1;

                // Simple heuristic: find the scene in newScenes that has a different index in item.scenes
                for (let i = 0; i < newScenes.length; i++) {
                    const scene = newScenes[i];
                    const originalIndex = item.scenes.findIndex(s => s.id === scene.id);
                    if (originalIndex !== i) {
                        movedScene = scene;
                        newIndex = i;
                        oldIndex = originalIndex;
                        break;
                    }
                }

                if (movedScene && oldIndex !== -1) {
                    description = `Reordered: Scene ${oldIndex + 1} -> Position ${newIndex + 1}`;
                }

                const newHistory = addHistoryEntry(item, 'reorder', description, item.scenes);

                // Renumber scenes based on new order
                const renumbered = newScenes.map((s, i) => {
                    return { ...s, sceneNumber: i + 1 };
                });
                
                // Clear redo stack on new action
                const cleanRedoStack = undefined;

                return { ...item, scenes: renumbered, sceneHistory: newHistory, sceneRedoStack: cleanRedoStack };
          };

          const isEpisodic = state.project.format.type === 'EPISODIC';
          let updatedProject;
          
          if (isEpisodic) {
              const seasons = state.project.script.seasons!.map(s => ({
                  ...s,
                  episodes: s.episodes.map(updateScenesInItem as (e: Episode) => Episode)
              }));
              updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
          } else {
              const sequels = state.project.script.sequels!.map(s => ({
                  ...s,
                  acts: s.acts.map(updateScenesInItem as (a: Act) => Act)
              }));
              updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
          }

          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  revertSceneHistory: (itemId, historyId) => {
      set(state => {
          if (!state.project) return {};
          
          const updateScenesInItem = (item: Episode | Act) => {
                if (item.id !== itemId) return item;
                
                const historyEntry = item.sceneHistory?.find(h => h.id === historyId);
                if (!historyEntry) return item;

                // When reverting, we create a new entry on top, clearing future redos
                // This is the "Manual Revert" behavior requested
                const newHistory = addHistoryEntry(item, 'reorder', `Reverted to: ${historyEntry.description}`, item.scenes);
                const cleanRedoStack = undefined;
                
                return { ...item, scenes: historyEntry.snapshot, sceneHistory: newHistory, sceneRedoStack: cleanRedoStack };
          };

          const isEpisodic = state.project.format.type === 'EPISODIC';
          let updatedProject;
          if (isEpisodic) {
              const seasons = state.project.script.seasons!.map(s => ({
                  ...s,
                  episodes: s.episodes.map(updateScenesInItem as (e: Episode) => Episode)
              }));
              updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
          } else {
              const sequels = state.project.script.sequels!.map(s => ({
                  ...s,
                  acts: s.acts.map(updateScenesInItem as (a: Act) => Act)
              }));
              updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
          }
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  revertToInitial: (itemId) => {
    set(state => {
        if (!state.project) return {};
        
        const updateScenesInItem = (item: Episode | Act) => {
              if (item.id !== itemId) return item;
              if (!item.sceneHistory || item.sceneHistory.length === 0) return item;

              const oldestEntry = item.sceneHistory[item.sceneHistory.length - 1];
              
              const newHistory = addHistoryEntry(item, 'reorder', `Reverted All Changes`, item.scenes);
              const cleanRedoStack = undefined;
              
              return { ...item, scenes: oldestEntry.snapshot, sceneHistory: newHistory, sceneRedoStack: cleanRedoStack };
        };

        const isEpisodic = state.project.format.type === 'EPISODIC';
        let updatedProject;
        if (isEpisodic) {
            const seasons = state.project.script.seasons!.map(s => ({
                ...s,
                episodes: s.episodes.map(updateScenesInItem as (e: Episode) => Episode)
            }));
            updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
        } else {
            const sequels = state.project.script.sequels!.map(s => ({
                ...s,
                acts: s.acts.map(updateScenesInItem as (a: Act) => Act)
            }));
            updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
        }
        debouncedSave(updatedProject);
        return { project: updatedProject };
    });
  },

  undoSceneAction: (itemId) => {
      set(state => {
        if (!state.project) return {};

        const updateScenesInItem = (item: Episode | Act) => {
            if (item.id !== itemId) return item;
            if (!item.sceneHistory || item.sceneHistory.length === 0) return item;

            // Get most recent history
            const [lastEntry, ...remainingHistory] = item.sceneHistory;
            
            // Create a Redo Entry for the CURRENT state before overwriting it
            const redoEntry: SceneHistoryEntry = {
                id: uuidv4(),
                timestamp: Date.now(),
                actionType: lastEntry.actionType, // Inherit type for context
                description: `Redo: Revert of ${lastEntry.description}`, 
                snapshot: item.scenes // Snapshot of CURRENT state (the future state)
            };

            const newRedoStack = [redoEntry, ...(item.sceneRedoStack || [])];

            return {
                ...item,
                scenes: lastEntry.snapshot,
                sceneHistory: remainingHistory, // Pop from history
                sceneRedoStack: newRedoStack // Push to redo
            };
        };

        const isEpisodic = state.project.format.type === 'EPISODIC';
        let updatedProject;
        if (isEpisodic) {
            const seasons = state.project.script.seasons!.map(s => ({
                ...s,
                episodes: s.episodes.map(updateScenesInItem as (e: Episode) => Episode)
            }));
            updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
        } else {
            const sequels = state.project.script.sequels!.map(s => ({
                ...s,
                acts: s.acts.map(updateScenesInItem as (a: Act) => Act)
            }));
            updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
        }
        debouncedSave(updatedProject);
        return { project: updatedProject };
      });
  },

  redoSceneAction: (itemId) => {
      set(state => {
        if (!state.project) return {};

        const updateScenesInItem = (item: Episode | Act) => {
            if (item.id !== itemId) return item;
            if (!item.sceneRedoStack || item.sceneRedoStack.length === 0) return item;

            // Get most recent redo
            const [nextEntry, ...remainingRedo] = item.sceneRedoStack;

            // Add the CURRENT state back to history (Undoable again)
            // We construct a history entry representing the state we are leaving
            // Note: Simplification - we just push current state as a 'undo' snapshot
            const undoEntry: SceneHistoryEntry = {
                id: uuidv4(),
                timestamp: Date.now(),
                actionType: 'reorder',
                description: "Undo of Redo",
                snapshot: item.scenes
            };

            const newHistory = [undoEntry, ...(item.sceneHistory || [])];

            return {
                ...item,
                scenes: nextEntry.snapshot,
                sceneHistory: newHistory,
                sceneRedoStack: remainingRedo
            };
        };

        const isEpisodic = state.project.format.type === 'EPISODIC';
        let updatedProject;
        if (isEpisodic) {
            const seasons = state.project.script.seasons!.map(s => ({
                ...s,
                episodes: s.episodes.map(updateScenesInItem as (e: Episode) => Episode)
            }));
            updatedProject = { ...state.project, script: { ...state.project.script, seasons } };
        } else {
            const sequels = state.project.script.sequels!.map(s => ({
                ...s,
                acts: s.acts.map(updateScenesInItem as (a: Act) => Act)
            }));
            updatedProject = { ...state.project, script: { ...state.project.script, sequels } };
        }
        debouncedSave(updatedProject);
        return { project: updatedProject };
      });
  },
  
  clearLastMovedSceneId: () => set({ lastMovedSceneId: null }),

  generateShotsForScene: async (sceneId) => {
      const state = get();
      if (!state.project) return;
      
      let targetScene: Scene | undefined;
      const isEpisodic = state.project.format.type === 'EPISODIC';
      if (isEpisodic) {
           for(const season of state.project.script.seasons || []) {
               for(const ep of season.episodes) {
                   const found = ep.scenes.find(s => s.id === sceneId);
                   if (found) { targetScene = found; break; }
               }
               if(targetScene) break;
           }
      } else {
          for(const sequel of state.project.script.sequels || []) {
               for(const act of sequel.acts) {
                   const found = act.scenes.find(s => s.id === sceneId);
                   if (found) { targetScene = found; break; }
               }
               if(targetScene) break;
           }
      }

      if (!targetScene) throw new Error("Scene not found.");

      const shotList = await geminiService.generateShotListForScene(targetScene, state.project, state.generationModel);
      
      const newShots: Shot[] = shotList.map((s, index) => {
          const refs: ShotReferenceImage[] = [];
          
          s.keyAssets.forEach(assetName => {
              const char = state.project!.bible.characters.find(c => c.profile.name.toLowerCase() === assetName.toLowerCase());
              if (char && char.profile.generatedImageUrl) {
                  refs.push({ id: uuidv4(), sourceType: 'character', url: char.profile.generatedImageUrl, isActive: true, name: char.profile.name });
                  return;
              }
              const loc = state.project!.bible.locations.find(l => l.baseProfile.identity.name.toLowerCase() === assetName.toLowerCase());
              if (loc && loc.baseProfile.visuals.generatedImageUrl) {
                   refs.push({ id: uuidv4(), sourceType: 'location', url: loc.baseProfile.visuals.generatedImageUrl, isActive: true, name: loc.baseProfile.identity.name });
                   return;
              }
              const prop = state.project!.bible.props.find(p => p.baseProfile.identity.name.toLowerCase() === assetName.toLowerCase());
              if (prop && prop.baseProfile.visuals.generatedImageUrl) {
                   refs.push({ id: uuidv4(), sourceType: 'prop', url: prop.baseProfile.visuals.generatedImageUrl, isActive: true, name: prop.baseProfile.identity.name });
                   return;
              }
          });

          return {
              id: uuidv4(),
              shotNumber: index + 1,
              description: s.description,
              visualPromptText: s.description,
              referenceImages: refs,
              isLocked: true, 
              origin: 'ai' // Added
          };
      });

      set(state => {
          if (!state.project) return {};
          const updatedShotsByScene = { ...state.project.studio.shotsByScene, [sceneId]: newShots };
           const updatedProject = { ...state.project, studio: { ...state.project.studio, shotsByScene: updatedShotsByScene } };
          debouncedSave(updatedProject);
          return { project: updatedProject };
      });
  },

  fetchModels: async () => {
      // 1. Fetch Remote
      const remoteModels = await modelGateway.fetchRemoteDefinitions();
      
      // 2. Get Local Custom Models
      const { customModels } = get();

      // 3. Merge: Custom overrides Remote if ID matches
      const mergedModels = [...remoteModels];
      
      for (const custom of customModels) {
          const index = mergedModels.findIndex(m => m.id === custom.id);
          if (index !== -1) {
              mergedModels[index] = custom;
          } else {
              mergedModels.push(custom);
          }
      }

      set({ availableModels: mergedModels });
  },

  updateApiKey: (provider, key) => {
      // 1. Update Local Storage
      if (provider === 'google_native') {
          localStorage.setItem('gemini_api_key', key);
      } else {
          localStorage.setItem(`apikey_${provider}`, key);
      }

      // 2. Update Store
      set(state => ({
          apiKeys: {
              ...state.apiKeys,
              [provider]: key
          }
      }));
  },

  addCustomModel: (model) => {
      set(state => {
          const newCustomModels = [...state.customModels.filter(m => m.id !== model.id), model];
          localStorage.setItem('custom_models', JSON.stringify(newCustomModels));
          
          // Re-merge with available
          const mergedModels = [...state.availableModels.filter(m => m.id !== model.id), model];
          
          return {
              customModels: newCustomModels,
              availableModels: mergedModels
          };
      });
  },

  removeCustomModel: (id) => {
      set(state => {
          const newCustomModels = state.customModels.filter(m => m.id !== id);
          localStorage.setItem('custom_models', JSON.stringify(newCustomModels));
          
          // Re-fetch to restore remote defaults if they were overridden
          // We can just trigger fetchModels, but calling it async here is tricky in reducer.
          // Simplest is to remove from availableModels IF it was a custom one.
          // Ideally, we should re-run the merge logic.
          
          // Trigger a re-fetch logic manually:
          // We can't easily access remoteModels here without fetching again. 
          // For now, remove it from availableModels, and rely on the next load/refresh to bring back remote defaults if needed.
          const newAvailable = state.availableModels.filter(m => m.id !== id);
          
          return {
              customModels: newCustomModels,
              availableModels: newAvailable
          };
      });
      // Trigger full fetch to be safe and restore overridden defaults
      get().fetchModels();
  }

}));
