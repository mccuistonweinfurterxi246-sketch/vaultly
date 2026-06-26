'use client';
import React, { useState, useEffect } from 'react';
import { useBookmarkStore } from '../../store/useBookmarkStore';
import type { ContentType } from '../../utils/mockData';
import { X, Sparkles, Loader2 } from 'lucide-react';

interface AddBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddBookmarkModal: React.FC<AddBookmarkModalProps> = ({ isOpen, onClose }) => {
  const { collections, addBookmark } = useBookmarkStore();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [contentType, setContentType] = useState<ContentType>('website');
  const [tagsInput, setTagsInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [readLater, setReadLater] = useState(false);
  const [isScraping, setIsScraping] = useState(false);

  useEffect(() => {
    if (collections.length > 0 && !collectionId) {
      setCollectionId(collections[0].id);
    }
  }, [collections, collectionId]);

  // Simulated metadata scraper
  useEffect(() => {
    if (!url) return;
    
    const isCompleteUrl = /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(url);
    if (!isCompleteUrl) return;

    setIsScraping(true);
    const timer = setTimeout(() => {
      try {
        const parsed = new URL(url);
        const domain = parsed.hostname.toLowerCase();
        const cleanDomain = domain.replace('www.', '');
        const siteName = cleanDomain.split('.')[0];
        const capitalizedSite = siteName.charAt(0).toUpperCase() + siteName.slice(1);

        // Autofill details
        setTitle(`${capitalizedSite} - Official Platform`);
        setDescription(`Quick access to ${capitalizedSite}. Explore details, documents, and interactive resources from the ${cleanDomain} domain.`);
        setImageUrl(`https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=60`);
        
        // Guess Content Type
        if (domain.includes('github.com') || domain.includes('gitlab.com')) {
          setContentType('repository');
          setTagsInput('repo, code, dev');
        } else if (domain.includes('youtube.com') || domain.includes('vimeo.com') || domain.includes('twitch.tv')) {
          setContentType('video');
          setTagsInput('video, watch');
        } else if (domain.includes('medium.com') || domain.includes('dev.to') || domain.includes('blog')) {
          setContentType('article');
          setTagsInput('article, read');
        } else if (domain.includes('figma.com') || domain.includes('dribbble.com') || domain.includes('unsplash.com')) {
          setContentType('image');
          setTagsInput('design, asset, ui');
        } else if (domain.includes('supabase.com') || domain.includes('vercel.com') || domain.includes('npm')) {
          setContentType('tool');
          setTagsInput('tool, devops');
        } else {
          setContentType('website');
          setTagsInput(`${siteName}, web`);
        }

      } catch (err) {
        // Ignore
      } finally {
        setIsScraping(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [url]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !title) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const faviconUrl = url ? `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64` : '';

    addBookmark({
      url,
      title,
      description,
      collectionId,
      type: contentType,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=60',
      faviconUrl,
      tags,
      isFavorite: false,
      readLater,
    });

    // Reset fields
    setUrl('');
    setTitle('');
    setDescription('');
    setTagsInput('');
    setImageUrl('');
    setReadLater(false);
    setContentType('website');
    onClose();
  };

  const typesList: { value: ContentType; label: string }[] = [
    { value: 'website', label: 'Website' },
    { value: 'video', label: 'Video' },
    { value: 'article', label: 'Article' },
    { value: 'tool', label: 'Tool' },
    { value: 'course', label: 'Course' },
    { value: 'document', label: 'Document' },
    { value: 'image', label: 'Image' },
    { value: 'repository', label: 'Repository' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-surface border border-border-custom rounded-xl shadow-lg overflow-hidden z-10 transition-colors duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-custom">
          <h2 className="text-sm font-semibold text-text-main flex items-center gap-2">
            <Sparkles className="text-brand" size={16} />
            Save New Link
          </h2>
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-text-main p-1 rounded-lg hover:bg-surface-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* URL */}
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Link URL
            </label>
            <div className="relative">
              <input
                type="url"
                required
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border-custom rounded-lg text-xs text-text-main focus:outline-none focus:border-brand transition-colors"
              />
              {isScraping && (
                <span className="absolute inset-y-0 right-3 flex items-center text-brand">
                  <Loader2 size={14} className="animate-spin" />
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Supabase - Next-gen Backend"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border-custom rounded-lg text-xs text-text-main focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              placeholder="Summary of the link..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-surface border border-border-custom rounded-lg text-xs text-text-main focus:outline-none focus:border-brand transition-colors resize-none"
            />
          </div>

          {/* Collection & Content Type Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Collection
              </label>
              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border-custom rounded-lg text-xs text-text-main focus:outline-none focus:border-brand transition-colors"
              >
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentType)}
                className="w-full px-3 py-2 bg-surface border border-border-custom rounded-lg text-xs text-text-main focus:outline-none focus:border-brand transition-colors"
              >
                {typesList.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Tags (comma separated)
            </label>
            <input
              type="text"
              placeholder="react, library, tools"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border-custom rounded-lg text-xs text-text-main focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          {/* Custom Image URL */}
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Preview Image URL (Optional)
            </label>
            <input
              type="text"
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border-custom rounded-lg text-xs text-text-main focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          {/* Read Later Checkbox */}
          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="readLater"
              checked={readLater}
              onChange={(e) => setReadLater(e.target.checked)}
              className="w-4 h-4 rounded text-brand border-border-custom focus:ring-brand focus:ring-opacity-25"
            />
            <label htmlFor="readLater" className="text-xs text-text-muted select-none cursor-pointer">
              Mark as **Read Later**
            </label>
          </div>

          {/* Submit */}
          <div className="pt-4 flex justify-end gap-2.5 border-t border-border-custom">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-main hover:bg-surface-muted transition-all duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4.5 py-1.5 bg-brand hover:bg-brand/90 text-white rounded-lg text-xs font-medium transition-all duration-150 active:scale-95 cursor-pointer"
            >
              Save Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
