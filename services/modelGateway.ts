
import { get } from 'lodash-es';
import { AIModelConfig, APIEndpointDefinition } from '../types';
import { geminiService } from './geminiService';

// Helper to resolve deep paths in objects
const resolvePath = (obj: any, path: string): any => {
    return get(obj, path);
};

export class ModelGateway {
    // Hardcoded fallback models in case remote fetch fails
    private static LOCAL_FALLBACK_MODELS: AIModelConfig[] = [
        {
            id: 'gemini-2.5-flash',
            name: 'Gemini 2.5 Flash',
            provider: 'google_native',
            family: 'text',
            contextWindow: 1000000,
            isDefault: true
        },
        {
            id: 'gemini-3-pro-preview',
            name: 'Gemini 3.0 Pro',
            provider: 'google_native',
            family: 'text',
            contextWindow: 2000000
        },
        {
            id: 'gemini-2.5-flash-image',
            name: 'Gemini 2.5 Flash (Image)',
            provider: 'google_native',
            family: 'image',
            contextWindow: 0
        },
        {
            id: 'gemini-3-pro-image-preview',
            name: 'Gemini 3.0 Pro (Image)',
            provider: 'google_native',
            family: 'image',
            contextWindow: 0
        },
        {
            id: 'veo-3.1',
            name: 'Veo 3.1 (Video)',
            provider: 'google_native',
            family: 'video',
            contextWindow: 0
        }
    ];

    /**
     * Fetches model definitions from a remote source.
     * Returns fallback models if the request fails.
     */
    async fetchRemoteDefinitions(): Promise<AIModelConfig[]> {
        try {
            // Placeholder URL - replace with actual remote JSON endpoint in production
            const response = await fetch('https://raw.githubusercontent.com/showrunner-ai/models/main/models.json'); 
            
            if (!response.ok) {
                console.warn("Failed to fetch remote models, using fallback.");
                return ModelGateway.LOCAL_FALLBACK_MODELS;
            }
            
            const data = await response.json();
            
            // Validate that we got an array
            if (Array.isArray(data.models)) {
                return data.models as AIModelConfig[];
            } else {
                return ModelGateway.LOCAL_FALLBACK_MODELS;
            }
        } catch (error) {
            // console.warn("Error fetching remote definitions:", error);
            // Silent fallback is preferred for offline-first apps
            return ModelGateway.LOCAL_FALLBACK_MODELS;
        }
    }

    /**
     * The Universal Payload Constructor.
     * Maps internal variables (prompt, modelId, etc.) into the specific JSON structure
     * required by the external API based on paramMapping.
     */
    private constructPayload(mapping: any, inputs: Record<string, any>): any {
        if (typeof mapping === 'string') {
            // Check for {{variable}} syntax
            if (mapping.startsWith('{{') && mapping.endsWith('}}')) {
                const key = mapping.slice(2, -2);
                return inputs[key] !== undefined ? inputs[key] : mapping;
            }
            return mapping;
        } else if (Array.isArray(mapping)) {
            return mapping.map(item => this.constructPayload(item, inputs));
        } else if (typeof mapping === 'object' && mapping !== null) {
            const result: any = {};
            for (const key in mapping) {
                result[key] = this.constructPayload(mapping[key], inputs);
            }
            return result;
        }
        return mapping;
    }

    /**
     * Executes a generic API request handling headers, auth, and async polling.
     */
    private async executeGenericRequest(
        config: AIModelConfig, 
        inputs: Record<string, any>
    ): Promise<any> {
        const apiKey = localStorage.getItem(`apikey_${config.provider}`);
        // Allow no key for local providers like 'comfyui' if explicitly set/implied, 
        // but generally generic providers might need one. 
        // If apiKey is null, we proceed, as some local services (like local Comfy) might not need it.

        const endpoint = config.endpoints?.generate;
        if (!endpoint) throw new Error(`No generation endpoint defined for model ${config.name}`);

        // 1. Prepare Payload Inputs
        // We inject the model ID into inputs so it can be mapped if needed
        const requestInputs = { ...inputs, id: config.id };
        const body = this.constructPayload(endpoint.paramMapping, requestInputs);

        // 2. Prepare URL with Templating (e.g. {{id}} injection in URL)
        let finalUrl = endpoint.url;
        finalUrl = finalUrl.replace(/\{\{(\w+)\}\}/g, (_, key) => {
             if (requestInputs[key] !== undefined) return String(requestInputs[key]);
             // Special case: inject key into URL if needed (e.g. query param)
             if (key === 'key' && apiKey) return apiKey;
             return `{{${key}}}`; 
        });

        // 3. Prepare Headers (inject API Key)
        const headers: Record<string, string> = {};
        if (endpoint.headers) {
            for (const [key, value] of Object.entries(endpoint.headers)) {
                // Replace {{key}} in headers
                headers[key] = value.replace('{{key}}', apiKey || '');
            }
        }

        // 4. Make Request
        const response = await fetch(finalUrl, {
            method: endpoint.method,
            headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Provider Error (${response.status}): ${errText}`);
        }

        const data = await response.json();

        // 5. Handle Output Mapping
        // If there is a status endpoint defined, we assume Async Polling pattern
        if (config.endpoints?.status) {
            return this.pollForCompletion(data, config, apiKey || '');
        } else {
            // Synchronous response
            // We expect outputMapping to define where the result is. 
            // e.g. { "text": "choices[0].message.content" } or { "image": "data[0].url" }
            return data;
        }
    }

    /**
     * Polls a status endpoint until completion.
     */
    private async pollForCompletion(initialResponse: any, config: AIModelConfig, apiKey: string): Promise<any> {
        const statusEndpoint = config.endpoints!.status!;
        
        // Extract Task ID from initial response based on Generate endpoint's output mapping
        // We assume 'id' in outputMapping points to the task ID
        const taskIdPath = config.endpoints?.generate.outputMapping?.['id'] || 'id';
        const taskId = resolvePath(initialResponse, taskIdPath);

        if (!taskId) throw new Error("Could not extract Task ID from initial response for polling.");

        // Prepare Status Headers
        const headers: Record<string, string> = {};
        if (statusEndpoint.headers) {
            for (const [key, value] of Object.entries(statusEndpoint.headers)) {
                headers[key] = value.replace('{{key}}', apiKey);
            }
        }

        const statusUrl = statusEndpoint.url.replace('{{id}}', taskId);
        
        const POLLING_INTERVAL = 2000; // 2s
        const MAX_ATTEMPTS = 60; // 2 mins timeout roughly

        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            await new Promise(r => setTimeout(r, POLLING_INTERVAL));

            const response = await fetch(statusUrl, {
                method: statusEndpoint.method,
                headers
            });
            
            if (!response.ok) continue; // Retry on transient network errors?

            const data = await response.json();
            
            // Check Status
            const statusPath = statusEndpoint.outputMapping?.['status'] || 'status';
            const statusValue = resolvePath(data, statusPath);

            // Common success flags
            if (['succeeded', 'completed', 'done', 'success'].includes(statusValue?.toLowerCase())) {
                return data;
            }

            if (['failed', 'error'].includes(statusValue?.toLowerCase())) {
                throw new Error(`Generation failed with status: ${statusValue}`);
            }
        }

        throw new Error("Generation timed out.");
    }

    /**
     * Generates text content.
     */
    async generateText(prompt: string, config: AIModelConfig, systemInstruction?: string): Promise<string> {
        if (config.provider === 'google_native') {
            const { GoogleGenAI } = await import("@google/genai");
            const apiKey = localStorage.getItem('gemini_api_key') || '';
            if (!apiKey) throw new Error("Google API Key not found.");

            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: config.id,
                contents: prompt,
                config: { systemInstruction }
            });

            return response.text || '';
        } else {
            // Generic Provider
            try {
                const rawResponse = await this.executeGenericRequest(config, { prompt });
                
                // Extract text using mapping
                const resultPath = config.endpoints?.generate.outputMapping?.['text'] || 'text';
                const text = resolvePath(rawResponse, resultPath);
                
                if (typeof text !== 'string') throw new Error("Could not extract text from provider response.");
                return text;
            } catch (e: any) {
                console.error("Generic Text Generation Error:", e);
                throw new Error(`[${config.name}] Error: ${e.message}`);
            }
        }
    }

    /**
     * Generates visual content.
     */
    async generateVisual(prompt: string, config: AIModelConfig): Promise<string> {
        if (config.provider === 'google_native') {
            return geminiService.generateVisual(prompt, config.id as any);
        } else {
            // Generic Provider
            try {
                // Determine if we are waiting for a final polling result or sync result
                const rawResponse = await this.executeGenericRequest(config, { prompt });

                // If async polling was used, rawResponse is the final status response.
                // If sync, it's the generate response.
                // We use the appropriate outputMapping.
                
                const endpointDef = config.endpoints?.status ? config.endpoints.status : config.endpoints?.generate;
                const resultPath = endpointDef?.outputMapping?.['image'] || 'image_url'; // Default guess
                
                const imageUrl = resolvePath(rawResponse, resultPath);

                if (!imageUrl) throw new Error("Could not extract image URL from provider response.");

                // If result is a URL (not base64), we might need to fetch it to convert to base64 for local storage
                if (imageUrl.startsWith('http')) {
                    // Fetch image through proxy if needed or directly if CORS allows
                    // Note: For now assuming direct fetch works or user handles CORS
                    const imgResp = await fetch(imageUrl);
                    const blob = await imgResp.blob();
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const b64 = (reader.result as string).split(',')[1];
                            resolve(b64);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } else if (imageUrl.startsWith('data:image')) {
                    return imageUrl.split(',')[1];
                } else {
                    // Assume raw base64
                    return imageUrl;
                }
            } catch (e: any) {
                console.error("Generic Visual Generation Error:", e);
                throw new Error(`[${config.name}] Error: ${e.message}`);
            }
        }
    }
}

export const modelGateway = new ModelGateway();
