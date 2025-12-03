
import React, { useState, useEffect } from 'react';
import { useShowrunnerStore } from '../../store/showrunnerStore';
import { ProjectFormat, ProjectStyle, ProjectFormatType, StyleOptions, AudienceOptions, AspectRatioOptions, GenreOptions, LanguageOptions } from '../../types';
import { File, UploadCloud, Film, MonitorPlay, Mic2, Tv, Theater, Video } from 'lucide-react';

interface ProjectWizardProps {
  onClose: () => void;
}

const ProjectWizard: React.FC<ProjectWizardProps> = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const createNewProject = useShowrunnerStore((state) => state.createNewProject);

  // State for all project details
  const [name, setName] = useState('');
  const [logline, setLogline] = useState('');
  const [formatType, setFormatType] = useState<ProjectFormatType>('SINGLE_STORY');
  const [seasonCount, setSeasonCount] = useState(1);
  const [episodeCount, setEpisodeCount] = useState(8);
  const [duration, setDuration] = useState('90');
  const [aspectRatio, setAspectRatio] = useState(AspectRatioOptions[0]);
  const [primaryStyle, setPrimaryStyle] = useState(StyleOptions[0]);
  const [secondaryStyle, setSecondaryStyle] = useState(StyleOptions[1]);
  const [customStyle, setCustomStyle] = useState('');
  // Set default to General Audience (index 4)
  const [audience, setAudience] = useState(AudienceOptions[4]);
  const [genre, setGenre] = useState(GenreOptions[0]);
  const [secondaryGenre, setSecondaryGenre] = useState(GenreOptions[1]);
  const [language, setLanguage] = useState(LanguageOptions[0]);
  const [supportingFiles, setSupportingFiles] = useState<globalThis.File[]>([]);
  const [supportingText, setSupportingText] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const processAllFiles = async () => {
        if (supportingFiles.length === 0) {
            setSupportingText('');
            return;
        }

        const readFileAsText = (file: File): Promise<string> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsText(file);
            });
        };

        let combinedText = '';
        for (const file of supportingFiles) {
            // SAFEGUARD: Only read text-based files for now.
            // Future updates can add handlers for pdf, docx (e.g. using mammoth.js), or audio transcription.
            const ext = file.name.split('.').pop()?.toLowerCase();
            
            if (ext === 'txt' || ext === 'md') {
                try {
                    const text = await readFileAsText(file);
                    combinedText += `\n\n--- START OF FILE: ${file.name} ---\n\n${text}\n\n--- END OF FILE: ${file.name} ---\n\n`;
                } catch (error) {
                    console.error(`Error reading file ${file.name}:`, error);
                }
            } else {
                console.log(`Skipping content read for ${file.name} (Type: ${ext}) - File stored for future processing.`);
            }
        }
        setSupportingText(combinedText);
    };

    processAllFiles();
  }, [supportingFiles]);

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleFinish = () => {
    const projectFormat: ProjectFormat = {
      type: formatType,
      seasonCount: formatType === 'EPISODIC' ? seasonCount : undefined,
      episodeCount: formatType === 'EPISODIC' ? episodeCount : 3, // Default to 3 acts for non-episodic
      duration: duration,
      aspectRatio: aspectRatio,
    };

    const projectStyle: ProjectStyle = {
      primary: primaryStyle,
      secondary: secondaryStyle,
      custom: customStyle,
      audience: audience,
      genre: genre,
      secondaryGenre: secondaryGenre,
      language: language,
    };
    
    createNewProject({
      name,
      logline,
      format: projectFormat,
      style: projectStyle,
      supportingText: supportingText,
    });
    onClose();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files && files.length > 0) {
      setSupportingFiles(prev => [...prev, ...files]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files && files.length > 0) {
          setSupportingFiles(prev => [...prev, ...files]);
      }
  };
  
  const handleRemoveFile = (indexToRemove: number) => {
    setSupportingFiles(files => files.filter((_, i) => i !== indexToRemove));
  };

  const renderFormatCard = (type: ProjectFormatType, label: string, desc: string, Icon: React.ElementType, defaultDuration: string) => (
      <div 
          onClick={() => { setFormatType(type); setDuration(defaultDuration); }} 
          className={`cursor-pointer p-4 rounded-lg border-2 flex flex-col items-center text-center transition-all ${formatType === type ? 'border-accent bg-accent/10 scale-[1.02]' : 'border-subtle bg-panel hover:border-muted'}`}
      >
          <Icon className={`w-8 h-8 mb-2 ${formatType === type ? 'text-accent' : 'text-muted'}`} />
          <h4 className="font-bold text-sm text-primary">{label}</h4>
          <p className="text-[10px] text-muted mt-1">{desc}</p>
      </div>
  );

  const renderStep = () => {
    switch (step) {
      case 1: // Step 1: Concept & Structure
        return (
          <div>
            <h3 className="text-xl font-bold text-primary mb-4">Step 1: Concept & Structure</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="projectName" className="block text-sm font-medium text-primary-text">Project Name</label>
                <input type="text" id="projectName" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full bg-neutral-700 border-subtle rounded-md shadow-sm p-3 text-primary-text focus:ring-accent focus:border-accent" />
              </div>
              <div>
                <label htmlFor="logline" className="block text-sm font-medium text-primary-text">Logline</label>
                <textarea id="logline" value={logline} onChange={(e) => setLogline(e.target.value)} rows={3} className="mt-1 block w-full bg-neutral-700 border-subtle rounded-md shadow-sm p-3 text-primary-text focus:ring-accent focus:border-accent" />
              </div>
               <div>
                  <label className="block text-sm font-medium text-primary-text">Supporting Files (Optional)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`mt-1 flex justify-center items-center flex-col px-6 pt-5 pb-6 border-2 ${isDragging ? 'border-accent' : 'border-subtle'} border-dashed rounded-md cursor-pointer hover:border-muted transition-colors`}>
                    <UploadCloud className="w-10 h-10 text-muted" />
                    <p className="mt-2 text-sm text-primary-text">
                        <span className="font-semibold">Drag & drop files here</span>, or click to select
                    </p>
                    <p className="text-xs text-muted">Supports txt, md, pdf, docx, audio, video & images.</p>
                    {/* Added expanded acceptance list */}
                    <input 
                        ref={fileInputRef} 
                        type="file" 
                        multiple 
                        className="hidden" 
                        onChange={handleFileSelect} 
                        accept=".txt,.md,text/plain,text/markdown,.pdf,.docx,.doc,.rtf,.mp3,.wav,.mp4,.mov,.avi,.jpg,.jpeg,.png,.json,.csv,.xlsx" 
                    />
                  </div>
                   {supportingFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium text-primary-text">Attached Files:</p>
                        <ul className="text-xs text-muted space-y-1">
                          {supportingFiles.map((file, index) => (
                              <li key={index} className="flex items-center gap-2 bg-panel p-2 rounded-md">
                                  <File className="w-4 h-4 text-primary-text" />
                                  <span className="truncate flex-1">{file.name}</span>
                                  <button onClick={() => handleRemoveFile(index)} className="text-red-400 hover:text-red-300">X</button>
                              </li>
                          ))}
                        </ul>
                      </div>
                  )}
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-text mb-2">Format</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {renderFormatCard('EPISODIC', 'Episodic Series', 'Multiple seasons & episodes', Tv, '22')}
                    {renderFormatCard('SINGLE_STORY', 'Feature Film', 'Single narrative, sequel potential', Film, '90')}
                    {renderFormatCard('NARRATED_VIDEO', 'Narrated / Doc', 'Voiceover-driven content', Mic2, '10')}
                    {renderFormatCard('MUSIC_VIDEO', 'Music Video', 'Visuals synced to audio', Video, '4')}
                    {renderFormatCard('PRODUCT_VIDEO', 'Product Video', 'Commercials & showcases', MonitorPlay, '1')}
                    {renderFormatCard('STAGE_PLAY', 'Stage Play', 'Theatrical production', Theater, '120')}
                </div>
              </div>
              {formatType === 'EPISODIC' ? (
                <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="seasons" className="block text-sm font-medium text-primary-text">Seasons</label>
                      <input type="number" id="seasons" value={seasonCount} onChange={(e) => setSeasonCount(Number(e.target.value))} min="1" className="mt-1 block w-full bg-neutral-700 border-subtle rounded-md shadow-sm p-3 text-primary-text focus:ring-accent focus:border-accent" />
                    </div>
                    <div>
                      <label htmlFor="episodes" className="block text-sm font-medium text-primary-text">Episodes / Season</label>
                      <input type="number" id="episodes" value={episodeCount} onChange={(e) => setEpisodeCount(Number(e.target.value))} min="1" className="mt-1 block w-full bg-neutral-700 border-subtle rounded-md shadow-sm p-3 text-primary-text focus:ring-accent focus:border-accent" />
                    </div>
                     <div>
                      <label htmlFor="duration" className="block text-sm font-medium text-primary-text">Duration (mins)</label>
                      <input type="number" id="duration" value={duration} onChange={(e) => setDuration(e.target.value)} min="1" className="mt-1 block w-full bg-neutral-700 border-subtle rounded-md shadow-sm p-3 text-primary-text focus:ring-accent focus:border-accent" />
                    </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="runtime" className="block text-sm font-medium text-primary-text">Total Runtime (minutes)</label>
                  <input type="number" id="runtime" value={duration} onChange={(e) => setDuration(e.target.value)} min="1" className="mt-1 block w-full bg-neutral-700 border-subtle rounded-md shadow-sm p-3 text-primary-text focus:ring-accent focus:border-accent" />
                </div>
              )}
            </div>
          </div>
        );
      case 2: // Step 2: The Aesthetic
        return (
          <div>
            <h3 className="text-xl font-bold text-primary mb-4">Step 2: The Aesthetic</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="genre" className="block text-sm font-medium text-primary-text">Genre</label>
                  <select id="genre" value={genre} onChange={e => setGenre(e.target.value)} className="mt-1 block w-full bg-neutral-700 border-subtle rounded-md p-3 text-primary-text focus:ring-accent focus:border-accent">
                    {GenreOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="secondaryGenre" className="block text-sm font-medium text-primary-text">Secondary Genre</label>
                  <select id="secondaryGenre" value={secondaryGenre} onChange={e => setSecondaryGenre(e.target.value)} className="mt-1 block w-full bg-neutral-700 border-subtle rounded-md p-3 text-primary-text focus:ring-accent focus:border-accent">
                    {GenreOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="primaryStyle" className="block text-sm font-medium text-primary-text">Primary Visual Style</label>
                  <select id="primaryStyle" value={primaryStyle} onChange={e => setPrimaryStyle(e.target.value)} className="mt-1 block w-full bg-neutral-700 border-subtle rounded-md p-3 text-primary-text focus:ring-accent focus:border-accent">
                    {StyleOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="secondaryStyle" className="block text-sm font-medium text-primary-text">Secondary Visual Style</label>
                  <select id="secondaryStyle" value={secondaryStyle} onChange={e => setSecondaryStyle(e.target.value)} className="mt-1 block w-full bg-neutral-700 border-subtle rounded-md p-3 text-primary-text focus:ring-accent focus:border-accent">
                    {StyleOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="customStyle" className="block text-sm font-medium text-primary-text">Custom Mood/Style Keywords</label>
                <input type="text" id="customStyle" value={customStyle} onChange={e => setCustomStyle(e.target.value)} placeholder="e.g. Wes Anderson colors, cyberpunk lighting" className="mt-1 block w-full bg-neutral-700 border-subtle rounded-md p-3 text-primary-text focus:ring-accent focus:border-accent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="aspectRatio" className="block text-sm font-medium text-primary-text">Aspect Ratio</label>
                    <select id="aspectRatio" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="mt-1 block w-full bg-neutral-700 border-subtle rounded-md p-3 text-primary-text focus:ring-accent focus:border-accent">
                        {AspectRatioOptions.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="audience" className="block text-sm font-medium text-primary-text">Target Audience</label>
                    <select id="audience" value={audience} onChange={e => setAudience(e.target.value)} className="mt-1 block w-full bg-neutral-700 border-subtle rounded-md p-3 text-primary-text focus:ring-accent focus:border-accent">
                        {AudienceOptions.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-primary-text">Production Language</label>
                  <select id="language" value={language} onChange={e => setLanguage(e.target.value)} className="mt-1 block w-full bg-neutral-700 border-subtle rounded-md p-3 text-primary-text focus:ring-accent focus:border-accent">
                    {LanguageOptions.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
      case 3: // Step 3: Review
        return (
          <div>
            <h3 className="text-xl font-bold text-primary mb-4">Step 3: Review & Launch</h3>
            <div className="space-y-3 text-sm bg-panel p-4 rounded-lg border border-subtle">
                <p><strong className="text-muted">Name:</strong> {name}</p>
                <p><strong className="text-muted">Logline:</strong> {logline}</p>
                <p><strong className="text-muted">Format:</strong> {formatType === 'EPISODIC' ? `${seasonCount} Season(s), ${episodeCount} episodes per season` : formatType.replace('_', ' ')}</p>
                <p><strong className="text-muted">Duration:</strong> {duration} minutes {formatType === 'EPISODIC' ? `per episode` : 'total'}</p>
                <p><strong className="text-muted">Genre:</strong> {genre} ({secondaryGenre})</p>
                <p><strong className="text-muted">Style:</strong> {primaryStyle} meets {secondaryStyle}</p>
                <p><strong className="text-muted">Audience:</strong> {audience}</p>
                <p><strong className="text-muted">Aspect Ratio:</strong> {aspectRatio}</p>
                <p><strong className="text-muted">Language:</strong> {language}</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-surface border border-subtle rounded-xl shadow-2xl w-full max-w-2xl p-8 overflow-y-auto max-h-[90vh]">
        {renderStep()}
        <div className="mt-8 flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-primary-text bg-panel rounded-md hover:bg-subtle">Cancel</button>
          <div className="flex gap-4">
            {step > 1 && <button onClick={handleBack} className="px-4 py-2 text-sm font-medium text-primary-text bg-panel rounded-md hover:bg-subtle">Back</button>}
            {step < 3 && <button onClick={handleNext} disabled={!name || !logline} className="px-5 py-2 text-sm font-bold text-neutral-900 bg-primary rounded-md hover:bg-slate-200 disabled:bg-neutral-600 disabled:text-neutral-400 disabled:cursor-not-allowed">Next</button>}
            {step === 3 && <button onClick={handleFinish} className="px-5 py-2 text-sm font-bold text-neutral-900 bg-primary rounded-md hover:bg-slate-200">Create Project</button>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectWizard;