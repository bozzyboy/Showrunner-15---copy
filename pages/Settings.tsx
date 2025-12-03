
import React, { useState, useEffect, useMemo } from 'react';
import { useShowrunnerStore } from '../store/showrunnerStore';
import { AIModelConfig } from '../types';
import { Save, Key, Database, Globe, Plus, Trash2, Code2, ExternalLink, Box, Terminal, FileUp } from 'lucide-react';

const Settings: React.FC = () => {
    const { apiKeys, updateApiKey, availableModels, customModels, fetchModels, addCustomModel, removeCustomModel } = useShowrunnerStore();
    const [activeTab, setActiveTab] = useState<'general' | 'keys' | 'custom_models'>('keys');

    // Local state for API Keys
    const [inputValues, setInputValues] = useState<Record<string, string>>(apiKeys);
    const [status, setStatus] = useState<string>('');

    // --- CUSTOM MODEL BUILDER STATE ---
    const [builderMode, setBuilderMode] = useState<'simple' | 'advanced'>('simple');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('openai');
    
    // Simple Mode Inputs
    const [simpleName, setSimpleName] = useState('');
    const [simpleId, setSimpleId] = useState('');
    const [simpleContext, setSimpleContext] = useState(128000);
    
    // Provider Specific Inputs
    const [comfyBaseUrl, setComfyBaseUrl] = useState('http://127.0.0.1:8188');
    const [genericProviderName, setGenericProviderName] = useState('');
    const [genericEndpoint, setGenericEndpoint] = useState('');
    const [genericOutputPath, setGenericOutputPath] = useState('image_url');
    const [replicateVersion, setReplicateVersion] = useState('');
    const [falPath, setFalPath] = useState('fal-ai/flux-pro');
    
    // Advanced Mode Input
    const [advancedJson, setAdvancedJson] = useState('');

    // Dynamic Provider Calculation
    const uniqueProviders = useMemo(() => {
        const providers = new Set<string>();
        // Always include some basics if desired, but dynamic logic should rule
        providers.add('openai_compatible');
        providers.add('kie');
        providers.add('wavespeed');
        
        availableModels.forEach(m => {
            if (m.provider && m.provider !== 'google_native') {
                providers.add(m.provider);
            }
        });
        return Array.from(providers);
    }, [availableModels]);

    // Sync keys on mount & update, checking localStorage for dynamic providers not in initial store
    useEffect(() => {
        const newValues = { ...apiKeys };
        uniqueProviders.forEach(p => {
            if (!newValues[p]) {
                const stored = localStorage.getItem(`apikey_${p}`);
                if (stored) newValues[p] = stored;
            }
        });
        setInputValues(newValues);
    }, [apiKeys, uniqueProviders]);

    const handleSaveKey = (provider: string) => {
        const key = inputValues[provider];
        if (key !== undefined) {
            updateApiKey(provider, key.trim());
            setStatus(`Saved ${provider}!`);
            setTimeout(() => setStatus(''), 2000);
        }
    };

    const handleKeyChange = (provider: string, value: string) => {
        setInputValues(prev => ({ ...prev, [provider]: value }));
    };

    // --- IMPORTERS ---

    const handleCurlImport = () => {
        const curl = prompt("Paste your cURL command here:");
        if (!curl) return;

        try {
            // Rudimentary cURL parser
            const urlMatch = curl.match(/['"](https?:\/\/[^'"]+)['"]/);
            const url = urlMatch ? urlMatch[1] : '';
            
            const headerMatches = curl.matchAll(/-H\s+['"]([^'"]+)['"]/g);
            const headers: Record<string, string> = {};
            for (const match of headerMatches) {
                const [full, headerStr] = match;
                const [key, value] = headerStr.split(':').map(s => s.trim());
                if (key && value) {
                    // Replace potential keys with placeholder
                    headers[key] = value.length > 20 && (key.toLowerCase().includes('auth') || key.toLowerCase().includes('key')) ? '{{key}}' : value;
                }
            }

            const bodyMatch = curl.match(/(--data-raw|--data|-d)\s+['"](\{.*?\})['"]/);
            let body = bodyMatch ? JSON.parse(bodyMatch[2]) : {};

            const config: AIModelConfig = {
                id: "imported-model",
                name: "Imported Model",
                provider: "custom_provider",
                family: "text",
                contextWindow: 4096,
                endpoints: {
                    generate: {
                        url: url || "https://api.example.com",
                        method: "POST",
                        headers: headers,
                        paramMapping: body,
                        outputMapping: { "text": "result" }
                    }
                }
            };

            setAdvancedJson(JSON.stringify(config, null, 2));
            setBuilderMode('advanced');
            setStatus("cURL Parsed! Review JSON.");
        } catch (e) {
            alert("Failed to parse cURL. Ensure it is standard format.");
        }
    };

    const handleWorkflowUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target?.result as string);
                let paramMapping = json;
                
                // Intelligent Parsing for ComfyUI API Format
                // Find KSampler (usually handles generation) or CLIPTextEncode
                let textNodeId = null;
                
                for (const [nodeId, node] of Object.entries(json) as [string, any][]) {
                    if (node.class_type === 'CLIPTextEncode') {
                        // We assume the first CLIPTextEncode we find might be the positive prompt
                        // Or we look for one connected to KSampler 'positive' input
                        // For simplicity, we search for one with "text" input
                        if (node.inputs && typeof node.inputs.text === 'string') {
                            textNodeId = nodeId;
                            // Inject placeholder locally to the object
                            node.inputs.text = "{{prompt}}";
                            break; // Stop at first text node found
                        }
                    }
                }

                if (!textNodeId) {
                    alert("Could not automatically find a CLIPTextEncode node to inject {{prompt}}. You may need to edit the JSON manually.");
                }

                const config: AIModelConfig = {
                    id: file.name.replace('.json', '').toLowerCase().replace(/\s+/g, '-'),
                    name: file.name.replace('.json', ''),
                    provider: 'comfyui',
                    family: 'image',
                    contextWindow: 0,
                    endpoints: {
                        generate: {
                            url: "http://127.0.0.1:8188/prompt",
                            method: "POST",
                            paramMapping: {
                                "prompt": json,
                                "client_id": "showrunner_client"
                            },
                            outputMapping: { "id": "prompt_id" }
                        }
                    }
                };

                setAdvancedJson(JSON.stringify(config, null, 2));
                setBuilderMode('advanced');
                setStatus("Workflow Loaded!");
            } catch (err) {
                alert("Invalid JSON file.");
            }
        };
        reader.readAsText(file);
    };

    const handleAddCustomModel = () => {
        try {
            let newModel: AIModelConfig;

            if (builderMode === 'advanced') {
                newModel = JSON.parse(advancedJson);
            } else {
                // Template Construction Logic
                if (selectedTemplate === 'openai') {
                    if (!simpleId || !simpleName) throw new Error("ID and Name are required.");
                    newModel = {
                        id: simpleId,
                        name: simpleName,
                        provider: 'openai_compatible',
                        family: 'text',
                        contextWindow: simpleContext,
                        endpoints: {
                            generate: {
                                url: 'https://api.openai.com/v1/chat/completions',
                                method: 'POST',
                                headers: { 'Authorization': 'Bearer {{key}}', 'Content-Type': 'application/json' },
                                paramMapping: {
                                    'model': '{{id}}',
                                    'messages': [ { 'role': 'user', 'content': '{{prompt}}' } ],
                                    'temperature': 0.7
                                },
                                outputMapping: { 'text': 'choices[0].message.content' }
                            }
                        }
                    };
                } else if (selectedTemplate === 'replicate') {
                    if (!simpleName || !replicateVersion) throw new Error("Name and Version ID are required.");
                    const derivedId = simpleId || simpleName.toLowerCase().replace(/\s+/g, '-');
                    newModel = {
                        id: derivedId,
                        name: simpleName,
                        provider: 'replicate',
                        family: 'image',
                        contextWindow: 0,
                        endpoints: {
                            generate: {
                                url: 'https://api.replicate.com/v1/predictions',
                                method: 'POST',
                                headers: { 'Authorization': 'Token {{key}}', 'Content-Type': 'application/json' },
                                paramMapping: {
                                    'version': replicateVersion,
                                    'input': { 'prompt': '{{prompt}}' }
                                },
                                outputMapping: { 'image': 'output[0]' } // Replicate often returns array of URLs
                            }
                        }
                    };
                } else if (selectedTemplate === 'fal') {
                    if (!simpleName || !falPath) throw new Error("Name and Model Path are required.");
                    const derivedId = simpleId || simpleName.toLowerCase().replace(/\s+/g, '-');
                    newModel = {
                        id: derivedId,
                        name: simpleName,
                        provider: 'fal_ai',
                        family: 'image',
                        contextWindow: 0,
                        endpoints: {
                            generate: {
                                url: `https://queue.fal.run/${falPath}`,
                                method: 'POST',
                                headers: { 'Authorization': 'Key {{key}}', 'Content-Type': 'application/json' },
                                paramMapping: { 'prompt': '{{prompt}}' },
                                outputMapping: { 'image': 'images[0].url' }
                            }
                        }
                    };
                } else if (selectedTemplate === 'comfyui') {
                    if (!simpleName) throw new Error("Model Name is required.");
                    const derivedId = simpleId || simpleName.toLowerCase().replace(/\s+/g, '-');
                    newModel = {
                        id: derivedId,
                        name: simpleName,
                        provider: 'comfyui',
                        family: 'image',
                        contextWindow: 0,
                        endpoints: {
                            generate: {
                                url: `${comfyBaseUrl.replace(/\/$/, '')}/prompt`,
                                method: 'POST',
                                paramMapping: {
                                    "prompt": {
                                        "3": { "class_type": "KSampler", "inputs": { "seed": 12345, "steps": 20, "cfg": 8, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0] } },
                                        "4": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": "v1-5-pruned-emaonly.ckpt" } },
                                        "5": { "class_type": "EmptyLatentImage", "inputs": { "width": 512, "height": 512, "batch_size": 1 } },
                                        "6": { "class_type": "CLIPTextEncode", "inputs": { "text": "{{prompt}}", "clip": ["4", 1] } },
                                        "7": { "class_type": "CLIPTextEncode", "inputs": { "text": "bad hands", "clip": ["4", 1] } },
                                        "8": { "class_type": "VAEDecode", "inputs": { "samples": ["3", 0], "vae": ["4", 2] } },
                                        "9": { "class_type": "SaveImage", "inputs": { "filename_prefix": "ComfyUI" } }
                                    },
                                    "client_id": "showrunner_client"
                                },
                                outputMapping: { "id": "prompt_id" }
                            }
                        }
                    };
                } else if (selectedTemplate === 'generic') {
                    if (!genericProviderName || !genericEndpoint || !simpleName) throw new Error("Provider, Endpoint, and Name are required.");
                    const derivedId = simpleId || simpleName.toLowerCase().replace(/\s+/g, '-');
                    newModel = {
                        id: derivedId,
                        name: simpleName,
                        provider: genericProviderName.toLowerCase().replace(/\s+/g, '_'),
                        family: 'image',
                        contextWindow: 0,
                        endpoints: {
                            generate: {
                                url: genericEndpoint,
                                method: 'POST',
                                headers: { 'Authorization': 'Bearer {{key}}', 'Content-Type': 'application/json' },
                                paramMapping: { "prompt": "{{prompt}}" },
                                outputMapping: { "image": genericOutputPath }
                            }
                        }
                    };
                } else {
                    throw new Error("Unknown template");
                }
            }

            if (!newModel.id || !newModel.name) throw new Error("Model ID and Name are required.");
            
            addCustomModel(newModel);
            
            // Reset
            setSimpleName('');
            setSimpleId('');
            setGenericProviderName('');
            setGenericEndpoint('');
            setReplicateVersion('');
            setFalPath('');
            setAdvancedJson('');
            
            setStatus('Model Added!');
            setTimeout(() => setStatus(''), 2000);

        } catch (e: any) {
            alert(`Failed to add model: ${e.message}`);
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-8 h-full flex flex-col">
             <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-black text-primary mb-1">Connectivity Hub</h1>
                    <p className="text-muted">Configure AI providers, keys, and connect custom services.</p>
                </div>
                <div className="flex gap-2 bg-surface p-1 rounded-lg border border-subtle">
                    <button 
                        onClick={() => setActiveTab('keys')} 
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'keys' ? 'bg-panel text-primary shadow-sm' : 'text-muted hover:text-primary-text'}`}
                    >
                        API Keys
                    </button>
                    <button 
                        onClick={() => setActiveTab('custom_models')} 
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'custom_models' ? 'bg-panel text-primary shadow-sm' : 'text-muted hover:text-primary-text'}`}
                    >
                        Custom Models
                    </button>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto">
                 {/* API KEYS TAB */}
                 {activeTab === 'keys' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="bg-surface border border-subtle rounded-xl p-6">
                                <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                                    <Key className="text-accent" size={20} /> Provider Credentials
                                </h2>
                                
                                <div className="space-y-6">
                                    {/* Google Gemini (Native Integration) */}
                                    <div className="bg-panel p-4 rounded-lg border border-subtle">
                                        <label className="block text-xs font-bold text-muted uppercase mb-2 flex justify-between">
                                            <span>Google Gemini API Key</span>
                                            <span className="text-[10px] text-accent">Native Integration</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="password" 
                                                value={inputValues['google_native'] || ''}
                                                onChange={(e) => handleKeyChange('google_native', e.target.value)}
                                                placeholder="AIzaSy..."
                                                className="flex-1 bg-black/20 border-subtle rounded-md p-2 text-sm text-primary-text focus:ring-accent focus:border-accent font-mono"
                                            />
                                            <button onClick={() => handleSaveKey('google_native')} className="p-2 bg-primary text-black rounded hover:bg-white"><Save size={16}/></button>
                                        </div>
                                        <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-[10px] text-muted hover:text-primary-text flex items-center gap-1 mt-2">Get Key <ExternalLink size={10}/></a>
                                    </div>

                                    {/* Dynamic Inputs for All Other Providers */}
                                    {uniqueProviders.map(provider => (
                                        <div key={provider} className="bg-panel p-4 rounded-lg border border-subtle animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-xs font-bold text-muted uppercase mb-2 flex items-center gap-2">
                                                {provider.replace(/_/g, ' ')} API Key
                                            </label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="password" 
                                                    value={inputValues[provider] || ''}
                                                    onChange={(e) => handleKeyChange(provider, e.target.value)}
                                                    placeholder={`Key for ${provider}...`}
                                                    className="flex-1 bg-black/20 border-subtle rounded-md p-2 text-sm text-primary-text focus:ring-accent focus:border-accent font-mono"
                                                />
                                                <button onClick={() => handleSaveKey(provider)} className="p-2 bg-subtle text-primary-text rounded hover:bg-neutral-600"><Save size={16}/></button>
                                            </div>
                                            <p className="text-[10px] text-muted mt-2">Required for models using the <span className="font-mono text-accent">{provider}</span> provider.</p>
                                        </div>
                                    ))}
                                    
                                    {uniqueProviders.length === 0 && (
                                        <div className="text-center p-4 border border-dashed border-subtle rounded-lg text-muted">
                                            <p className="text-sm">No external providers configured yet.</p>
                                            <p className="text-xs mt-1">Add a custom model (e.g. from Replicate or Suno) to see its key settings appear here.</p>
                                        </div>
                                    )}

                                    {status && <div className="p-2 bg-green-500/10 text-green-400 text-center rounded text-sm font-bold">{status}</div>}
                                </div>
                            </div>
                        </div>

                        {/* Diagnostics Panel */}
                        <div className="bg-surface border border-subtle rounded-xl p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                                    <Database className="text-purple-400" size={20} /> Active Models
                                </h2>
                                <button onClick={() => fetchModels()} className="text-xs flex items-center gap-1 text-muted hover:text-primary-text bg-panel px-2 py-1 rounded border border-subtle hover:border-muted transition-colors">
                                    <Globe size={12}/> Refresh Remote
                                </button>
                            </div>
                            <div className="bg-panel rounded-lg border border-subtle overflow-hidden max-h-[500px] overflow-y-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-black/20 text-muted font-bold uppercase sticky top-0 bg-panel">
                                        <tr>
                                            <th className="p-3">Model Name</th>
                                            <th className="p-3">Provider</th>
                                            <th className="p-3">Family</th>
                                            <th className="p-3 text-right">Context</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-subtle">
                                        {availableModels.map(model => (
                                            <tr key={model.id} className="hover:bg-white/5">
                                                <td className="p-3">
                                                    <span className="font-medium text-primary-text block">{model.name}</span>
                                                    <span className="text-[10px] text-muted font-mono opacity-70">{model.id}</span>
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${model.provider === 'google_native' ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'}`}>
                                                        {model.provider}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-muted capitalize">{model.family}</td>
                                                <td className="p-3 text-right text-muted font-mono">{model.contextWindow.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                     </div>
                 )}

                 {/* CUSTOM MODELS TAB */}
                 {activeTab === 'custom_models' && (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                         {/* Form Column */}
                         <div className="lg:col-span-1 space-y-6">
                            <div className="bg-surface border border-subtle rounded-xl p-6">
                                <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                                    <Box className="text-accent" size={20} /> Add Model
                                </h2>
                                
                                <div className="flex gap-2 mb-6 p-1 bg-panel rounded-lg border border-subtle">
                                    <button 
                                        onClick={() => setBuilderMode('simple')} 
                                        className={`flex-1 py-1.5 text-xs font-bold rounded ${builderMode === 'simple' ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-primary-text'}`}
                                    >
                                        Templates
                                    </button>
                                    <button 
                                        onClick={() => setBuilderMode('advanced')} 
                                        className={`flex-1 py-1.5 text-xs font-bold rounded ${builderMode === 'advanced' ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-primary-text'}`}
                                    >
                                        Advanced
                                    </button>
                                </div>

                                {builderMode === 'simple' ? (
                                    <div className="space-y-4">
                                        {/* Import Tools */}
                                        <div className="grid grid-cols-2 gap-2 mb-4">
                                            <button onClick={handleCurlImport} className="flex flex-col items-center justify-center p-3 bg-panel border border-dashed border-subtle rounded hover:border-accent hover:bg-accent/10 transition-colors">
                                                <Terminal size={16} className="mb-1 text-muted"/>
                                                <span className="text-[10px] font-bold">Paste cURL</span>
                                            </button>
                                            <div className="relative flex flex-col items-center justify-center p-3 bg-panel border border-dashed border-subtle rounded hover:border-accent hover:bg-accent/10 transition-colors cursor-pointer">
                                                <FileUp size={16} className="mb-1 text-muted"/>
                                                <span className="text-[10px] font-bold">ComfyUI JSON</span>
                                                <input type="file" onChange={handleWorkflowUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept=".json"/>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-muted uppercase mb-1">Provider Template</label>
                                            <select 
                                                value={selectedTemplate} 
                                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                                className="w-full bg-panel border-subtle rounded-md p-2 text-sm text-primary-text focus:ring-accent focus:border-accent"
                                            >
                                                <option value="openai">OpenAI Compatible (Standard)</option>
                                                <option value="replicate">Replicate (Standard)</option>
                                                <option value="fal">Fal.ai (Queue API)</option>
                                                <option value="comfyui">ComfyUI (Local/Cloud)</option>
                                                <option value="generic">Generic REST API</option>
                                            </select>
                                        </div>

                                        {/* TEMPLATE SPECIFIC INPUTS */}
                                        
                                        {selectedTemplate === 'replicate' && (
                                            <div>
                                                <label className="block text-xs font-bold text-muted uppercase mb-1">Model Version (Hash)</label>
                                                <input type="text" value={replicateVersion} onChange={(e) => setReplicateVersion(e.target.value)} placeholder="e.g. 5c7d5dc6dd..." className="w-full bg-panel border-subtle rounded-md p-2 text-sm font-mono focus:border-accent" />
                                            </div>
                                        )}

                                        {selectedTemplate === 'fal' && (
                                            <div>
                                                <label className="block text-xs font-bold text-muted uppercase mb-1">Model Path</label>
                                                <input type="text" value={falPath} onChange={(e) => setFalPath(e.target.value)} placeholder="e.g. fal-ai/flux-pro" className="w-full bg-panel border-subtle rounded-md p-2 text-sm font-mono focus:border-accent" />
                                            </div>
                                        )}

                                        {selectedTemplate === 'comfyui' && (
                                            <div>
                                                <label className="block text-xs font-bold text-muted uppercase mb-1">Base URL</label>
                                                <input type="text" value={comfyBaseUrl} onChange={(e) => setComfyBaseUrl(e.target.value)} placeholder="http://127.0.0.1:8188" className="w-full bg-panel border-subtle rounded-md p-2 text-sm font-mono focus:border-accent" />
                                            </div>
                                        )}

                                        {selectedTemplate === 'generic' && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-bold text-muted uppercase mb-1">Provider Name</label>
                                                    <input type="text" value={genericProviderName} onChange={(e) => setGenericProviderName(e.target.value)} placeholder="e.g. suno, kling" className="w-full bg-panel border-subtle rounded-md p-2 text-sm text-primary-text focus:border-accent" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-muted uppercase mb-1">Endpoint URL</label>
                                                    <input type="text" value={genericEndpoint} onChange={(e) => setGenericEndpoint(e.target.value)} placeholder="https://api..." className="w-full bg-panel border-subtle rounded-md p-2 text-sm font-mono focus:border-accent" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-muted uppercase mb-1">JSON Output Path</label>
                                                    <input type="text" value={genericOutputPath} onChange={(e) => setGenericOutputPath(e.target.value)} placeholder="data.url" className="w-full bg-panel border-subtle rounded-md p-2 text-sm font-mono focus:border-accent" />
                                                </div>
                                            </>
                                        )}

                                        <div>
                                            <label className="block text-xs font-bold text-muted uppercase mb-1">Display Name</label>
                                            <input 
                                                type="text" 
                                                value={simpleName}
                                                onChange={(e) => setSimpleName(e.target.value)}
                                                placeholder="e.g. Flux Pro 1.1"
                                                className="w-full bg-panel border-subtle rounded-md p-2 text-sm text-primary-text focus:border-accent"
                                            />
                                        </div>

                                        {selectedTemplate === 'openai' && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-bold text-muted uppercase mb-1">Model ID</label>
                                                    <input type="text" value={simpleId} onChange={(e) => setSimpleId(e.target.value)} placeholder="e.g. gpt-4" className="w-full bg-panel border-subtle rounded-md p-2 text-sm font-mono focus:border-accent" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-muted uppercase mb-1">Context Window</label>
                                                    <input type="number" value={simpleContext} onChange={(e) => setSimpleContext(parseInt(e.target.value))} className="w-full bg-panel border-subtle rounded-md p-2 text-sm font-mono focus:border-accent" />
                                                </div>
                                            </>
                                        )}
                                        
                                        <p className="text-[10px] text-muted italic pt-2 border-t border-subtle">
                                            Adding this model will automatically create an API Key slot in the 'Keys' tab if the provider is new.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-muted uppercase mb-1">Raw JSON Definition</label>
                                            <textarea 
                                                value={advancedJson}
                                                onChange={(e) => setAdvancedJson(e.target.value)}
                                                rows={15}
                                                placeholder={`{\n  "id": "my-model",\n  "name": "My Model",\n  "provider": "openai_compatible",\n  ... \n}`}
                                                className="w-full bg-panel border-subtle rounded-md p-2 text-xs font-mono text-primary-text focus:ring-accent focus:border-accent"
                                            />
                                            <a href="https://github.com/showrunner-ai/models" target="_blank" className="text-[10px] text-accent hover:underline flex items-center gap-1 mt-1 justify-end">Schema Docs <ExternalLink size={10}/></a>
                                        </div>
                                    </div>
                                )}

                                <button 
                                    onClick={handleAddCustomModel} 
                                    className="w-full mt-6 py-2 bg-primary text-neutral-900 font-bold text-sm rounded hover:bg-white transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus size={16}/> Add Custom Model
                                </button>
                                {status && <div className="mt-2 text-center text-green-400 text-xs font-bold">{status}</div>}
                            </div>
                         </div>

                         {/* List Column */}
                         <div className="lg:col-span-2 space-y-6">
                            <div className="bg-surface border border-subtle rounded-xl p-6 h-full flex flex-col">
                                <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                                    <Code2 className="text-accent" size={20} /> Your Custom Definitions
                                </h2>
                                
                                {customModels.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-muted border-2 border-dashed border-subtle rounded-lg">
                                        <Box size={48} className="opacity-20 mb-4"/>
                                        <p>No custom models added yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
                                        {customModels.map(model => (
                                            <div key={model.id} className="bg-panel border border-subtle rounded-lg p-4 relative group hover:border-accent transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h3 className="font-bold text-primary text-sm">{model.name}</h3>
                                                        <p className="text-[10px] text-muted font-mono bg-black/30 px-1 py-0.5 rounded inline-block mt-1">{model.id}</p>
                                                    </div>
                                                    <div className="text-right">
                                                         <span className="text-[10px] uppercase font-bold text-muted block">{model.provider}</span>
                                                         <span className="text-[10px] text-muted capitalize">{model.family}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-3 pt-3 border-t border-subtle">
                                                    <div className="flex justify-between items-center">
                                                        <div className="text-[10px] text-muted truncate max-w-[200px]">
                                                            Endpoint: <span className="text-primary-text font-mono">{model.endpoints?.generate.url}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => removeCustomModel(model.id)} 
                                                            className="p-1.5 text-muted hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                                                            title="Delete Definition"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                         </div>
                     </div>
                 )}
             </div>
        </div>
    );
};

export default Settings;
