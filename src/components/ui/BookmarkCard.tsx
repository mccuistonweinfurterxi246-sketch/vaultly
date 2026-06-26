'use client';
import React from 'react';
import type { Bookmark, ContentType } from '../../utils/mockData';
import { useBookmarkStore } from '../../store/useBookmarkStore';
import { 
  Heart, 
  Trash2, 
  ExternalLink, 
  Eye, 
  Archive, 
  Clock,
  Globe, 
  Video, 
  BookOpen, 
  Cpu, 
  GraduationCap, 
  FileText, 
  Image as ImageIcon, 
  Code, 
  Link as LinkIcon 
} from 'lucide-react';

interface BookmarkCardProps {
  bookmark: Bookmark;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({ bookmark }) => {
  const { 
    deleteBookmark, 
    incrementClickCount, 
    collections,
    viewMode,
    toggleFavoriteBookmark,
    toggleArchiveBookmark,
    toggleReadLaterBookmark
  } = useBookmarkStore();

  const collection = collections.find((c) => c.id === bookmark.collectionId);

  const handleLinkClick = () => {
    incrementClickCount(bookmark.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteBookmark(bookmark.id);
  };

  const getHostname = (urlStr: string) => {
    try {
      return new URL(urlStr).hostname.replace('www.', '');
    } catch {
      return urlStr;
    }
  };

  // Maps content type to a clean outline icon
  const getTypeIcon = (type: ContentType) => {
    const iconProps = { size: 14, className: "text-text-muted" };
    switch (type) {
      case 'website': return <Globe {...iconProps} />;
      case 'video': return <Video {...iconProps} />;
      case 'article': return <BookOpen {...iconProps} />;
      case 'tool': return <Cpu {...iconProps} />;
      case 'course': return <GraduationCap {...iconProps} />;
      case 'document': return <FileText {...iconProps} />;
      case 'image': return <ImageIcon {...iconProps} />;
      case 'repository': return <Code {...iconProps} />;
      default: return <LinkIcon {...iconProps} />;
    }
  };

  // Renders the common tags
  const renderTags = () => {
    if (bookmark.tags.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1">
        {bookmark.tags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-text-muted border border-border-custom/40 font-mono"
          >
            #{tag}
          </span>
        ))}
      </div>
    );
  };

  // Renders the common action buttons
  const renderActions = () => {
    return (
      <div className="flex items-center gap-1">
        {/* Favorite */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleFavoriteBookmark(bookmark.id); }}
          className={`p-1.5 rounded-md hover:bg-surface-muted transition-all duration-150 cursor-pointer ${
            bookmark.isFavorite ? 'text-rose-500' : 'text-text-muted hover:text-text-main'
          }`}
          title={bookmark.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        >
          <Heart size={14} fill={bookmark.isFavorite ? 'currentColor' : 'none'} />
        </button>

        {/* Read Later */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleReadLaterBookmark(bookmark.id); }}
          className={`p-1.5 rounded-md hover:bg-surface-muted transition-all duration-150 cursor-pointer ${
            bookmark.readLater ? 'text-brand font-semibold' : 'text-text-muted hover:text-text-main'
          }`}
          title={bookmark.readLater ? 'Remove from Read Later' : 'Mark as Read Later'}
        >
          <Clock size={14} fill={bookmark.readLater ? 'currentColor' : 'none'} />
        </button>

        {/* Archive */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleArchiveBookmark(bookmark.id); }}
          className={`p-1.5 rounded-md hover:bg-surface-muted transition-all duration-150 cursor-pointer ${
            bookmark.isArchived ? 'text-amber-600' : 'text-text-muted hover:text-text-main'
          }`}
          title={bookmark.isArchived ? 'Unarchive Bookmark' : 'Archive Bookmark'}
        >
          <Archive size={14} />
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={handleDelete}
          className="p-1.5 rounded-md text-text-muted hover:text-red-500 hover:bg-red-500/5 transition-all duration-150 cursor-pointer"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  };

  // 1. LIST VIEW MODE
  if (viewMode === 'list') {
    return (
      <div className="group bg-surface border border-border-custom hover:border-brand/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 hover:shadow-sm">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Favicon / Content Type Icon */}
          <div className="p-2 bg-surface-muted rounded-lg flex-shrink-0">
            {bookmark.faviconUrl ? (
              <img
                src={bookmark.faviconUrl}
                alt=""
                className="w-4 h-4 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              getTypeIcon(bookmark.type)
            )}
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-muted font-mono truncate">{getHostname(bookmark.url)}</span>
              {collection && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-md font-medium" style={{ backgroundColor: `${collection.color}15`, color: collection.color }}>
                  {collection.name}
                </span>
              )}
            </div>
            <h3 className="text-xs font-semibold text-text-main group-hover:text-brand transition-colors truncate">
              <a href={bookmark.url} target="_blank" rel="noopener noreferrer" onClick={handleLinkClick}>
                {bookmark.title}
              </a>
            </h3>
          </div>
        </div>

        {/* Tags, Clicks & Actions */}
        <div className="flex items-center gap-4 flex-shrink-0 justify-between sm:justify-end">
          <div className="hidden md:block">
            {renderTags()}
          </div>

          <div className="flex items-center gap-3 text-[10px] text-text-muted">
            <span className="flex items-center gap-1">
              <Eye size={12} />
              {bookmark.clicksCount}
            </span>
            {renderActions()}
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
              className="p-1.5 bg-brand-soft text-brand rounded-md hover:bg-brand hover:text-white transition-all duration-150"
            >
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 2. COMPACT GRID VIEW MODE
  if (viewMode === 'compact') {
    return (
      <article className="group bg-surface border border-border-custom hover:border-brand/40 rounded-xl p-4 flex flex-col justify-between h-36 transition-all duration-200 hover:shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-text-muted font-mono truncate flex items-center gap-1">
              {getTypeIcon(bookmark.type)}
              {getHostname(bookmark.url)}
            </span>
            {collection && (
              <span className="text-[9px] px-1.5 py-0.2 rounded font-medium" style={{ backgroundColor: `${collection.color}15`, color: collection.color }}>
                {collection.name}
              </span>
            )}
          </div>

          <h3 className="text-xs font-semibold text-text-main leading-snug group-hover:text-brand transition-colors line-clamp-2">
            <a href={bookmark.url} target="_blank" rel="noopener noreferrer" onClick={handleLinkClick}>
              {bookmark.title}
            </a>
          </h3>
        </div>

        <div className="pt-2 border-t border-border-custom/60 flex items-center justify-between">
          <div className="max-w-[60%] truncate">
            {renderTags()}
          </div>
          {renderActions()}
        </div>
      </article>
    );
  }

  // 3. RICH GRID VIEW MODE (Default)
  return (
    <article className="group bg-surface border border-border-custom hover:border-brand/40 rounded-xl overflow-hidden flex flex-col h-[320px] transition-all duration-200 hover:shadow-sm">
      {/* Cover Image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-muted">
        <img
          src={bookmark.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=60'}
          alt={bookmark.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-101"
        />
        {/* Hover overlay with action */}
        <div className="absolute inset-0 bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLinkClick}
            className="p-2.5 bg-surface/90 border border-border-custom rounded-full text-brand hover:bg-brand hover:text-white hover:scale-105 transition-all duration-150 shadow"
            title="Open link"
          >
            <ExternalLink size={16} />
          </a>
        </div>

        {/* Content Type Badge */}
        <div className="absolute top-3 left-3 px-2 py-1 bg-surface/90 backdrop-blur-sm border border-border-custom rounded-lg flex items-center gap-1.5 shadow-sm">
          {getTypeIcon(bookmark.type)}
        </div>

        {/* Collection Badge */}
        {collection && (
          <span
            className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-medium backdrop-blur-sm border shadow-sm"
            style={{
              backgroundColor: `${collection.color}d0`,
              borderColor: `${collection.color}30`,
              color: '#ffffff',
            }}
          >
            {collection.name}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow justify-between">
        <div className="space-y-1">
          {/* Hostname */}
          <span className="text-[10px] text-text-muted flex items-center gap-1 font-mono">
            {bookmark.faviconUrl && (
              <img 
                src={bookmark.faviconUrl} 
                alt="" 
                className="w-3 h-3 object-contain" 
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
              />
            )}
            {getHostname(bookmark.url)}
          </span>

          {/* Title */}
          <h3 className="text-xs font-semibold text-text-main leading-snug group-hover:text-brand transition-colors line-clamp-2">
            <a href={bookmark.url} target="_blank" rel="noopener noreferrer" onClick={handleLinkClick}>
              {bookmark.title}
            </a>
          </h3>

          {/* Description */}
          <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
            {bookmark.description}
          </p>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-border-custom/50 flex flex-col gap-2">
          {/* Tags */}
          <div className="truncate">
            {renderTags()}
          </div>

          {/* Stats & Actions */}
          <div className="flex items-center justify-between text-[10px] text-text-muted">
            <div className="flex items-center gap-1" title="Clicks tracker">
              <Eye size={12} />
              <span>{bookmark.clicksCount} clicks</span>
            </div>
            {renderActions()}
          </div>
        </div>
      </div>
    </article>
  );
};
