'use client';
import React, { useState, useEffect } from 'react';
import { useBookmarkStore } from '../../store/useBookmarkStore';
import type { ContentType } from '../../utils/mockData';
import { X, Sparkles, Loader2, Link2, Copy, FileText, Check, AlertCircle, Layers, Import } from 'lucide-react';
import { AnimatedDialog } from './AnimatedDialog';

interface AddBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddBookmarkModal: React.FC<AddBookmarkModalProps> = ({ isOpen, onClose }) => {
  const { collections, addBookmark } = useBookmarkStore();

  // Tab state: 'single' or 'bulk'
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

  // Single Link Fields
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [contentType, setContentType] = useState<ContentType>('website');
  const [tagsInput, setTagsInput] = useState('');
  const [readLater, setReadLater] = useState(false);
  const [isScraping, setIsScraping] = useState(false);

  // Bulk Import Fields
  const [bulkInput, setBulkInput] = useState('');
  const [bulkCollectionId, setBulkCollectionId] = useState('');
  const [bulkTagsInput, setBulkTagsInput] = useState('');
  const [bulkReadLater, setBulkReadLater] = useState(false);
  const [bulkAddedCount, setBulkAddedCount] = useState<number | null>(null);

  useEffect(() => {
    if (collections.length > 0) {
      if (!collectionId) setCollectionId(collections[0].id);
      if (!bulkCollectionId) setBulkCollectionId(collections[0].id);
    }
  }, [collections, collectionId, bulkCollectionId]);

  // Simulated metadata scraper for single link
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
        
        // Guess Content Type & Tags
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
          if (siteName.toLowerCase() === 'web') {
            setTagsInput('web');
          } else {
            setTagsInput(`${siteName}, web`);
          }
        }

      } catch (err) {
        // Ignore
      } finally {
        setIsScraping(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [url]);

  // Submit Single Link
  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !title) return;

    const tags = Array.from(
      new Set(
        tagsInput
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0)
      )
    );

    const faviconUrl = url ? `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64` : '';

    addBookmark({
      url,
      title,
      description,
      collectionId,
      type: contentType,
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=60', // Unused now but kept in type
      faviconUrl,
      tags,
      isFavorite: false,
      readLater,
    });

    // Reset single fields
    setUrl('');
    setTitle('');
    setDescription('');
    setTagsInput('');
    setReadLater(false);
    setContentType('website');
    onClose();
  };

  // Submit Bulk Import
  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkInput.trim()) return;

    // Parse links: split by lines or commas
    const rawLinks = bulkInput.split(/[\n,]/);
    let added = 0;

    const tags = Array.from(
      new Set(
        bulkTagsInput
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0)
      )
    );

    rawLinks.forEach((link) => {
      let cleanLink = link.trim();
      if (!cleanLink) return;

      // Add https protocol if missing
      if (!/^https?:\/\//i.test(cleanLink)) {
        cleanLink = `https://${cleanLink}`;
      }

      try {
        const parsed = new URL(cleanLink);
        const domain = parsed.hostname.toLowerCase();
        const cleanDomain = domain.replace('www.', '');
        const siteName = cleanDomain.split('.')[0];
        const capitalizedSite = siteName.charAt(0).toUpperCase() + siteName.slice(1);
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

        // Guess Content Type for each bulk link
        let type: ContentType = 'website';
        if (domain.includes('github.com') || domain.includes('gitlab.com')) {
          type = 'repository';
        } else if (domain.includes('youtube.com') || domain.includes('twitch.tv')) {
          type = 'video';
        } else if (domain.includes('medium.com') || domain.includes('blog')) {
          type = 'article';
        } else if (domain.includes('supabase.com') || domain.includes('vercel.com')) {
          type = 'tool';
        }

        addBookmark({
          url: cleanLink,
          title: `${capitalizedSite} - Saved Link`,
          description: `Bulk imported link from ${cleanDomain}.`,
          collectionId: bulkCollectionId,
          type,
          imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=60',
          faviconUrl,
          tags: tags.length > 0 ? tags : [siteName, 'imported'],
          isFavorite: false,
          readLater: bulkReadLater,
        });

        added++;
      } catch (err) {
        // Skip invalid URLs
      }
    });

    setBulkAddedCount(added);
    setBulkInput('');
    setBulkTagsInput('');
    
    // Auto-close after showing success message
    setTimeout(() => {
      setBulkAddedCount(null);
      onClose();
    }, 1800);
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
    <AnimatedDialog isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border-custom bg-surface-muted/30">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-brand-soft text-brand rounded-xl shadow-xs">
            <Sparkles size={18} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-main tracking-tight">Add to Vaultly</h2>
            <p className="text-[10px] text-text-muted mt-0.5">Save resources to your premium digital shelf.</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-text-muted hover:text-text-main p-1.5 rounded-xl hover:bg-surface-muted border border-transparent hover:border-border-custom/60 transition-all duration-150"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="px-6 pt-4">
        <div className="flex bg-surface-muted border border-border-custom p-1 rounded-2xl">
          <button
            onClick={() => { setActiveTab('single'); setBulkAddedCount(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'single'
                ? 'bg-surface text-brand shadow-sm border border-border-custom/60'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Link2 size={13} />
            <span>Single Link</span>
          </button>
          <button
            onClick={() => { setActiveTab('bulk'); setBulkAddedCount(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'bulk'
                ? 'bg-surface text-brand shadow-sm border border-border-custom/60'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Import size={13} />
            <span>Bulk Import</span>
          </button>
        </div>
      </div>

      {/* Content tabs */}
      {activeTab === 'single' ? (
        <form onSubmit={handleSingleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="url" className="text-xs font-bold text-text-muted">URL Address</label>
            <div className="relative">
              <input
                type="url"
                id="url"
                required
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-surface-muted border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              />
              {isScraping && (
                <span className="absolute inset-y-0 right-3 flex items-center text-brand">
                  <Loader2 size={14} className="animate-spin" />
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="title" className="text-xs font-bold text-text-muted">Title</label>
            <input
              type="text"
              id="title"
              required
              placeholder="e.g. Acme Website"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-surface-muted border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="text-xs font-bold text-text-muted">Description</label>
            <textarea
              id="description"
              placeholder="Provide a quick description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-surface-muted border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="collection" className="text-xs font-bold text-text-muted">Collection</label>
              <select
                id="collection"
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-muted border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              >
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="type" className="text-xs font-bold text-text-muted">Content Type</label>
              <select
                id="type"
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentType)}
                className="w-full px-3 py-2 bg-surface-muted border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              >
                {typesList.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="tags" className="text-xs font-bold text-text-muted">Tags</label>
              <span className="text-[9px] text-text-muted/65 font-mono">Comma separated values</span>
            </div>
            <input
              type="text"
              id="tags"
              placeholder="dev, utility, design..."
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-2 bg-surface-muted border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
            />
          </div>

          <div className="flex items-center gap-2 pt-1.5">
            <input
              type="checkbox"
              id="readLater"
              checked={readLater}
              onChange={(e) => setReadLater(e.target.checked)}
              className="w-4 h-4 rounded text-brand border-border-custom focus:ring-brand focus:ring-opacity-25 ml-1 cursor-pointer"
            />
            <label htmlFor="readLater" className="text-xs text-text-muted select-none cursor-pointer font-medium">
              Mark as <span className="text-text-main font-bold">Read Later</span>
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border-custom">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border-custom text-text-main hover:bg-surface-muted rounded-xl text-xs font-semibold transition-all duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand hover:bg-brand/90 text-white rounded-xl text-xs font-semibold transition-all duration-150 active:scale-95 cursor-pointer shadow-md shadow-brand/10"
            >
              Save Bookmark
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleBulkSubmit} className="p-6 space-y-4">
          {bulkAddedCount !== null ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-500/25">
                <Check size={24} />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-bold text-text-main">Bulk Import Completed</h3>
                <p className="text-xs text-text-muted mt-1">Successfully saved {bulkAddedCount} bookmarks!</p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="bulkInput" className="text-xs font-bold text-text-muted">Links List</label>
                  <span className="text-[9px] text-text-muted/65 font-mono">One link per line or comma separated</span>
                </div>
                <textarea
                  id="bulkInput"
                  required
                  placeholder="https://github.com&#10;https://google.com, https://twitter.com"
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-surface-muted border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="bulkCollection" className="text-xs font-bold text-text-muted">Collection</label>
                  <select
                    id="bulkCollection"
                    value={bulkCollectionId}
                    onChange={(e) => setBulkCollectionId(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-muted border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                  >
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="bulkTags" className="text-xs font-bold text-text-muted">Common Tags</label>
                  <input
                    type="text"
                    id="bulkTags"
                    placeholder="imported, quick..."
                    value={bulkTagsInput}
                    onChange={(e) => setBulkTagsInput(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-muted border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1.5">
                <input
                  type="checkbox"
                  id="bulkReadLater"
                  checked={bulkReadLater}
                  onChange={(e) => setBulkReadLater(e.target.checked)}
                  className="w-4 h-4 rounded text-brand border-border-custom focus:ring-brand focus:ring-opacity-25 ml-2 cursor-pointer"
                />
                <label htmlFor="bulkReadLater" className="text-xs text-text-muted select-none cursor-pointer font-medium">
                  Mark all as <span className="text-text-main font-bold">Read Later</span>
                </label>
              </div>

              {/* Helper info */}
              <div className="p-3 bg-brand-soft/30 border border-brand/10 rounded-xl text-[10px] text-text-muted flex items-start gap-2 leading-relaxed">
                <AlertCircle size={14} className="text-brand shrink-0 mt-0.5" />
                <span>
                  We will automatically parse all URLs, extract their domain names to guess their categories, and generate high-resolution favicon icons for each site!
                </span>
              </div>

              {/* Actions */}
              <div className="pt-4 flex justify-end gap-3 border-t border-border-custom">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-border-custom text-text-main hover:bg-surface-muted rounded-xl text-xs font-semibold transition-all duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand hover:bg-brand/90 text-white rounded-xl text-xs font-semibold transition-all duration-150 active:scale-95 cursor-pointer shadow-md shadow-brand/10"
                >
                  Import All Links
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </AnimatedDialog>
  );
};
