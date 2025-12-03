import React, { useState, useEffect, useRef } from 'react';
import { useShowrunnerStore } from '../../store/showrunnerStore';
import { ScreenplayItem } from '../../types';
import { PlusCircle, Trash2 } from 'lucide-react';

// Read-only viewer for places like The Studio
export const ScreenplayViewer: React.FC<{ content: ScreenplayItem[], isEditable: false }> = ({ content }) => (
    <div className="font-mono text-sm text-primary-text space-y-2 pr-4">
        {content.map((item, index) => item ? <ReadOnlyScreenplayLine key={`${index}-${item.type}`} item={item} />: null)}
    </div>
);

const ReadOnlyScreenplayLine: React.FC<{ item: ScreenplayItem }> = ({ item }) => {
    switch (item.type) {
        case 'action': return <p className="mb-1 whitespace-pre-wrap">{item.text}</p>;
        case 'character': return <p className="text-center font-bold uppercase mt-2 mb-0.5">{item.text}</p>;
        case 'dialogue': return <p className="text-center w-10/12 mx-auto whitespace-pre-wrap">{item.text}</p>;
        case 'parenthetical': return <p className="text-center text-muted text-xs">({item.text})</p>;
        default: return null;
    }
};

// Editable viewer for the Scriptwriter
export const EditableScreenplayViewer: React.FC<{ content: ScreenplayItem[], isEditable: boolean, parentItemId: string, sceneId: string }> = ({ content, isEditable, parentItemId, sceneId }) => {
    const { addScreenplayLine } = useShowrunnerStore.getState();
    return (
        <div className="font-mono text-sm text-primary-text space-y-1">
            {content.map((item, index) => (
                <EditableScreenplayLine 
                    key={`${sceneId}-${index}-${item.type}`} 
                    item={item} 
                    index={index}
                    isEditable={isEditable} 
                    parentItemId={parentItemId} 
                    sceneId={sceneId}
                />
            ))}
             {isEditable && (
                 <div className="mt-4">
                    <button 
                        onClick={() => addScreenplayLine(parentItemId, sceneId, content.length -1, 'action')}
                        className="w-full flex items-center justify-center gap-2 text-xs text-muted hover:text-primary-text border-2 border-dashed border-subtle hover:border-muted rounded-lg p-2 transition-colors"
                    >
                        <PlusCircle size={14}/> Add Line
                    </button>
                 </div>
            )}
        </div>
    );
};

const EditableScreenplayLine: React.FC<{ item: ScreenplayItem, index: number, isEditable: boolean, parentItemId: string, sceneId: string }> = ({ item, index, isEditable, parentItemId, sceneId }) => {
    const { updateScreenplayLine, deleteScreenplayLine, addScreenplayLine } = useShowrunnerStore.getState();
    const [isEditing, setIsEditing] = useState(item.text === '');
    const [text, setText] = useState(item.text);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [isEditing, item.type]);
    
    useEffect(() => {
        setText(item.text);
    }, [item.text]);

    const handleSave = () => {
        if (text !== item.text) {
            updateScreenplayLine(parentItemId, sceneId, index, text);
        }
        setIsEditing(false);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
        if (textareaRef.current) {
             textareaRef.current.style.height = 'auto';
             textareaRef.current.style.height = `${e.target.scrollHeight}px`;
        }
    };
    
    const lineClasses = {
        action: 'whitespace-pre-wrap',
        character: 'text-center font-bold uppercase mt-2 mb-0.5',
        dialogue: 'text-center w-10/12 mx-auto whitespace-pre-wrap',
        parenthetical: 'text-center text-muted text-xs'
    };
    
    const editableClasses = isEditable ? 'hover:bg-panel rounded-md' : '';

    return (
        <div className={`relative group ${lineClasses[item.type]} ${editableClasses}`}>
            {isEditable && (
                <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => addScreenplayLine(parentItemId, sceneId, index, 'action')} className="p-1 text-muted hover:text-primary rounded-full hover:bg-surface">
                        <PlusCircle size={14} />
                    </button>
                    <button onClick={() => deleteScreenplayLine(parentItemId, sceneId, index)} className="p-1 text-muted hover:text-red-400 rounded-full hover:bg-surface">
                        <Trash2 size={14} />
                    </button>
                </div>
            )}

            {isEditable && isEditing ? (
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={handleTextChange}
                    onBlur={handleSave}
                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); } }}
                    className={`w-full bg-surface border border-accent rounded-md p-1 resize-none overflow-hidden ${lineClasses[item.type]}`}
                />
            ) : (
                <p onClick={() => isEditable && setIsEditing(true)} className="min-h-[24px] cursor-text w-full">
                    {item.type === 'parenthetical' ? `(${item.text || '...'})` : item.text || '...'}
                </p>
            )}
        </div>
    );
};