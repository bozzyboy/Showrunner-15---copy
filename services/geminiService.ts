import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Project, Episode, Act, Character, Location, GeminiModel, ScreenplayItem, Shot, Scene, SceneAssets, Season, Sequel, ContinuityBrief, ShotReferenceImage, VideoPromptJSON, Asset, LocationVisuals, PropVisuals, CharacterProfile, AssetAnalysisResult } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getImageFromDB } from './storageService';

const FORBIDDEN_NAMES = `Elara, Lyra, Aria, Astra, Seren, Selene, Elowen, Maeve, Mira, Mirae, Liora, Riven, Cassian, Kael, Kaelen, Kaelar, Thorne, Rowan, Ronan, Briar, Bryn, Brynn, Nyra, Nyla, Nera, Kora, Cora, Aeris, Eris, Elsin, Eveline, Evaline, Celes, Calder, Sorrel, Thea, Talia, Lilith, Lunara, Ravena, Ravenna, Soren, Drystan, Aldric, Aldrin, Leoric, Gareth, Galen, Cedric, Alistair, Sable, Seraphine, Seraphina, Ophelia, Isolde, Nerissa, Kaida, Darian, Darien, Elandra, Tamsin, Thalia, Ysolde, Vance, Zephyr, Zara, Nova, Orion, Axton, Kade, Kaiden, Zarek, Talos, Xylo, Xyla, Nexa, Zyra, Vira, Astraeus, Astraea, Talon, Draven, Aleron, Virel, Zeren, Nox, Lumen, Luna, Cyra, Cyris, Rexis, Rivan, Talonis, Zivra, Zorion, Cyrex, Vayla, Zorin, Xander, Dax, Daxon, Zeth, Varyn, Taren, Calyx, Lyron, Nyx, Nyxa, Solara, Solin, Pip, Milo, Finn, Willa, Willow, Juniper, Lottie, Benny, Tilly, Clover, Sunny, Sprout, Merry, Nibbles, Buttons, Bubbles, Penny, Rosie, Lulu, Ellie, Bambi, Fawn, Flora, Peaches, Dotty, Daisy, Mimi, Nina, Toto, Pippo, Zuzu, Moomoo, Puff, Mittens, Snowy, Maple, Hazel, Chip, Barnaby, Edmund, Edgar, Thaddeus, Percival, Archibald, Cornelius, Gideon, Lucinda, Evangeline, Agatha, Beatrice, Josephine, Eloise, Cordelia, Isadora, Rosalind, Adelaide, Henrietta, Clarence, Mortimer, Hawthorne, Ambrose, Wilfred, Reginald, Horace, Theodore, Geraldine, Prudence, Constance, Felix, Jasper, Elias, Cecil, Primrose, Winifred, Nigel, Rupert, Clementine, Dexter, Silas, Magnus, Harlan, Luther, Vivienne, Marlowe, Damien, Vincent, Roman, Clive, Donovan, Dorian, Tristan, Hollis, Reeves, Garrison, Fletcher, Grayson, Carmichael, Arthur, Clara, Eleanor, Charlotte, William, Henry, Olivia, Sophia, Amelia, Julia, Samuel, Adrian, Gabriel, Victor, Sebastian, Charles, Elizabeth, Isabelle, Isabel, Alice, Theo, George, Caroline, Anna, Kate, Eva, James, Lucas, Benjamin, Michael, Daniel, Chloe, Liam, Noah, Ava, Emma, Mason, Harper, Ethan, Grace, Nathan, Lily, Jackson, Ella, Zoe, Hannah, Leah, Ryan, Logan, Maya, Nora, Ruby, Leo, Ivy, Pipkin, Pogo, Squeaks, Whiskers, Binky, Fluffy, Snickers, Paws, Niblet, Puddles, Munchkin, Chirpy, Tuppy, Buzzy, Chippy, Fuzzy, Squiggles, Doodle, Arachne, Nyx, Helios, Iris, Echo, Aether, Gaia, Eros, Erevan, Erebus, Hecate, Zephyrus, Perseus, Calliope, Evadne, Nerine, Calypso, Eos, Aldrin, Roderick, Roderic, Eldrin, Eldrien, Elion, Elrin, Caladon, Rolan, Torin, Alaric, Caden, Gavin, Roderan, Eryn, Torwyn, Maelis, Ariwyn, Thandor, Balin, Balinor, Thamir, Eldwyn, Seraphiel, Meliora, Vaelis, Thrain, Varyn, Keldor, Rowena, Gwenna, Ylva, Eydis, Bryndis, Freya, Elena, Marcus, Kenji, Tanaka`;

const WORLDBUILDING_RESTRICTIONS = `
🚫 ABSOLUTE NAMING RESTRICTION PROMPT (Worldbuilding Only)
This prompt governs ALL NAMES generated in this worldbuilding task. Characters are excluded from this specific block, but location/prop/tech names must adhere.

🔴 SECTION 1 — COMPLETELY FORBIDDEN NAMES (EXAMPLES)
The following names are 100% banned and must NEVER appear in any form, variation, or derivative:
Neo-Veridia, Project Chimera, Aether Core, OmniCorp. Any attempt to output these names, or names stylistically similar to them, is prohibited.

🔴 SECTION 2 — ABSOLUTELY BANNED NAMING PATTERNS
The model must NOT use ANY of these patterns under ANY circumstances:
❌ SCI-FI TEMPLATE NAMES: Neo + [anything], Project + [myth creature/Latin root], [Ethereal energy] + Core/Nexus/Engine/Matrix, Omni/Hyper/Meta + Corp/Systems/Tech/Industries
❌ LAZY PREFIX + SUFFIX GENERATION: NO names based on recycled fragments such as Neo, Nova, Omni, Hyper, Meta, Aether, Astro, Cyber, Verid-, Lux-, Helio-, Xeno-, Chrono-, Quantum-, Ether-, Bio-, Gen-, Syn-, Auto-. And NO suffixes like -Corp, -Tek, -Tech, -Systems, -Dynamics, -Solutions, -Protocol, -Initiative, -Project, -Complex.
❌ NO PSEUDO-SCI-FI ENERGY/OBJECT NAMES: "Starforge Core", "Quantum Nexus", "Helio Engine Protocol", "Celestium Reactor". Even if not listed here, anything with that vibe is banned.

🔴 SECTION 3 — NO REAL-WORLD NAMES ALLOWED
The AI must never use: Real company names, Real organization names, Real project names, Real research labs, Real military operations, Real geographical locations, Real historical initiatives. Everything must be 100% fictional and original.

🟢 SECTION 4 — WHAT YOU MUST DO INSTEAD
All names MUST: Be original, human-like worldbuilding names; Feel organic, non-formulaic, and not constructed from common AI morpheme-templates; Avoid all banned structures and vibes; Fit the world naturally (tone, setting, genre); Not resemble existing IPs, corporations, or mythological hybrid terms.
Names may draw inspiration from natural geography, linguistic blending, cultural evolution, invented etymology, subtle phonetic aesthetics, handcrafted writer-level creativity.

🔴 SECTION 5 — ZERO-TOLERANCE RULE
If the model produces ANY name that resembles the forbidden examples, the forbidden structures, the forbidden vibe, or real-world entities, it must discard the name and generate a completely new one.
`;

class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const key = this.getApiKey();
    this.ai = new GoogleGenAI({ apiKey: key });
  }

  private getApiKey(): string {
    return localStorage.getItem('gemini_api_key') || process.env.API_KEY || '';
  }

  // --- IMAGE UTILS ---
  public async resizeImage(dataUrl: string, maxWidth = 1024, quality = 0.8): Promise<string> {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = dataUrl;
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Keep aspect ratio
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(dataUrl);
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                // Convert to JPEG to save space (PNG base64 is huge)
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => {
                console.warn("Image resize failed, using original.");
                resolve(dataUrl);
            };
        });
  }

  private async resolveImageForAI(urlOrId: string): Promise<string> {
      if (urlOrId.startsWith('img_')) {
          try {
              const blob = await getImageFromDB(urlOrId);
              if (blob) {
                  return new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve(reader.result as string);
                      reader.readAsDataURL(blob);
                  });
              }
          } catch (e) {
              console.error("Failed to resolve image from DB for AI:", e);
          }
      }
      return urlOrId;
  }

  // --- MASTER PROMPT HELPER ---
  private getProjectContext(project: Project): string {
    return `
    PROJECT CONTEXT (MASTER PROMPT):
    Title: ${project.metadata.name}
    Format: ${project.format.type} (${project.format.duration} mins)
    Genre: ${project.style.genre} (Secondary: ${project.style.secondaryGenre})
    Audience: ${project.style.audience}
    Visual Style: ${project.style.primary} mixed with ${project.style.secondary}
    Custom Style Notes: ${project.style.custom}
    Logline: ${project.logline}
    Language: ${project.style.language}
    
    This context is the absolute truth for style, tone, and visual direction. All generated content must align with this.

    *** STRICT NAMING & CONSISTENCY RULES ***
    1. **ONE CHARACTER, ONE NAME**: If a character is named "Anya", NEVER refer to her as "Kamala", "Elena", or just "The Old Woman". Use "Anya" consistently.
    2. **MANDATORY NAMING**: All characters, including animals/creatures (e.g., "Baby Monkey"), MUST have a proper name given immediately (e.g., "Kiko", "Babu"). NEVER use generic labels like "BABY MONKEY" or "THE VILLAIN" as character names in scripts.
    3. **ROSTER CHECK**: Before introducing a character, check if they already exist in the story. Do not create "Vikram" if "Ranjit" is already the established villain.
    4. **FORBIDDEN NAMES**: Do NOT use any of these names: ${FORBIDDEN_NAMES}.
    5. **NO GENERIC ALIASES**: Do not use "Stranger", "Man", "Woman" if the character is known.

    ${WORLDBUILDING_RESTRICTIONS}
    `;
  }

  // Safe JSON extraction to prevent Regex RangeErrors on massive strings
  private extractJSON(text: string): string {
      const jsonStartMarker = '```json';
      const jsonEndMarker = '```';
      
      const startIndex = text.indexOf(jsonStartMarker);
      if (startIndex !== -1) {
          const start = startIndex + jsonStartMarker.length;
          const end = text.lastIndexOf(jsonEndMarker);
          if (end > start) {
              return text.substring(start, end).trim();
          }
      }

      const firstOpen = text.indexOf('{');
      const lastClose = text.lastIndexOf('}');
      if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
          return text.substring(firstOpen, lastClose + 1);
      }
      
      return text;
  }

  private async executeGeneration<T>(prompt: string, schema: any | undefined, modelName: string, maxTokens?: number): Promise<T> {
      try {
          // Re-instantiate to ensure fresh config if needed (e.g. user changed key)
          const apiKey = this.getApiKey();
          if (!apiKey) throw new Error("No API Key found. Please configure it in Settings.");
          
          this.ai = new GoogleGenAI({ apiKey });
          
          const config: any = {
              responseMimeType: "application/json",
              temperature: 0.7,
          };
          
          if (schema) {
              config.responseSchema = schema;
          }
          
          if (maxTokens) {
              config.maxOutputTokens = maxTokens;
          }

          const response = await this.ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: config,
          });
          
          if (!response.text) throw new Error("Empty response from AI");
          
          let text = response.text;
          
          if (text.length > 2000000) {
              console.warn("Response too large, truncating for safety.");
              text = text.substring(0, 2000000);
          }

          const jsonString = this.extractJSON(text);
          
          try {
            return JSON.parse(jsonString) as T;
          } catch (parseError) {
             console.error("JSON Parse Error. Raw Text Snippet:", text.substring(0, 500));
             throw new Error("Failed to parse AI response as JSON.");
          }

      } catch (error: any) {
          console.error("Gemini Generation Error:", error);
           if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
            throw new Error("API Rate Limit Exceeded.");
        }
        throw error;
      }
  }

    // --- AUDIO GENERATION (Google Cloud TTS) ---
    async generateSpeech(text: string, character: Character): Promise<string> {
        // 1. Determine Voice Params based on Character Profile
        const gender = character.profile.visualDna?.gender?.toLowerCase() || 'neutral';
        const accent = character.profile.vocalProfile?.accentDialect?.toLowerCase() || 'american';

        let languageCode = 'en-US';
        let ssmlGender = 'NEUTRAL';
        let voiceName = ''; // Optional specific voice override

        // Simple mapping logic
        if (accent.includes('british') || accent.includes('uk') || accent.includes('english')) {
            languageCode = 'en-GB';
        } else if (accent.includes('australian')) {
            languageCode = 'en-AU';
        } else if (accent.includes('indian')) {
            languageCode = 'en-IN';
        } else if (accent.includes('french')) {
            languageCode = 'fr-FR'; // If text is compatible, though strictly text should match language
        }

        if (gender.includes('female') || gender.includes('woman') || gender.includes('girl')) {
            ssmlGender = 'FEMALE';
        } else if (gender.includes('male') || gender.includes('man') || gender.includes('boy')) {
            ssmlGender = 'MALE';
        }

        const apiKey = this.getApiKey();
        if (!apiKey) throw new Error("No API Key found. Please configure it in Settings.");

        // 2. Call Google Cloud Text-to-Speech API
        const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

        const payload = {
            input: { text: text },
            voice: { languageCode, ssmlGender },
            audioConfig: { audioEncoding: "MP3" }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json();
                console.error("TTS API Error:", errData);
                throw new Error(errData.error?.message || "Google TTS Request Failed");
            }

            const data = await response.json();
            if (data.audioContent) {
                return `data:audio/mp3;base64,${data.audioContent}`;
            }
            throw new Error("No audio content received.");

        } catch (e) {
            console.warn("Cloud TTS failed, falling back to browser synthesis mock for preview.", e);
            throw e;
        }
    }

    // --- TEXT GENERATION ---

    async generateSynopsis(project: Project, model: GeminiModel): Promise<string> {
      const prompt = `
          ${this.getProjectContext(project)}
          
          Expand the logline into a detailed one-page synopsis.
          Ensure the tone matches the Genre and Style defined in the Project Context.
          
          CRITICAL: 
          1. The output synopsis MUST be written in ${project.style.language}.
          2. ASSIGN PROPER NAMES to all key characters now. Do not refer to them as "The Baby Monkey" or "The Old Woman" - give them names (e.g., "Kiko", "Anya").
          
          Return JSON with a single field 'synopsis'.
      `;
      const schema = {
          type: Type.OBJECT,
          properties: { synopsis: { type: Type.STRING } },
          required: ['synopsis']
      };
      const result = await this.executeGeneration<{ synopsis: string }>(prompt, schema, model);
      return result.synopsis;
  }

  async generateInitialStructure(project: Project, model: GeminiModel): Promise<(Episode | Act)[]> {
      const isEpisodic = project.format.type === 'EPISODIC';
      const count = Number(project.format.episodeCount) || (isEpisodic ? 8 : 3);
      const totalDuration = parseInt(project.format.duration) || 90;
      const targetDurationPerItem = Math.floor(totalDuration / count);
      
      const prompt = `
          ${this.getProjectContext(project)}
          
          TASK: Create a narrative structure for the first ${isEpisodic ? 'Season' : 'Part'} of this project.
          Synopsis: ${project.bible.synopsis || "No detailed synopsis provided, use the logline."}
          
          Format: ${isEpisodic ? "Episodic Series" : "Single Story (Feature)"}
          Target Item Count: ${count}
          Target Duration per Item: ${targetDurationPerItem} minutes.
          
          INSTRUCTIONS:
          1. Break the story into ${count} distinct ${isEpisodic ? 'Episodes' : 'Acts'}.
          2. Ensure the pacing fits the ${targetDurationPerItem} minute target per item.
          3. For each item, provide a 'title' and a 'summary' (or logline).
          4. **CLEAN TITLES**: Do NOT include prefixes like "Act 1", "Episode IV", "Chapter 3". PROVIDE ONLY THE TITLE NAME (e.g., "The Dark Tower", NOT "Chapter 1: The Dark Tower").
          5. **CONSISTENT NAMING**: Use the exact names established in the synopsis. If the synopsis called the old woman "Anya", use "Anya".
          6. CRITICAL: Write all titles and summaries in ${project.style.language}.
          
          OUTPUT:
          Return a JSON object with a key 'items' containing an array of objects. 
          Each object must have 'title' (string) and 'summary' (string).
      `;
      
      const schema = {
          type: Type.OBJECT,
          properties: {
              items: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          title: { type: Type.STRING },
                          summary: { type: Type.STRING }
                      },
                      required: ['title', 'summary']
                  }
              }
          },
          required: ['items']
      };

      try {
        const result = await this.executeGeneration<{ items: any[] }>(prompt, schema, model);
        
        if (!result.items || !Array.isArray(result.items)) {
            throw new Error("AI returned invalid structure format.");
        }

        return result.items.map((item, index) => {
            const cleanTitle = item.title
                .replace(/^(Act|Episode|Part|Chapter|Season)\s+[\dIVX]+[:\.\-\s]*/i, '')
                .replace(/^[:\.\-\s]+/, '')
                .trim();

            return {
                id: uuidv4(),
                [isEpisodic ? 'episodeNumber' : 'actNumber']: index + 1,
                title: cleanTitle || item.title,
                [isEpisodic ? 'logline' : 'summary']: item.summary, 
                scenes: [],
                sceneSummariesLocked: false
            };
        }) as (Episode | Act)[];

      } catch (e) {
        console.error("Structure generation failed:", e);
        throw new Error("Failed to generate structure. Please check the API key or try a different model.");
      }
  }

  async generateContinuityBrief(installment: Season | Sequel, project: Project, model: GeminiModel): Promise<Omit<ContinuityBrief, 'id' | 'isLocked' | 'projectId' | 'installmentId' | 'installmentTitle' | 'generatedAt'>> {
      let contentContext = "";
      const isEpisodic = 'episodes' in installment;

      if (isEpisodic) {
          const season = installment as Season;
          contentContext = season.episodes.map(ep => {
              const sceneText = ep.scenes.map(s => `[SCENE ${s.sceneNumber}] ${s.summary}`).join('\n');
              return `EPISODE ${ep.episodeNumber}: ${ep.title}\n${sceneText}`;
          }).join('\n\n');
      } else {
          const sequel = installment as Sequel;
          contentContext = sequel.acts.map(act => {
              const sceneText = act.scenes.map(s => `[SCENE ${s.sceneNumber}] ${s.summary}`).join('\n');
              return `ACT ${act.actNumber}: ${act.title}\n${sceneText}`;
          }).join('\n\n');
      }

      if (!contentContext.trim()) {
          contentContext = "No detailed scene content provided. Rely on title and summaries.";
      }
      
      if (contentContext.length > 100000) contentContext = contentContext.substring(0, 100000) + "...[TRUNCATED]";

      const prompt = `
          ${this.getProjectContext(project)}
          
          Analyze the following narrative content for ${installment.title}:
          
          ${contentContext}
          
          TASK:
          Create a continuity brief for the NEXT installment (Season/Sequel) based on these events.
          CRITICAL: Write the brief content in ${project.style.language}.

          Include: 
          1. A summary of what happened in this installment.
          2. Character resolutions (who changed, who died, who achieved their goals).
          3. World state changes (political shifts, destruction, discoveries).
          4. Lingering plot hooks to be resolved in the future.
      `;

      const schema = {
          type: Type.OBJECT,
          properties: {
              summary: { type: Type.STRING },
              characterResolutions: { type: Type.ARRAY, items: { type: Type.STRING } },
              worldStateChanges: { type: Type.ARRAY, items: { type: Type.STRING } },
              lingeringHooks: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['summary', 'characterResolutions', 'worldStateChanges', 'lingeringHooks']
      };
      
      return this.executeGeneration(prompt, schema, model);
  }

  async generateNextItemSynopsis(project: Project, currentInstallment: Season | Sequel, model: GeminiModel, previousBrief?: ContinuityBrief | null): Promise<{ title: string; logline?: string; summary?: string }> {
      const isEpisodic = project.format.type === 'EPISODIC';
      const prompt = `
          ${this.getProjectContext(project)}
          
          Generate the ${isEpisodic ? 'next episode' : 'next act'} for ${currentInstallment.title}.
          ${previousBrief ? `Context from previous continuity brief: ${previousBrief.summary}` : ''}
          
          INSTRUCTIONS:
          - Provide a title and a ${isEpisodic ? 'logline' : 'summary'}.
          - **CLEAN TITLES**: Do NOT include prefixes like "Act X" or "Episode Y". Just the name.
          - CRITICAL: Write the title and summary in ${project.style.language}.
          
          Return JSON.
      `;
      const schema = {
          type: Type.OBJECT,
          properties: {
              title: { type: Type.STRING },
              [isEpisodic ? 'logline' : 'summary']: { type: Type.STRING }
          },
          required: ['title', isEpisodic ? 'logline' : 'summary']
      };
      const result = await this.executeGeneration<{ title: string; logline?: string; summary?: string }>(prompt, schema, model);
      
      return {
          ...result,
          title: result.title
                .replace(/^(Act|Episode|Part|Chapter|Season)\s+[\dIVX]+[:\.\-\s]*/i, '')
                .replace(/^[:\.\-\s]+/, '')
                .trim()
      };
  }

  async generateSceneSummariesForItem(item: Episode | Act, project: Project, model: GeminiModel): Promise<Scene[]> {
      const isEpisodic = 'episodeNumber' in item;
      const duration = parseInt(project.format.duration) || 90;
      const count = project.format.episodeCount || (isEpisodic ? 8 : 3);
      const targetDuration = Math.floor(duration / count);

      const prompt = `
          ${this.getProjectContext(project)}
          
          Break down this ${isEpisodic ? 'episode' : 'act'} into scenes.
          Title: ${item.title}
          Summary: ${isEpisodic ? (item as Episode).logline : (item as Act).summary}
          Target Runtime: ${targetDuration} minutes.
          
          INSTRUCTIONS:
          - Create a sequence of scenes that fit the target runtime.
          - For each scene, provide a 'setting' (slugline style) and a 'summary'.
          - **MANDATORY NAMING**: If the summary involves characters, use their PROPER NAMES (e.g., "Anya", "Kiko"). Do NOT use generic descriptions like "The Old Woman" or "The Baby Monkey" in the summary.
          - CRITICAL: Write all scene settings and summaries in ${project.style.language}.
          
          Return a JSON object with a key 'scenes' containing an array of scene objects. 
      `;
      const schema = {
          type: Type.OBJECT,
          properties: {
              scenes: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          setting: { type: Type.STRING },
                          summary: { type: Type.STRING }
                      },
                      required: ['setting', 'summary']
                  }
              }
          },
          required: ['scenes']
      };
      
      const result = await this.executeGeneration<{ scenes: { setting: string; summary: string }[] }>(prompt, schema, model);
      return result.scenes.map((s, i) => ({
          id: uuidv4(),
          sceneNumber: i + 1,
          setting: s.setting,
          summary: s.summary,
          content: [],
          assets: { characters: [], locations: [], props: [] },
          isContentLocked: false
      }));
  }

  async generateScreenplayForScene(
      scene: Scene, 
      project: Project, 
      model: GeminiModel, 
      previousContext: string
  ): Promise<ScreenplayItem[]> {
      const knownCharacters = project.bible.characters.map(c => c.profile.name).join(", ");
      const knownLocs = project.bible.locations.map(l => l.baseProfile.identity.name).join(", ");

      const prompt = `
          ${this.getProjectContext(project)}
          
          TASK: Write the screenplay for ONE scene.
          
          CONTEXT SO FAR:
          ${previousContext}
          
          CURRENT SCENE TO WRITE:
          ID: ${scene.id}
          SETTING: ${scene.setting}
          SUMMARY: ${scene.summary}
          
          **CRITICAL: CHARACTER CONSISTENCY & NAMING**
          1. **ROSTER OF KNOWN CHARACTERS**: [${knownCharacters}]
             - **STRICT PROHIBITION**: Do NOT create new names if a character already fits a role in the roster.
             - **ALIAS RESOLUTION**: If the summary describes "The Old Woman" and "Anya" is in the roster, USE "ANYA". If the summary describes "The Villain" and "Ranjit" is in the roster, USE "RANJIT".
             - **CREATURE NAMING**: If a creature (monkey, dog, robot) is a character, use their name (e.g. "KIKO"). If they are unnamed in the Bible, **ASSIGN A NAME NOW** (e.g. "KIKO") and use it consistently. NEVER use "BABY MONKEY" as a character cue.
          
          2. **NEW CHARACTERS**:
             - Only create a new name if the character is genuinely new and not in the roster.
             - Apply the Forbidden Names rules defined in the Project Context.
          
          3. **FORMAT**:
             - Standard screenplay format (Action, Character, Dialogue, Parenthetical).
             - Language: ${project.style.language}.
             - Keep shots roughly 5-15 seconds in duration in mind when writing action blocks.
          
          Return JSON object with 'screenplay' array containing the script items.
      `;

      const screenplayItemSchema = {
          type: Type.OBJECT,
          properties: {
              type: { type: Type.STRING, enum: ['action', 'character', 'dialogue', 'parenthetical'] },
              text: { type: Type.STRING }
          },
          required: ['type', 'text']
      };

      const schema = {
          type: Type.OBJECT,
          properties: {
              screenplay: { type: Type.ARRAY, items: screenplayItemSchema }
          },
          required: ['screenplay']
      };

      const result = await this.executeGeneration<{ screenplay: ScreenplayItem[] }>(prompt, schema, model);
      return result.screenplay;
  }

  // Deprecated/Legacy method used for reference - functionality moved to sequential generation
  async generateScreenplayForEpisodeOrAct(item: Episode | Act, project: Project, model: GeminiModel, sceneIds: string[]): Promise<{ scenes: { sceneId: string; screenplay: ScreenplayItem[] }[] }> {
      // This function is kept for backward compatibility if needed, but the UI now uses sequential generation.
      // Logic mirrors generateScreenplayForScene but for batch.
      // We will reuse single scene generation logic iteratively in the UI.
      return { scenes: [] }; 
  }

  async analyzeAssetsForEpisodeOrAct(item: Episode | Act, project: Project, model: GeminiModel, sceneIds: string[]): Promise<AssetAnalysisResult> {
      const scenes = item.scenes.filter(s => sceneIds.includes(s.id));
      const existingCharacterDB = project.bible.characters.map(c => c.profile.name).join(", ");
      const existingLocationDB = project.bible.locations.map(l => l.baseProfile.identity.name).join(", ");
      const existingPropsDB = project.bible.props.map(p => p.baseProfile.identity.name).join(", ");
      
      const scenesContent = scenes.map(s => {
          const script = s.content.map(Line => `[${Line.type.toUpperCase()}] ${Line.text}`).join('\n');
          return `
--- SCENE START ---
ID: "${s.id}"
SUMMARY: ${s.summary}
SCRIPT:
${script}
--- SCENE END ---
`;
      }).join('\n\n');

       const prompt = `
          ${this.getProjectContext(project)}

          Analyze the following screenplay content for asset extraction.
          
          DATA TO ANALYZE:
          ${scenesContent}

          **CRITICAL TASK: AGGRESSIVE ENTITY RESOLUTION & DEDUPLICATION**
          
          1. **EXISTING DATABASES**:
             - Characters: [${existingCharacterDB}]
             - Locations: [${existingLocationDB}]
             - Props: [${existingPropsDB}]
          
          2. **CHARACTER FUZZY MATCHING (CRITICAL)**:
             - If the script says "Maya Song", "Maya Singh", or "Maya Stone", and the database contains ONE of these (e.g., "Maya Singh"), YOU MUST OUTPUT "Maya Singh". 
             - Treat spelling variations as typos of the EXISTING database entry.
          
          3. **POSSESSIVE NORMALIZATION (CRITICAL)**:
             - **Locations**: "Kenji's Cubicle" and "Kenji Tanaka's Cubicle" MUST be consolidated. Use the existing database name if available.
             - **Props**: "Kenji's Monitor" and "Monitor" are the SAME object. Consolidate them to the simplest form "Monitor" UNLESS the possessive is vital for distinction (e.g., "The King's Crown").
             - Strip redundant possessives if the base item exists in the DB (e.g., if "Service Pistol" exists, "Sarah's Service Pistol" -> "Service Pistol").

          4. **CATEGORY EXCLUSIVITY (CRITICAL)**:
             - An entity can be a LOCATION or a PROP, **NEVER BOTH**.
             - If "Kenji's Cubicle" is identified as a LOCATION, do NOT list "Cubicle" or "Kenji's Cubicle" as a PROP for the same scene.
             - Locations are places where action happens (Sets). Props are objects actors touch.
             - "The Herd" or "The Crowd" -> If they are background ambiance, they are PROPS/SET DRESSING, not Characters.

          5. **NAMING RULES FOR NEW ASSETS**:
             - Characters must have **Firstname Surname** if human, or **Name** (e.g. "Kiko") if creature/robot.
             - **Groups**: "The Team", "The Mob" are usually irrelevant for the asset ledger unless they are a specific distinct prop/entity.

          6. **SCENE MAPPING**:
             - 'sceneId' MUST be the **exact UUID string** provided in the 'ID' field above.

          7. **LANGUAGE**: Provide any 'reasoning' or 'description' fields in ${project.style.language}.

          Return structured JSON.
      `;
      
      const schema = {
          type: Type.OBJECT,
          properties: {
              identifiedCharacters: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { profile: { type: Type.OBJECT, properties: { name: { type: Type.STRING } }, required: ['name'] }, consistencyMode: { type: Type.STRING }, analysis: { type: Type.OBJECT, properties: { narrativeWeight: {type:Type.NUMBER}, recurrenceScore: {type:Type.NUMBER}, reasoning: {type:Type.STRING} } } }, required: ['profile'] } },
              identifiedLocations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { baseProfile: { type: Type.OBJECT, properties: { identity: { type: Type.OBJECT, properties: { name: { type: Type.STRING } } } } }, consistencyMode: { type: Type.STRING }, analysis: { type: Type.OBJECT, properties: { narrativeWeight: {type:Type.NUMBER}, recurrenceScore: {type:Type.NUMBER}, reasoning: {type:Type.STRING} } } }, required: ['baseProfile'] } },
              identifiedProps: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { baseProfile: { type: Type.OBJECT, properties: { identity: { type: Type.OBJECT, properties: { name: { type: Type.STRING } } } } }, consistencyMode: { type: Type.STRING }, analysis: { type: Type.OBJECT, properties: { narrativeWeight: {type:Type.NUMBER}, recurrenceScore: {type:Type.NUMBER}, reasoning: {type:Type.STRING} } } }, required: ['baseProfile'] } },
              sceneAssetMapping: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { sceneId: { type: Type.STRING }, assets: { type: Type.OBJECT, properties: { characters: { type: Type.ARRAY, items: {type: Type.STRING} }, locations: { type: Type.ARRAY, items: {type: Type.STRING} }, props: { type: Type.ARRAY, items: {type: Type.STRING} } } } } } },
              assetStateChanges: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { assetType: { type: Type.STRING }, assetName: { type: Type.STRING }, snapshot: { type: Type.OBJECT, properties: { sceneId: { type: Type.STRING }, trigger: { type: Type.STRING }, changes: { type: Type.STRING } } } } } }
          },
          required: ['identifiedCharacters', 'identifiedLocations', 'identifiedProps', 'sceneAssetMapping', 'assetStateChanges']
      };

      const result = await this.executeGeneration<any>(prompt, schema, model, 8192);

      // SAFE GUARDS for undefined arrays
      const changes = result.assetStateChanges || [];
      
      const processedChanges = changes.map((change: any) => {
          let parsedChanges = {};
          try {
              if (change.snapshot && typeof change.snapshot.changes === 'string') {
                  // Attempt 1: Parse as JSON
                  if (change.snapshot.changes.trim().startsWith('{')) {
                      parsedChanges = JSON.parse(change.snapshot.changes);
                  } else {
                      // Attempt 2: Treat as Narrative Description
                      parsedChanges = { description: change.snapshot.changes };
                  }
              } else if (change.snapshot) {
                  parsedChanges = change.snapshot.changes;
              }
          } catch (e) {
              console.warn("Failed to parse changes JSON, treating as description string.", e);
              parsedChanges = { description: change.snapshot?.changes || "Unknown change" };
          }
          return {
              ...change,
              snapshot: {
                  ...change.snapshot,
                  changes: parsedChanges
              }
          };
      });

      return {
          identifiedCharacters: result.identifiedCharacters || [],
          identifiedLocations: result.identifiedLocations || [],
          identifiedProps: result.identifiedProps || [],
          sceneAssetMapping: result.sceneAssetMapping || [],
          assetStateChanges: processedChanges
      };
  }

  async generateCharacterProfile(character: Character, project: Project, model: GeminiModel): Promise<CharacterProfile> {
      const prompt = `
          ${this.getProjectContext(project)}
          
          Generate a full profile for character: ${character.profile.name}
          Ensure they fit the world tone and style.
          
          CRITICAL: Write the profile content in ${project.style.language}.
          
          CRITICAL: If the character name provided ("${character.profile.name}") is a single name, GENERATE A SURNAME for them in the 'coreIdentity' section and the top-level 'name' field.
          
          Populate ALL fields including visual DNA (including gender), outfit, vocal profile (including pacing), and coreIdentity.
      `;
      const schema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            coreIdentity: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    primaryNarrativeRole: { type: Type.STRING },
                    characterArchetypes: { type: Type.ARRAY, items: { type: Type.STRING } },
                    fullLegalName: { type: Type.OBJECT, properties: { first: { type: Type.STRING }, middle: { type: Type.STRING }, last: { type: Type.STRING } } },
                    titleHonorific: { type: Type.STRING }
                },
                required: ['name', 'primaryNarrativeRole']
            },
            visualDna: {
                type: Type.OBJECT,
                properties: {
                    gender: { type: Type.STRING, description: "Biological sex or gender presentation, e.g., 'Male', 'Female', 'Non-binary'" },
                    age: { type: Type.OBJECT, properties: { apparent: { type: Type.STRING }, chronological: { type: Type.NUMBER } } },
                    ethnicCulturalBackground: { type: Type.OBJECT, properties: { ethnicity: { type: Type.STRING }, nationalityRegion: { type: Type.STRING } } },
                    eyes: { type: Type.OBJECT, properties: { color: { type: Type.STRING }, shape: { type: Type.STRING } } },
                    hair: { type: Type.OBJECT, properties: { color: { type: Type.STRING }, styleCut: { type: Type.STRING }, texture: { type: Type.STRING } } },
                    buildPhysique: { type: Type.OBJECT, properties: { height: { type: Type.STRING }, weightFrame: { type: Type.STRING }, posture: { type: Type.STRING }, distinctiveTraits: { type: Type.ARRAY, items: { type: Type.STRING } } } }
                }
            },
            vocalProfile: {
                 type: Type.OBJECT,
                 properties: {
                     speakingPersona: { type: Type.STRING },
                     timbre: { type: Type.STRING },
                     pitchRange: { type: Type.STRING },
                     accentDialect: { type: Type.STRING },
                     pacing: { type: Type.STRING, description: "Speed of speech, e.g., 'Fast', 'Slow', 'Deliberate', 'Erratic'" },
                     speechPatterns: { type: Type.STRING },
                     voiceNotes: { type: Type.OBJECT, properties: { timbreDescription: { type: Type.STRING }, pitchNotes: { type: Type.STRING }, emotionCaptured: { type: Type.STRING }, accentMarkers: { type: Type.STRING }, deliveryStyle: { type: Type.STRING } } }
                 }
            },
            persona: {
                type: Type.OBJECT,
                properties: {
                    motivations: { type: Type.OBJECT, properties: { externalGoal: { type: Type.STRING }, internalNeed: { type: Type.STRING }, coreDrive: { type: Type.STRING } } },
                    fears: { type: Type.OBJECT, properties: { surfaceFear: { type: Type.STRING }, deepFear: { type: Type.STRING } } },
                    backstory: { type: Type.OBJECT, properties: { keyChildhoodEvents: { type: Type.ARRAY, items: { type: Type.STRING } }, keyAdultEvents: { type: Type.ARRAY, items: { type: Type.STRING } } } }
                }
            },
            outfitMatrix: {
                type: Type.OBJECT,
                properties: {
                    signatureLook: {
                        type: Type.OBJECT,
                        properties: {
                            tops: { type: Type.STRING },
                            bottoms: { type: Type.STRING },
                            footwear: { type: Type.STRING },
                            headwear: { type: Type.STRING },
                            accessories: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                }
            }
        },
        required: ['name', 'coreIdentity', 'visualDna', 'vocalProfile', 'outfitMatrix']
      };
      
      const partial = await this.executeGeneration<any>(prompt, schema, model);
      return { ...character.profile, ...partial };
  }

  // --- ART DEPT PROMPTS ---

  async generateAssetArtPrompt(asset: Asset, project: Project, model: GeminiModel = 'gemini-2.5-flash'): Promise<string> {
      const isCharacter = 'profile' in asset;
      const name = isCharacter ? asset.profile.name : asset.baseProfile.identity.name;
      
      let promptBuilder = `Cinematic concept art for ${name}. `;
      
      if (isCharacter) {
          const p = asset.profile;
          const v = p.visualDna;
          const o = p.outfitMatrix;
          
          const details = [
            v?.ethnicCulturalBackground?.ethnicity && `Ethnicity: ${v.ethnicCulturalBackground.ethnicity}`,
            v?.buildPhysique?.height && `Height: ${v.buildPhysique.height}`,
            v?.buildPhysique?.weightFrame && `Build: ${v.buildPhysique.weightFrame}`,
            v?.eyes?.color && `Eyes: ${v.eyes.color}`,
            v?.hair?.color && `Hair: ${v.hair.color}`,
            v?.hair?.styleCut && `Hair Style: ${v.hair.styleCut}`,
            o?.signatureLook?.tops && `Wearing: ${o.signatureLook.tops}`,
            o?.signatureLook?.headwear && `Headwear: ${o.signatureLook.headwear}`
          ].filter(Boolean).join(", ");
          
          if (details) promptBuilder += `Character Details: ${details}. `;
          
          promptBuilder += " frontal extreme closeup headshot, standing front, side, back views, expressions sheet on plain background, 4K, no text, no dividing lines, no circular lines around the head. "; 
          promptBuilder += "Aspect Ratio: 16:9. ";
      } else {
          // Location or Prop
          const b = asset.baseProfile;
          const v = b.visuals;
          let isProp = false;

          if ('architectureStyle' in v) {
              // LOCATION
              const lv = v as LocationVisuals;
              const details = [
                  lv.architectureStyle && `Style: ${lv.architectureStyle}`,
                  lv.lighting && `Lighting: ${lv.lighting}`,
              ].filter(Boolean).join(", ");
              if (details) promptBuilder += `Visual Details: ${details}. `;
              promptBuilder += " UNINHABITED. Empty set. Architectural photography. No people. No characters. ";
          } else {
              // PROP
              isProp = true;
              const pv = v as PropVisuals;
              const details = [
                  pv.material && `Material: ${pv.material}`,
                  pv.era && `Era: ${pv.era}`
              ].filter(Boolean).join(", ");
              if (details) promptBuilder += `Visual Details: ${details}. `;
              promptBuilder += " ISOLATED product shot. No hands holding it. No people. Neutral studio background. ";
          }
          promptBuilder += isProp ? "Aspect Ratio: 1:1. " : "Aspect Ratio: 16:9. ";
      }

      promptBuilder += `Style: ${project.style.primary}, ${project.style.secondary}. `;
      
      const prompt = `
          ${this.getProjectContext(project)}
          
          Create a detailed Stable Diffusion / Midjourney style prompt based on this description:
          "${promptBuilder}"
          
          INSTRUCTIONS:
          - If this is a CHARACTER, the prompt MUST follow the structure: "Firstname Surname, [Single Most Distinctive Visual Feature], [Other Details]...".
          - If this is a LOCATION, you MUST explicitly exclude people. 
            - MANDATORY INSTRUCTION: Add "Uninhabited, empty set, no people, no characters" to the generated prompt.
            - Ensure NO character names appear in the prompt.
          - If this is a PROP, you MUST explicitly exclude people.
            - MANDATORY INSTRUCTION: Add "Isolated object, no hands, no background characters, product shot" to the generated prompt.
            - Ensure NO character names appear in the prompt.
          - Write the final prompt in English, regardless of project language, as image models understand English best.
          
          Return JSON with 'imagePrompt'.
      `;
      
      const schema = {
          type: Type.OBJECT,
          properties: { imagePrompt: { type: Type.STRING } },
          required: ['imagePrompt']
      };
      
      const result = await this.executeGeneration<{ imagePrompt: string }>(prompt, schema, model);
      return result.imagePrompt;
  }

  // --- SHOT PROMPTS ---

  async generateShotListForScene(scene: Scene, project: Project, model: GeminiModel): Promise<{ description: string, keyAssets: string[] }[]> {
      const allAssetNames = [
          ...project.bible.characters.map(c => c.profile.name),
          ...project.bible.locations.map(l => l.baseProfile.identity.name),
          ...project.bible.props.map(p => p.baseProfile.identity.name)
      ];

      const prompt = `
          ${this.getProjectContext(project)}

          You are a world-class Film Director and Cinematographer.
          
          TASK: Create a cinematic shot list for the following scene.
          
          SCENE CONTEXT:
          ${scene.setting}
          ${scene.summary}
          SCRIPT CONTENT:
          ${scene.content.map(c => `[${c.type}] ${c.text}`).join('\n')}

          AVAILABLE ASSETS IN PROJECT:
          ${allAssetNames.join(', ')}

          INSTRUCTIONS:
          - Break the scene into a sequence of shots (e.g. Wide, Close-up, Tracking Shot).
          - **VISUAL DESCRIPTION RULES**: 
            - When mentioning a character, ALWAYS use the format: "Firstname Surname (Distinctive Feature)".
            - Example: "Pip Stronghoof (Small Horns)" or "Elias Thorne (Red Scarf)".
            - ONLY include ONE most distinctive visual property per character reference to keep the prompt focused.
          - Identify 'keyAssets': A list of EXACT names from the Available Assets list that are visible in this specific shot.
          - Ensure the flow of shots tells the story of the scene visually.
          - Keep shots roughly 5-15 seconds in duration.
          - Write the descriptions in ${project.style.language}.

          Return JSON array of shot objects.
      `;

      const schema = {
          type: Type.OBJECT,
          properties: {
              shots: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          description: { type: Type.STRING },
                          keyAssets: { type: Type.ARRAY, items: { type: Type.STRING } }
                      },
                      required: ['description', 'keyAssets']
                  }
              }
          },
          required: ['shots']
      };

      const result = await this.executeGeneration<{ shots: { description: string, keyAssets: string[] }[] }>(prompt, schema, model);
      return result.shots;
  }

  async generateShotImagePrompt(scene: Scene, shot: Shot, project: Project, model: GeminiModel): Promise<string> {
      const prompt = `
          ${this.getProjectContext(project)}

          You are a world-class Film Director. Describe this shot visually for an image generation model: ${shot.description}.
          Scene Context: ${scene.summary}
          
          INSTRUCTIONS:
          - Maintain strict character referencing: "Firstname Surname (Distinctive Feature)".
          - Ensure Aspect Ratio 16:9 is mentioned.
          - Write the prompt in English for the image generation model.
          
          Return JSON with 'imagePrompt' (for high-fidelity image gen).
      `;
      const schema = {
          type: Type.OBJECT,
          properties: { imagePrompt: { type: Type.STRING } },
          required: ['imagePrompt']
      };
      
      const result = await this.executeGeneration<{ imagePrompt: string }>(prompt, schema, model);
      return result.imagePrompt;
  }

  async generateShotVideoPrompt(scene: Scene, shot: Shot, project: Project, model: GeminiModel): Promise<{ videoJSON: VideoPromptJSON, videoPlan: string }> {
      const structureTemplate = `{
  "metadata": { "title": "Shot Title", "description": "Shot Description", "intended_use": "Visual Reference" },
  "task": { "type": "text_to_video", "high_level_intent": "Cinematic Shot", "primary_subject": "Main character or element" },
  "model_config": { "model_name": "veo-3.1", "generation_mode": "text_to_video" },
  "input_assets": {
    "primary_image": { "id": "uuid-placeholder", "description": "Description of start frame" },
    "additional_reference_images": []
  },
  "video_spec": { "total_duration_seconds": 5, "fps": 24, "aspect_ratio": "16:9", "output_format": "mp4" },
  "global_style": { "visual_style": "Cinematic", "mood_and_tone": "Dramatic", "lighting_style": "High Contrast", "camera_feel": "Steady" },
  "global_text_prompt": { "scene_description": "Full scene desc", "primary_subject_description": "Subject detail", "camera_and_movement_overview": "Camera move", "keywords": ["cinematic"] },
  "animation_plan": { "overall_motion_goal": "Smooth", "subject_motion_plan": "Action", "environment_change_plan": "None" },
  "segments": [
    {
      "segment_id": "seg_01",
      "start_time_seconds": 0,
      "duration_seconds": 2.5,
      "segment_purpose": "Establish action",
      "segment_description": "Detailed segment description",
      "camera": { "shot_type": "Wide", "camera_position": "Eye level", "camera_movement": "Pan Right" }
    }
  ]
}`;

      const prompt = `
          ${this.getProjectContext(project)}

          You are a technical director. Create a structured Video Generation JSON definition AND an optimized narrative plan for this shot: ${shot.description}.
          Scene Context: ${scene.summary}
          
          TASK:
          1. Analyze the shot description. If it implies sequential actions or distinct camera moves, BREAK IT DOWN into multiple segments in the 'segments' array.
          2. Generate a 'videoPlan' string: A human-readable "Optimized Shot List" summarizing the timing and action. Write this plan in ${project.style.language}.
          3. Generate the 'videoJSON' with ENGLISH prompts for the video model.
          4. Assume a shot duration of 5-15 seconds.
          
          FORMAT EXAMPLE FOR 'videoPlan':
          "0.00–2.40 — 'Title of Action' (Lens Choice, Camera Move)
          Narrative description of what happens in this segment...
          
          2.40–4.00 — 'Title of Action' (Lens Choice, Camera Move)
          Narrative description of what happens next..."
          
          Return JSON with 'videoJSON' (structure matching template) and 'videoPlan' (string).
      `;
      
      return await this.executeGeneration<{ videoJSON: VideoPromptJSON, videoPlan: string }>(prompt, undefined, model);
  }

  async generateVisual(prompt: string, model: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview' = 'gemini-2.5-flash-image', resolution: string = '1K', referenceImages: ShotReferenceImage[] = []): Promise<string> {
      try {
          const apiKey = this.getApiKey();
          if (!apiKey) throw new Error("No API Key found. Please configure it in Settings.");

          this.ai = new GoogleGenAI({ apiKey });

          let aspectRatio = "16:9";
          if (prompt.includes("Aspect Ratio: 1:1")) aspectRatio = "1:1";
          
          const config: any = {};
          let tools: any[] = [];
          const parts: any[] = [];

          if (model === 'gemini-3-pro-image-preview') {
             config.imageConfig = { 
                 aspectRatio: aspectRatio,
                 imageSize: resolution
             };
             tools = [{ googleSearch: {} }];
          }

          // --- FIX 1: Better Reference Logic ---
          // If references exist, we prepend them to the prompt parts
          // and we MODIFY the prompt text to explicitly instruct the model to USE them.
          let promptText = prompt;
          
          if (referenceImages.length > 0) {
              for (const ref of referenceImages) {
                  if (ref.isActive) {
                      const resolvedUrl = await this.resolveImageForAI(ref.url);
                      const resizedDataUrl = await this.resizeImage(resolvedUrl, 1024, 0.7);
                      
                      parts.push({ text: ref.sourceType === 'character' ? "Reference Character:" : "Reference Style/Structure:" });
                      parts.push({
                          inlineData: {
                              mimeType: "image/jpeg", 
                              data: resizedDataUrl.split(',')[1] 
                          }
                      });
                  }
              }
              // CRITICAL FIX: Explicitly tell the model what to do with the images
              promptText = `INSTRUCTIONS: Use the provided reference images as the STRUCTURAL BASIS and COMPOSITION for this generation. Do not just take inspiration; maintain the layout and key elements of the reference, but apply the style described below.\n\nPROMPT: ${prompt}`;
          }
          
          parts.push({ text: promptText });

          const requestParams: any = {
              model: model,
              contents: { parts: parts },
              config: config
          };

          if (tools.length > 0) {
              requestParams.tools = tools;
          }

          const response = await this.ai.models.generateContent(requestParams);
          
          for (const part of response.candidates?.[0]?.content?.parts || []) {
              if (part.inlineData) {
                  return part.inlineData.data; 
              }
          }
          throw new Error("No image data returned from API.");
      } catch (error: any) {
          console.error("Error in Gemini Visual Generation:", error);
           if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
            throw new Error("API Rate Limit Exceeded.");
        }
        if (error.message && error.message.includes("Requested entity was not found.")) {
             throw new Error("API Key error. Requested entity was not found.");
        }
          throw new Error("Failed to generate visual. " + (error.message || ""));
      }
  }

  async generateShotImage(prompt: string, referenceImages: ShotReferenceImage[], modelName: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview' = 'gemini-3-pro-image-preview', resolution: string = '1K'): Promise<string> {
      // Re-using the logic from generateVisual since it now handles references robustly
      return this.generateVisual(prompt, modelName, resolution, referenceImages);
  }

  // New method for smart reorder checks
  async analyzeReorderImpact(
      originalScenes: Scene[],
      newScenes: Scene[],
      project: Project
  ): Promise<{ significant: boolean; reason: string }> {
      // Don't waste tokens if it's just one scene or no content
      const hasContent = originalScenes.some(s => s.summary.length > 10);
      if (!hasContent) {
          return { significant: false, reason: "" };
      }

      const originalOrderStr = originalScenes.map(s => `Scene ${s.sceneNumber}: ${s.summary}`).join('\n');
      const newOrderStr = newScenes.map((s, i) => `[New Position ${i + 1}] (Was Scene ${s.sceneNumber}): ${s.summary}`).join('\n');

      const prompt = `
          ${this.getProjectContext(project)}

          I am reordering the scenes in a script. 
          
          ORIGINAL ORDER:
          ${originalOrderStr}

          NEW ORDER:
          ${newOrderStr}

          TASK: Analyze if this reordering significantly breaks the narrative logic, continuity, or emotional arc of the story.
          - If the change is minor (e.g. swapping two similar scenes with no dependency), say NO.
          - If the change creates a plot hole (e.g. showing a character dead before they die) or ruins suspense, say YES.

          Return JSON: { "significant": boolean, "reason": "Short explanation of impact" }
      `;

      // Use Flash for speed
      const schema = {
          type: Type.OBJECT,
          properties: {
              significant: { type: Type.BOOLEAN },
              reason: { type: Type.STRING }
          },
          required: ['significant', 'reason']
      };

      try {
          return await this.executeGeneration<{ significant: boolean, reason: string }>(
              prompt, 
              schema, 
              'gemini-2.5-flash'
          );
      } catch (e) {
          console.error("Reorder analysis failed", e);
          return { significant: false, reason: "Analysis failed, proceeding." };
      }
  }
}

export const geminiService = new GeminiService();