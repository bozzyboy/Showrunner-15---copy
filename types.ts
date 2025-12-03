
import { v4 as uuidv4 } from 'uuid';

export type Page = 'Dashboard' | 'Story Bible' | 'Scriptwriter' | 'Art Dept' | 'The Studio' | 'Sound Stage' | 'Merch & Print' | 'Marketing' | 'Settings';

export type GeminiModel = 'gemini-3-pro-preview' | 'gemini-2.5-flash';

export type ProjectFormatType = 'EPISODIC' | 'SINGLE_STORY' | 'NARRATED_VIDEO' | 'MUSIC_VIDEO' | 'PRODUCT_VIDEO' | 'STAGE_PLAY';

// --- MODEL GATEWAY TYPES ---
// Relaxed to allow dynamic providers like 'suno', 'elevenlabs', 'comfyui'
export type ProviderType = string;

export interface APIEndpointDefinition {
  url: string;
  method: 'POST' | 'GET';
  headers?: Record<string, string>;
  paramMapping?: Record<string, any>;
  outputMapping?: Record<string, string>;
}

export interface AIModelConfig {
  id: string;
  name: string;
  provider: ProviderType;
  family: 'text' | 'image' | 'video' | 'audio';
  contextWindow: number;
  costPerGen?: number;
  endpoints?: {
    generate: APIEndpointDefinition;
    status?: APIEndpointDefinition;
  };
  isDefault?: boolean;
}
// ---------------------------

export type ConsistencyMode = 'STRICT' | 'FLEXIBLE' | 'GENERATIVE';

export interface ConsistencyAnalysis {
  narrativeWeight: number;   
  recurrenceScore: number;   
  reasoning: string;         
}

export interface ContinuityBrief {
    id: string;
    projectId: string;
    installmentId: string;
    installmentTitle: string;
    generatedAt: number;
    summary: string;
    characterResolutions: string[];
    worldStateChanges: string[];
    lingeringHooks: string[];
    isLocked: boolean;
}

export interface ScreenplayItem {
    type: 'action' | 'character' | 'dialogue' | 'parenthetical';
    text: string;
}

export interface SceneAssets {
    characters: string[]; 
    locations: string[];  
    props: string[];      
}

export interface Scene {
    id:string;
    sceneNumber: number;
    setting: string;
    summary: string;
    content: ScreenplayItem[];
    assets?: SceneAssets;
    isContentLocked?: boolean;
}

export interface SceneHistoryEntry {
    id: string;
    timestamp: number;
    actionType: 'add' | 'delete' | 'reorder' | 'content_edit';
    description: string;
    snapshot: Scene[]; // A snapshot of the scenes array at this point
}

export interface Episode {
    id: string;
    episodeNumber: number;
    title: string;
    logline: string;
    scenes: Scene[];
    sceneSummariesLocked: boolean;
    isScreenplayApproved?: boolean;
    sceneHistory?: SceneHistoryEntry[]; // Past states (Undo)
    sceneRedoStack?: SceneHistoryEntry[]; // Future states (Redo)
}

export interface Act {
    id: string;
    actNumber: number;
    title: string;
    summary: string;
    scenes: Scene[];
    sceneSummariesLocked: boolean;
    isScreenplayApproved?: boolean;
    sceneHistory?: SceneHistoryEntry[]; // Past states (Undo)
    sceneRedoStack?: SceneHistoryEntry[]; // Future states (Redo)
}

export interface Season {
    id: string;
    seasonNumber: number;
    title: string; 
    logline: string;
    continuityBrief?: ContinuityBrief;
    episodes: Episode[];
    isLocked: boolean;
}

export interface Sequel {
    id: string;
    partNumber: number;
    title: string; 
    summary: string;
    continuityBrief?: ContinuityBrief;
    acts: Act[];
    isLocked: boolean;
}

export interface ProjectFormat {
  type: ProjectFormatType;
  seasonCount?: number; 
  episodeCount: number; 
  duration: string;
  aspectRatio: string;
}

export interface ProjectStyle {
    primary: string;
    secondary: string;
    custom: string;
    audience: string;
    genre: string;
    secondaryGenre: string;
    language: string;
}

export interface CoreIdentity {
  name: string;
  fullLegalName: { first: string; middle: string; last: string; };
  nicknamesAliases: { name: string; usedBy: string; context: string; }[];
  titleHonorific: string;
  primaryNarrativeRole: string;
  secondarySupportingRoles: string[];
  characterArchetypes: string[];
}

export interface Persona {
  backstory: {
    keyChildhoodEvents: string[];
    keyAdultEvents: string[];
    familyDynamics: string;
  };
  motivations: {
    externalGoal: string;
    internalNeed: string;
    coreDrive: string;
  };
  fears: {
    surfaceFear: string;
    deepFear: string;
  };
}

export interface VocationalProfile {
  currentOccupation: string;
  pastOccupations: string[];
  hardSkills: string[];
  softSkills: string[];
  expertiseLevel: string;
  credentialsAwards: string[];
}

export interface VisualDNA {
  gender: string; 
  age: { chronological: number | null; apparent: string; };
  ethnicCulturalBackground: { ethnicity: string; nationalityRegion: string; };
  eyes: { color: string; shape: string; };
  hair: { color: string; texture: string; styleCut: string; };
  buildPhysique: { height: string; weightFrame: string; posture: string; distinctiveTraits: string[]; };
  uniqueIdentifiers: {
    scars: { location: string; origin: string; visibility: string; }[];
    tattoos: { design: string; placement: string; meaning: string; }[];
    other: { birthmarks: string; piercings: string[]; prosthetics: string; };
  };
}

export interface OutfitMatrix {
  signatureLook: {
    headwear: string;
    tops: string;
    bottoms: string;
    footwear: string;
    accessories: string[];
  };
  contextSpecificVariants: {
    combatAction: { description: string; notes: string; };
    formalCeremonial: { description: string; notes: string; };
    incognitoCasual: { description: string; notes: string; };
    weatherSpecific: { description: string; notes: string; };
  };
}

export interface VocalProfile {
  speakingPersona: string;
  timbre: string;
  pitchRange: string;
  speechPatterns: string;
  pacing: string; 
  accentDialect: string;
  languageFluency: { native: string[]; learned: string[]; codeSwitching: boolean; };
  voiceNotes: {
    timbreDescription: string;
    pitchNotes: string;
    emotionCaptured: string;
    accentMarkers: string;
    deliveryStyle: string;
  };
}

export interface Catchphrases {
  publicTagline: string;
  privateMantra: string;
  quotationNotes: { contextsUsed: string; frequency: string; originStory: string; };
}

export interface AdditionalNotes {
    moodBoard: { overallAesthetic: string; colorPalette: string; atmosphere: string; };
    characterTimeline: { keyDates: string[]; arcProgression: string; flashbackTriggers: string; };
    relationshipMap: { connectionTypes: string; tensionLevels: string; secrets: string; };
    locationSetting: { keyPlaces: string[]; emotionalAssociations: string; frequencyOfVisits: string; };
    researchNotes: { historicalEra: string; culturalDeepDive: string; techSpecs: string; };
    miscellaneous: { playlist: string; fanArtInspiration: string; deletedScenes: string; };
}

export interface CharacterImage {
    id: string;
    url: string;
    timestamp: number;
}

export interface CharacterProfile {
  name: string;
  coreIdentity: CoreIdentity;
  persona: Persona;
  vocationalProfile: VocationalProfile;
  visualDna: VisualDNA;
  outfitMatrix: OutfitMatrix;
  vocalProfile: VocalProfile;
  catchphrases: Catchphrases;
  additionalNotes: AdditionalNotes;
  generatedImageUrl?: string;
  visualPrompt?: string;
  imageHistory?: CharacterImage[];
  referenceImages?: string[];
}

export interface StateSnapshot {
    id: string;
    sceneId: string; 
    trigger: string; 
    changes: Partial<CharacterProfile | LocationBaseProfile | PropBaseProfile>; 
}

export type StateSnapshotPayload = Omit<StateSnapshot, 'id'>;

export interface AudioProfile {
    voiceIdentity: { timbre: string; pitch: string; };
    speechPatterns: { pacing: string; idioms: string[]; };
    signatureSounds: string[];
    quirks: string[];
}

export interface LocationVisuals {
    architectureStyle: string;
    keyElements: string[];
    lighting: string;
    visualPrompt: string;
    referenceImageUrl?: string;
    isReferenceLocked?: boolean;
    generatedImageUrl?: string;
    imageHistory?: CharacterImage[];
    referenceImages?: string[];
}

export interface PropVisuals {
    material: string;
    era: string;
    markings: string[];
    visualPrompt: string;
    referenceImageUrl?: string;
    isReferenceLocked?: boolean;
    generatedImageUrl?: string;
    imageHistory?: CharacterImage[];
    referenceImages?: string[];
}

export interface LocationBaseProfile {
    identity: { name: string; };
    narrative: { description: string; vibe: string; };
    visuals: LocationVisuals;
    audioProfile: AudioProfile;
}

export interface PropBaseProfile {
    identity: { name: string; };
    narrative: { description: string; };
    visuals: PropVisuals;
    audioProfile: AudioProfile;
}

export interface Character {
    id: string;
    profile: CharacterProfile; 
    timeline: StateSnapshot[];
    consistencyMode: ConsistencyMode;
    analysis: ConsistencyAnalysis;
    appearances: number;
}

export interface Location {
    id: string;
    baseProfile: LocationBaseProfile;
    timeline: StateSnapshot[];
    consistencyMode: ConsistencyMode;
    analysis: ConsistencyAnalysis;
    appearances: number;
}

export interface Prop {
    id: string;
    baseProfile: PropBaseProfile;
    timeline: StateSnapshot[];
    consistencyMode: ConsistencyMode;
    analysis: ConsistencyAnalysis;
    appearances: number;
}

export type Asset = Character | Location | Prop;
export type AssetType = 'character' | 'location' | 'prop';

export interface Bible {
    synopsis: string;
    characters: Character[];
    locations: Location[];
    props: Prop[];
    lore: Record<string, string>;
}

export interface Script {
    seasons?: Season[];
    sequels?: Sequel[];
}

export interface VideoPromptJSON {
  metadata: {
    title: string;
    short_title: string;
    description: string;
    template_version: string;
    created_by: string;
    created_at_utc: string;
    intended_use: string;
    notes: string[];
  };
  task: {
    type: string;
    high_level_intent: string;
    primary_subject: string;
    target_audience: string;
  };
  model_config: {
    provider: string;
    model_family: string;
    model_name: string;
    generation_mode: string;
    random_seed: number | null;
    num_candidate_videos: number;
    temperature: number;
    guidance_scale: number;
    safety_tier: string;
  };
  input_assets: {
    primary_image: {
      id: string;
      role: string;
      source_type: string;
      url: string;
      base64: string;
      local_path: string;
      description: string;
      frame_alignment: {
        align_to_full_frame: boolean;
        target_aspect_ratio: string;
        crop_strategy: string;
        padding_color: string;
      };
    };
    additional_reference_images: any[];
    optional_masks: any[];
    conditioning_strength: {
      description: string;
      value: number;
    };
  };
  video_spec: {
    total_duration_seconds: number | null;
    fps: number;
    resolution: {
      width: number;
      height: number;
    };
    aspect_ratio: string;
    output_format: string;
    looping_preference: string;
    audio_needed: boolean;
  };
  global_style: {
    visual_style: string;
    rendering_style: string;
    level_of_realism: string;
    time_of_day: string;
    location_environment: string;
    mood_and_tone: string;
    color_palette: string;
    lighting_style: string;
    camera_feel: string;
    motion_feel: string;
  };
  global_text_prompt: {
    scene_description: string;
    primary_subject_description: string;
    environment_description: string;
    camera_and_movement_overview: string;
    story_or_action_overview: string;
    keywords: string[];
  };
  animation_plan: {
    overall_motion_goal: string;
    image_preservation_guidance: {
      description: string;
      must_remain_consistent: string;
      allowed_to_change: string;
    };
    camera_motion_script: {
        time_seconds: number;
        keyframe_label: string;
        camera_description: string;
        camera_position: string;
        camera_movement: string;
        focal_length_or_fov: string;
        framing: string;
        focus_behavior: string;
      }[];
    subject_motion_plan: string;
    environment_change_plan: string;
    effects_and_particles: string;
    transition_behavior: string;
  };
  segments: {
      segment_id: string;
      start_time_seconds: number;
      duration_seconds: number | null;
      segment_purpose: string;
      segment_description: string;
      camera: {
        shot_type: string;
        camera_position: string;
        camera_orientation: string;
        camera_movement: string;
        focal_length_or_fov: string;
        focus_behavior: string;
        stabilization_style: string;
      };
      composition: {
        framing: string;
        foreground_elements: string;
        midground_elements: string;
        background_elements: string;
        parallax_intent: string;
      };
      lighting: {
        key_light_source: string;
        key_light_direction: string;
        light_quality: string;
        fill_light: string;
        practical_lights: string;
        reflections_and_highlights: string;
      };
      subject_behavior: {
        main_subject_actions: string;
        secondary_subjects: string;
        expression_and_emotion: string;
      };
      environment_behavior: {
        background_motion: string;
        weather_and_atmosphere: string;
        props_and_set_dressing: string;
      };
      motion_design: {
        perceived_speed: string;
        camera_easing: string;
        motion_blur_level: string;
      };
      transition_out: {
        type: string;
        description: string;
      };
    }[];
  global_negative_prompt?: string;
  safety_and_content_restrictions?: any;
}


export interface ShotReferenceImage {
  id: string; 
  sourceType: 'character' | 'location' | 'prop' | 'user_upload';
  url: string; 
  isActive: boolean; 
  name?: string; 
}

export interface Shot {
    id: string;
    shotNumber: number;
    description: string;
    isLocked?: boolean; 
    origin?: 'user' | 'ai'; 
    
    // Classic fields
    cameraAngle?: string;
    cameraMovement?: string;
    
    // Director Mode Fields
    visualPromptText?: string; 
    videoPromptJSON?: VideoPromptJSON; 
    videoPlan?: string; 
    
    referenceImages?: ShotReferenceImage[]; 
    
    generatedImageUrl?: string; 
    imageHistory?: CharacterImage[]; 
    
    generatedVideoUrl?: string; 
}

export interface Art {
    [assetId: string]: string;
}

export interface Studio {
    shotsByScene: Record<string, Shot[]>;
}

export interface ProjectMetadata {
    id: string;
    name: string;
    author: string;
    createdAt: number;
    updatedAt: number;
}

export interface Project {
    metadata: ProjectMetadata;
    logline: string;
    format: ProjectFormat;
    style: ProjectStyle;
    bible: Bible;
    script: Script;
    art: Art;
    studio: Studio;
    supportingText?: string;
}

export interface SceneAssetMapItem {
    sceneId: string;
    assets: SceneAssets;
}

export interface NewCharacterPayload {
    profile: Partial<CharacterProfile> & { name: string };
    consistencyMode: ConsistencyMode;
    analysis: ConsistencyAnalysis;
}

export interface NewLocationPayload {
    baseProfile: LocationBaseProfile;
    consistencyMode: ConsistencyMode;
    analysis: ConsistencyAnalysis;
}

export interface NewPropPayload {
    baseProfile: PropBaseProfile;
    consistencyMode: ConsistencyMode;
    analysis: ConsistencyAnalysis;
}

export interface AssetAnalysisResult {
    identifiedCharacters: NewCharacterPayload[];
    identifiedLocations: NewLocationPayload[];
    identifiedProps: NewPropPayload[];
    sceneAssetMapping: SceneAssetMapItem[];
    assetStateChanges: {
        assetType: 'character' | 'location' | 'prop';
        assetName: string; 
        snapshot: StateSnapshotPayload;
    }[];
}

export interface ScreenplayAnalysisResult {
    scenes: {
        sceneId: string;
        screenplay: ScreenplayItem[];
    }[];
}

export const StyleOptions = [
  "Photorealistic", "Cinematic", "Anime", "Manga", "Cartoon", "Comic Book",
  "3D (Pixar/Disney-style)", "Claymation", "Steampunk", "Cyberpunk", "Vaporwave",
  "Studio Ghibli", "Film Noir", "Found Footage", "Black & White", "Pixel Art",
  "Low Poly", "Watercolor", "Oil Painting", "Origami", "Charcoal Sketch",
  "Art Deco", "Gothic", "Minimalist", "Surrealist", "Retro (80s/90s)", "Vintage Film",
];
export const AspectRatioOptions = [
    "16:9 (Landscape)",
    "9:16 (Portrait)",
    "1:1 (Square)",
    "4:3 (Classic TV)",
    "3:4 (Portrait TV)"
];
export const AudienceOptions = [
    "Kids & Family",
    "Teens (13-17)",
    "Young Adults (18-24)",
    "Adults (25-44)",
    "General Audience"
];
export const GenreOptions = [
  "Action & Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama",
  "Family", "Fantasy", "Historical", "Horror", "Kids", "Musical", "Mystery",
  "Noir", "Romance", "Science Fiction", "Superhero", "Thriller", "War",
  "Western", "Slice of Life", "Psychological", "Experimental"
];
export const LanguageOptions = [
    "English",
    "Turkish"
];
