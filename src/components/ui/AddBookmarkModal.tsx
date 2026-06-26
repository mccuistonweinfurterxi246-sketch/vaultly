'use client';
import React, { useState, useEffect } from 'react';
import { useBookmarkStore } from '../../store/useBookmarkStore';
import type { ContentType } from '../../utils/mockData';
import { X, Sparkles, Loader2, Link2, Copy, FileText, Check, AlertCircle, Layers, Import } from 'lucide-react';

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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Premium backdrop blur */}
      <div 
        className="absolute inset-0 bg-background/70 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Breathtaking Futuristic Modal Card */}
      <div className="relative w-full max-w-lg bg-surface border border-border-custom/80 rounded-3xl shadow-2xl overflow-hidden z-10 transition-all duration-300 transform scale-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Decorative Top Ambient Light */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand to-transparent opacity-80" />

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
              <Link2 size={14} />
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
              <Import size={14} />
              <span>Bulk Import</span>
            </button>
          </div>
        </div>

        {/* TAB 1: SINGLE LINK FORM */}
        {activeTab === 'single' && (
          <form onSubmit={handleSingleSubmit} className="p-6 space-y-4">
            {/* URL Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Link URL *
              </label>
              <div className="relative group">
                <input
                  type="url"
                  required
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-surface border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder-text-muted/50"
                />
                {isScraping ? (
                  <span className="absolute inset-y-0 right-3 flex items-center text-brand">
                    <Loader2 size={14} className="animate-spin" />
                  </span>
                ) : (
                  <Link2 size={14} className="absolute right-3 top-3 text-text-muted/50 group-focus-within:text-brand transition-colors" />
                )}
              </div>
            </div>

            {/* Title Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Supabase - Next-gen Backend"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder-text-muted/50"
              />
            </div>

            {/* Description Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Description
              </label>
              <textarea
                placeholder="Summary of the link..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 bg-surface border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder-text-muted/50 resize-none leading-relaxed"
              />
            </div>

            {/* Collection & Content Type Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Collection
                </label>
                <select
                  value={collectionId}
                  onChange={(e) => setCollectionId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-surface border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:border-brand transition-all cursor-pointer"
                >
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Content Type
                </label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as ContentType)}
                  className="w-full px-3 py-2.5 bg-surface border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:border-brand transition-all cursor-pointer"
                >
                  {typesList.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Tags (comma separated)
              </label>
              <input
                type="text"
                placeholder="react, library, tools"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder-text-muted/50"
              />
            </div>

            {/* Read Later Checkbox */}
            <div className="flex items-center gap-2.5 py-1.5 px-1 bg-surface-muted/40 border border-border-custom/50 rounded-xl">
              <input
                type="checkbox"
                id="readLater"
                checked={readLater}
                onChange={(e) => setReadLater(e.target.checked)}
                className="w-4 h-4 rounded text-brand border-border-custom focus:ring-brand focus:ring-opacity-25 ml-2 cursor-pointer"
              />
              <label htmlFor="readLater" className="text-xs text-text-muted select-none cursor-pointer font-medium">
                Mark as <span className="text-text-main font-bold">Read Later</span>
              </label>
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
                Save Link
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: BULK IMPORT FORM */}
        {activeTab === 'bulk' && (
          <form onSubmit={handleBulkSubmit} className="p-6 space-y-4">
            {bulkAddedCount !== null ? (
              /* Satisfaction Bulk Success Message */
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                  <Check size={32} className="animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-text-main">Bulk Import Successful!</h3>
                  <p className="text-xs text-text-muted">
                    Successfully added <span className="text-emerald-600 font-bold">{bulkAddedCount}</span> links to your shelf.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Bulk Textarea */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      Paste Website Links *
                    </label>
                    <span className="text-[10px] text-text-muted font-medium">One link per line or comma-separated</span>
                  </div>
                  <textarea
                    required
                    placeholder="https://google.com&#10;https://github.com&#10;youtube.com"
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2.5 bg-surface border border-border-custom rounded-xl text-xs text-text-main font-mono placeholder-text-muted/40 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all leading-relaxed"
                  />
                </div>

                {/* Collection & Bulk Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      Target Collection
                    </label>
                    <select
                      value={bulkCollectionId}
                      onChange={(e) => setBulkCollectionId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-surface border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:border-brand transition-all cursor-pointer"
                    >
                      {collections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      Tags for all links
                    </label>
                    <input
                      type="text"
                      placeholder="imported, quick"
                      value={bulkTagsInput}
                      onChange={(e) => setBulkTagsInput(e.target.value)}
                      className="w-full px-3 py-2.5 bg-surface border border-border-custom rounded-xl text-xs text-text-main focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder-text-muted/50"
                    />
                  </div>
                </div>

                {/* Read Later Checkbox */}
                <div className="flex items-center gap-2.5 py-1.5 px-1 bg-surface-muted/40 border border-border-custom/50 rounded-xl">
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
      </div>
    </div>
  );
};
