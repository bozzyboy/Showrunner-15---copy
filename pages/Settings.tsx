import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useShowrunnerStore } from '../store/showrunnerStore';
import { AIModelConfig } from '../types';
import { Save, Key, Database, Globe, Plus, Trash2, Code2, Check, ExternalLink, Box, Terminal, UploadCloud } from 'lucide-react';
import JsonViewer from '../components/shared/JsonViewer';

const Settings: React.FC = () => {
    const { apiKeys, updateApiKey, availableModels, customModels, fetchModels, addCustomModel, removeCustomModel } = useShowrunnerStore();
    const [activeTab, setActiveTab] = useState<'keys' | 'custom_models'>('keys');

    // Local state for API Keys
    const [inputValues, setInputValues] = useState<Record<string, string>>(apiKeys);
    const [status, setStatus] = useState<string>('');

    // --- CUSTOM MODEL BUILDER STATE ---
    const [builderMode, setBuilderMode] = useState<'simple' | 'advanced' | 'curl'>('simple');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('openai');
    
    // Simple Inputs
    const [simpleName, setSimpleName] = useState('');
    const [simpleId, setSimpleId] = useState('');
    const [simpleProvider, setSimpleProvider] = useState('');
    const [simpleUrl, setSimpleUrl] = useState('');
    
    // Advanced/cURL Inputs
    const [advancedJson, setAdvancedJson] = useState('');
    const [curlInput, setCurlInput] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setInputValues(apiKeys);
    }, [apiKeys]);

    // --- DYNAMIC PROVIDER DISCOVERY ---
    const uniqueProviders = useMemo(() => {
        const allModels = [...availableModels, ...customModels];
        const providers = new Set(allModels.map(m => m.provider));
        providers.add('google_native'); // Always present
        return Array.from(providers);
    }, [availableModels, customModels]);

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

    // --- CURL PARSER ---
    const parseCurl = () => {
        try {
            // Very basic parser for common cURL patterns
            const urlMatch = curlInput.match(/'(https?:\/\/[^']+)'/);
            const headerMatches = [...curlInput.matchAll(/-H '([^:]+): ([^']+)'/g)];
            
            const url = urlMatch ? urlMatch[1] : '';
            const headers: Record<string, string> = {};
            
            headerMatches.forEach(match => {
                if (match[1].toLowerCase() === 'authorization') {
                    headers[match[1]] = match[2].replace(/Bearer\s+\S+/, 'Bearer {{key}}').replace(/Key\s+\S+/, 'Key {{key}}').replace(/Token\s+\S+/, 'Token {{key}}');
                } else {
                    headers[match[1]] = match[2];
                }
            });

            const config: AIModelConfig = {
                id: "imported-model-" + Date.now().toString().slice(-4),
                name: "Imported from cURL",
                provider: "generic",
                family: "text",
                contextWindow: 0,
                endpoints: {
                    generate: {
                        url: url,
                        method: 'POST',
                        headers: headers,
                        paramMapping: { "prompt": "{{prompt}}" }, // Guess
                        outputMapping: { "text": "result" } // Guess
                    }
                }
            };
            
            setAdvancedJson(JSON.stringify(config, null, 2));
            setBuilderMode('advanced');
            setStatus("Parsed cURL to JSON. Please review mappings.");
        } catch (e) {
            alert("Failed to parse cURL. Ensure it's a standard format.");
        }
    };

    // --- COMFYUI WORKFLOW IMPORT ---
    const handleComfyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const workflow = JSON.parse(ev.target?.result as string);
                
                // Construct config wrapping this workflow
                const config: AIModelConfig = {
                    id: `comfy-local-${Date.now()}`,
                    name: file.name.replace('.json', ''),
                    provider: 'local_comfy',
                    family: 'image',
                    contextWindow: 0,
                    endpoints: {
                        generate: {
                            url: `${simpleUrl || 'http://127.0.0.1:8188'}/prompt`,
                            method: 'POST',
                            headers: { "Content-Type": "application/json" },
                            paramMapping: {
                                "prompt": workflow // The entire workflow goes here
                            },
                            outputMapping: { "id": "prompt_id" }
                        }
                    }
                };
                
                // Try to find a text input node to inject {{prompt}}
                let foundText = false;
                const workflowStr = JSON.stringify(config, null, 2);
                // This is a naive replacement, user might need to refine
                setAdvancedJson(workflowStr);
                setBuilderMode('advanced');
                setStatus("Workflow loaded. Please locate your text input node in JSON and replace text with {{prompt}}.");

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
                // Template Logic
                if (selectedTemplate === 'openai') {
                    newModel = {
                        id: simpleId,
                        name: simpleName,
                        provider: 'openai_compatible',
                        family: 'text',
                        contextWindow: 128000,
                        endpoints: {
                            generate: {
                                url: 'https://api.openai.com/v1/chat/completions',
                                method: 'POST',
                                headers: { 'Authorization': 'Bearer {{key}}', 'Content-Type': 'application/json' },
                                paramMapping: { 'model': '{{id}}', 'messages': [ { 'role': 'user', 'content': '{{prompt}}' } ], 'temperature': 0.7 },
                                outputMapping: { 'text': 'choices[0].message.content' }
                            }
                        }
                    };
                } else if (selectedTemplate === 'replicate') {
                     newModel = {
                        id: simpleId,
                        name: simpleName,
                        provider: 'replicate',
                        family: 'image',
                        contextWindow: 0,
                        endpoints: {
                            generate: {
                                url: 'https://api.replicate.com/v1/predictions',
                                method: 'POST',
                                headers: { 'Authorization': 'Token {{key}}', 'Content-Type': 'application/json' },
                                paramMapping: { 'version': '{{id}}', 'input': { 'prompt': '{{prompt}}' } },
                                outputMapping: { 'id': 'id' }
                            },
                            status: {
                                url: 'https://api.replicate.com/v1/predictions/{{id}}',
                                method: 'GET',
                                headers: { 'Authorization': 'Token {{key}}' },
                                outputMapping: { 'status': 'status', 'image': 'output[0]' }
                            }
                        }
                    };
                } else if (selectedTemplate === 'fal') {
                     newModel = {
                        id: simpleId, // e.g. fal-ai/flux-pro
                        name: simpleName,
                        provider: 'fal',
                        family: 'image',
                        contextWindow: 0,
                        endpoints: {
                            generate: {
                                url: `https://queue.fal.run/${simpleId}`, // URL Templating
                                method: 'POST',
                                headers: { 'Authorization': 'Key {{key}}', 'Content-Type': 'application/json' },
                                paramMapping: { 'prompt': '{{prompt}}' },
                                outputMapping: { 'image': 'images[0].url' }
                            }
                        }
                    };
                } else if (selectedTemplate === 'generic') {
                     newModel = {
                        id: simpleId,
                        name: simpleName,
                        provider: simpleProvider.toLowerCase(),
                        family: 'text',
                        contextWindow: 0,
                        endpoints: {
                            generate: {
                                url: simpleUrl,
                                method: 'POST',
                                headers: { 'Authorization': 'Bearer {{key}}', 'Content-Type': 'application/json' },
                                paramMapping: { 'prompt': '{{prompt}}' },
                                outputMapping: { 'text': 'result' }
                            }
                        }
                    };
                } else {
                    throw new Error("Unknown template");
                }
            }

            if (!newModel.id || !newModel.name) throw new Error("Model ID and Name are required.");
            
            addCustomModel(newModel);
            setSimpleName('');
            setSimpleId('');
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
                    <h1 className="text-3xl font-black text-primary mb-1">Settings</h1>
                    <p className="text-muted">Configure AI providers, keys, and custom models.</p>
                </div>
                <div className="flex gap-2 bg-surface p-1 rounded-lg border border-subtle">
                    <button onClick={() => setActiveTab('keys')} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'keys' ? 'bg-panel text-primary shadow-sm' : 'text-muted hover:text-primary-text'}`}>API Keys</button>
                    <button onClick={() => setActiveTab('custom_models')} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'custom_models' ? 'bg-panel text-primary shadow-sm' : 'text-muted hover:text-primary-text'}`}>Custom Models</button>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto">
                 {/* API KEYS TAB */}
                 {activeTab === 'keys' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="bg-surface border border-subtle rounded-xl p-6">
                                <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2"><Key className="text-accent" size={20} /> Provider Keys</h2>
                                <div className="space-y-6">
                                    {uniqueProviders.map(provider => (
                                        <div key={provider} className="bg-panel p-4 rounded-lg border border-subtle">
                                            <label className="block text-xs font-bold text-muted uppercase mb-2 flex justify-between">
                                                <span>{provider === 'google_native' ? 'Google Gemini' : provider} API Key</span>
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
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface border border-subtle rounded-xl p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-primary flex items-center gap-2"><Database className="text-purple-400" size={20} /> Active Models</h2>
                                <button onClick={() => fetchModels()} className="text-xs flex items-center gap-1 text-muted hover:text-primary-text bg-panel px-2 py-1 rounded border border-subtle hover:border-muted transition-colors"><Globe size={12}/> Refresh</button>
                            </div>
                            <div className="bg-panel rounded-lg border border-subtle overflow-hidden max-h-[500px] overflow-y-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-black/20 text-muted font-bold uppercase sticky top-0 bg-panel">
                                        <tr><th className="p-3">Model</th><th className="p-3">Provider</th><th className="p-3">Type</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-subtle">
                                        {availableModels.map(model => (
                                            <tr key={model.id} className="hover:bg-white/5">
                                                <td className="p-3"><span className="font-medium text-primary-text">{model.name}</span></td>
                                                <td className="p-3"><span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-purple-900/30 text-purple-400">{model.provider}</span></td>
                                                <td className="p-3 text-muted capitalize">{model.family}</td>
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
                         <div className="lg:col-span-1 space-y-6">
                            <div className="bg-surface border border-subtle rounded-xl p-6">
                                <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2"><Box className="text-accent" size={20} /> Add Model</h2>
                                <div className="flex gap-2 mb-6 p-1 bg-panel rounded-lg border border-subtle">
                                    <button onClick={() => setBuilderMode('simple')} className={`flex-1 py-1.5 text-xs font-bold rounded ${builderMode === 'simple' ? 'bg-surface text-primary' : 'text-muted'}`}>Simple</button>
                                    <button onClick={() => setBuilderMode('curl')} className={`flex-1 py-1.5 text-xs font-bold rounded ${builderMode === 'curl' ? 'bg-surface text-primary' : 'text-muted'}`}>cURL</button>
                                    <button onClick={() => setBuilderMode('advanced')} className={`flex-1 py-1.5 text-xs font-bold rounded ${builderMode === 'advanced' ? 'bg-surface text-primary' : 'text-muted'}`}>JSON</button>
                                </div>

                                {builderMode === 'simple' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-muted uppercase mb-1">Template</label>
                                            <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="w-full bg-panel border-subtle rounded-md p-2 text-sm text-primary-text">
                                                <option value="openai">OpenAI Compatible</option>
                                                <option value="replicate">Replicate</option>
                                                <option value="fal">Fal.ai</option>
                                                <option value="comfy_local">ComfyUI (Local)</option>
                                                <option value="generic">Generic REST API</option>
                                            </select>
                                        </div>
                                        
                                        {/* Dynamic Fields based on Template */}
                                        {selectedTemplate === 'comfy_local' ? (
                                            <>
                                                <div><label className="block text-xs font-bold text-muted uppercase mb-1">Model Name</label><input type="text" value={simpleName} onChange={(e) => setSimpleName(e.target.value)} placeholder="My Workflow" className="w-full bg-panel border-subtle rounded-md p-2 text-sm text-primary-text" /></div>
                                                <div><label className="block text-xs font-bold text-muted uppercase mb-1">ComfyUI URL</label><input type="text" value={simpleUrl} onChange={(e) => setSimpleUrl(e.target.value)} placeholder="http://127.0.0.1:8188" className="w-full bg-panel border-subtle rounded-md p-2 text-sm text-primary-text" /></div>
                                                <div className="mt-4 p-4 border-2 border-dashed border-subtle rounded-lg hover:border-accent cursor-pointer text-center" onClick={() => fileInputRef.current?.click()}>
                                                    <UploadCloud className="mx-auto mb-2 text-muted" />
                                                    <p className="text-xs text-primary-text">Upload Workflow API (.json)</p>
                                                    <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleComfyUpload} />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div><label className="block text-xs font-bold text-muted uppercase mb-1">Model Name</label><input type="text" value={simpleName} onChange={(e) => setSimpleName(e.target.value)} className="w-full bg-panel border-subtle rounded-md p-2 text-sm text-primary-text" /></div>
                                                {selectedTemplate === 'generic' && (
                                                    <div>
                                                        <label className="block text-xs font-bold text-muted uppercase mb-1">Provider ID</label><input type="text" value={simpleProvider} onChange={(e) => setSimpleProvider(e.target.value)} placeholder="suno, runway..." className="w-full bg-panel border-subtle rounded-md p-2 text-sm text-primary-text" />
                                                        <label className="block text-xs font-bold text-muted uppercase mb-1 mt-2">Endpoint URL</label><input type="text" value={simpleUrl} onChange={(e) => setSimpleUrl(e.target.value)} className="w-full bg-panel border-subtle rounded-md p-2 text-sm text-primary-text" />
                                                    </div>
                                                )}
                                                <div className="mt-2"><label className="block text-xs font-bold text-muted uppercase mb-1">Model ID / Path</label><input type="text" value={simpleId} onChange={(e) => setSimpleId(e.target.value)} className="w-full bg-panel border-subtle rounded-md p-2 text-sm text-primary-text font-mono" /></div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {builderMode === 'curl' && (
                                    <div className="space-y-4">
                                        <p className="text-xs text-muted">Paste a cURL command from API docs to auto-generate the config.</p>
                                        <textarea value={curlInput} onChange={(e) => setCurlInput(e.target.value)} rows={8} className="w-full bg-panel border-subtle rounded-md p-2 text-xs font-mono text-primary-text" placeholder="curl -X POST..." />
                                        <button onClick={parseCurl} className="w-full py-2 bg-subtle text-primary-text text-xs font-bold rounded hover:bg-neutral-600 flex items-center justify-center gap-2"><Terminal size={14}/> Parse cURL</button>
                                    </div>
                                )}

                                {builderMode === 'advanced' && (
                                    <textarea value={advancedJson} onChange={(e) => setAdvancedJson(e.target.value)} rows={15} className="w-full bg-panel border-subtle rounded-md p-2 text-xs font-mono text-primary-text" />
                                )}

                                {builderMode !== 'curl' && (
                                    <button onClick={handleAddCustomModel} className="w-full mt-6 py-2 bg-primary text-neutral-900 font-bold text-sm rounded hover:bg-white transition-colors flex items-center justify-center gap-2"><Plus size={16}/> Save Model</button>
                                )}
                            </div>
                         </div>

                         <div className="lg:col-span-2 space-y-6">
                             {/* List of Custom Models */}
                             <div className="bg-surface border border-subtle rounded-xl p-6 h-full">
                                <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2"><Code2 className="text-accent" size={20} /> Custom Models</h2>
                                {customModels.length === 0 ? <div className="text-center text-muted py-10">No custom models added.</div> : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {customModels.map(model => (
                                            <div key={model.id} className="bg-panel border border-subtle rounded-lg p-4 relative group">
                                                <h3 className="font-bold text-primary text-sm">{model.name}</h3>
                                                <span className="text-[10px] uppercase font-bold text-muted block mt-1">{model.provider}</span>
                                                <button onClick={() => removeCustomModel(model.id)} className="absolute top-2 right-2 text-muted hover:text-red-400"><Trash2 size={14} /></button>
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