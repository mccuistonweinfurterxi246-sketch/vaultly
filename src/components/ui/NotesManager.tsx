'use client';
import React, { useState, useMemo } from 'react';
import { useBookmarkStore } from '../../store/useBookmarkStore';
import { FileText, Plus, Trash2, Edit3, Check, Palette, ExternalLink, Calendar } from 'lucide-react';

export const NotesManager: React.FC = () => {
  const { notes, addNote, deleteNote, updateNote, searchQuery } = useBookmarkStore();
  
  const [quickTitle, setQuickTitle] = useState('');
  const [quickContent, setQuickContent] = useState('');
  const [selectedColor, setSelectedColor] = useState('oklch(0.95 0.02 150)'); // Default pastel green
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Pastel colors for sticky notes
  const colorOptions = [
    { value: 'oklch(0.95 0.02 150)', label: 'Green', border: 'oklch(0.85 0.05 150)' },
    { value: 'oklch(0.95 0.02 70)', label: 'Yellow', border: 'oklch(0.85 0.05 70)' },
    { value: 'oklch(0.94 0.02 200)', label: 'Blue', border: 'oklch(0.84 0.05 200)' },
    { value: 'oklch(0.94 0.02 300)', label: 'Purple', border: 'oklch(0.84 0.05 300)' },
    { value: 'oklch(0.94 0.02 20)', label: 'Pink', border: 'oklch(0.84 0.05 20)' }
  ];

  // Helper to convert URLs in text to HTML links
  const renderContentWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a 
            key={i} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-brand hover:underline inline-flex items-center gap-0.5 font-medium break-all"
          >
            {part.replace(/https?:\/\/(www\.)?/, '')}
            <ExternalLink size={10} className="inline-block" />
          </a>
        );
      }
      return part;
    });
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickContent.trim()) return;

    addNote({
      title: quickTitle.trim() || 'Untitled Note',
      content: quickContent.trim(),
      color: selectedColor
    });

    setQuickTitle('');
    setQuickContent('');
  };

  const handleStartEdit = (id: string, title: string, content: string) => {
    setEditingId(id);
    setEditTitle(title);
    setEditContent(content);
  };

  const handleSaveEdit = (id: string) => {
    updateNote(id, {
      title: editTitle.trim() || 'Untitled Note',
      content: editContent.trim()
    });
    setEditingId(null);
  };

  // Filter notes based on search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes;
    const query = searchQuery.toLowerCase();
    return notes.filter(n => 
      n.title.toLowerCase().includes(query) ||
      n.content.toLowerCase().includes(query)
    );
  }, [notes, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Quick Note Creator (1-Click Creation) */}
      <form 
        onSubmit={handleCreateNote} 
        className="bg-surface border border-border-custom rounded-2xl p-5 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between border-b border-border-custom/60 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="text-brand" size={16} />
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Create Quick Note</span>
          </div>
          {/* Color Picker */}
          <div className="flex items-center gap-1.5">
            {colorOptions.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setSelectedColor(color.value)}
                className="w-4 h-4 rounded-full border transition-transform duration-150 cursor-pointer hover:scale-110 active:scale-95"
                style={{ 
                  backgroundColor: color.value, 
                  borderColor: selectedColor === color.value ? 'var(--accent)' : 'transparent',
                  boxShadow: selectedColor === color.value ? '0 0 0 1px var(--background), 0 0 0 2px var(--accent)' : 'none'
                }}
                title={color.label}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Note title (optional)..."
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-text-main placeholder-text-muted/50 border-none p-0 focus:outline-none focus:ring-0"
          />
          <textarea
            placeholder="Write your note here... (Paste URLs to make them clickable)"
            value={quickContent}
            onChange={(e) => setQuickContent(e.target.value)}
            rows={2}
            className="w-full bg-transparent text-xs text-text-main placeholder-text-muted/50 border-none p-0 focus:outline-none focus:ring-0 resize-none leading-relaxed"
            required
          />
        </div>

        <div className="flex justify-end pt-2 border-t border-border-custom/50">
          <button
            type="submit"
            disabled={!quickContent.trim()}
            className="flex items-center gap-1 px-4 py-1.5 bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:hover:bg-brand text-white rounded-xl text-xs font-medium transition-all duration-150 active:scale-95 cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>Save Note</span>
          </button>
        </div>
      </form>

      {/* Notes Grid */}
      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredNotes.map((note) => {
            const isEditing = editingId === note.id;
            const noteBg = note.color || 'oklch(0.95 0.02 150)';

            return (
              <div 
                key={note.id}
                className="rounded-2xl border p-5 flex flex-col justify-between h-[200px] transition-all duration-300 hover:scale-101 hover:shadow-xs"
                style={{ 
                  backgroundColor: noteBg, 
                  borderColor: 'rgba(0, 0, 0, 0.05)',
                  color: 'oklch(0.20 0.01 70)' // Always dark text for pastel readability
                }}
              >
                {isEditing ? (
                  /* Edit Mode */
                  <div className="flex-grow flex flex-col space-y-2.5 h-full">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="bg-transparent font-semibold text-xs border-b border-black/10 pb-1 focus:outline-none w-full"
                      autoFocus
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="bg-transparent text-[11px] leading-relaxed resize-none flex-grow focus:outline-none w-full"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => handleSaveEdit(note.id)}
                        className="p-1 bg-black/5 hover:bg-black/10 rounded-lg transition-colors"
                        title="Save changes"
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Read Mode */
                  <div className="flex-grow flex flex-col h-full justify-between">
                    <div className="space-y-2">
                      {/* Note Title */}
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-xs text-black/80 line-clamp-1 flex-grow">
                          {note.title}
                        </h3>
                        <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStartEdit(note.id, note.title, note.content)}
                            className="p-1 hover:bg-black/5 rounded-md transition-colors"
                            title="Edit note"
                          >
                            <Edit3 size={11} />
                          </button>
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="p-1 hover:bg-black/5 hover:text-rose-700 rounded-md transition-colors"
                            title="Delete note"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Note Content */}
                      <p className="text-[11px] text-black/70 leading-relaxed overflow-y-auto max-h-[100px] whitespace-pre-line pr-1 scrollbar-thin">
                        {renderContentWithLinks(note.content)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Note Footer: Date */}
                {!isEditing && (
                  <div className="mt-4 pt-2 border-t border-black/5 flex items-center justify-between text-[9px] text-black/45 font-mono">
                    <div className="flex items-center gap-1">
                      <Calendar size={10} />
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                    {/* Tiny Color Dot Indicator */}
                    <div className="flex gap-1">
                      {colorOptions.map(c => (
                        <button
                          key={c.value}
                          onClick={() => updateNote(note.id, { color: c.value })}
                          className="w-2 h-2 rounded-full border border-black/10 hover:scale-125 transition-transform"
                          style={{ backgroundColor: c.value }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3.5">
          <div className="p-4 bg-surface border border-border-custom rounded-full text-text-muted/60 shadow-xs">
            <FileText size={32} />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-text-main">No notes saved</h3>
            <p className="text-xs text-text-muted max-w-[280px]">
              Use the Quick Creator at the top to save your thoughts, text snippets, or copy-pasted links in 1 click!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
