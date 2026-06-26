'use client';
import React, { useState, useMemo } from 'react';
import { useBookmarkStore } from '../../store/useBookmarkStore';
import { 
  Key, Lock, Eye, EyeOff, Copy, Check, ExternalLink, 
  Trash2, Plus, Search, FileText, ShieldCheck
} from 'lucide-react';
import { AddCredentialModal } from './AddCredentialModal';

export const CredentialsManager: React.FC = () => {
  const { credentials, deleteCredential, searchQuery } = useBookmarkStore();
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Toggle password visibility
  const toggleVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Copy to clipboard helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  // Filter credentials based on search query
  const filteredCredentials = useMemo(() => {
    if (!searchQuery) return credentials;
    const query = searchQuery.toLowerCase();
    return credentials.filter(c => 
      c.title.toLowerCase().includes(query) ||
      c.usernameEmail.toLowerCase().includes(query) ||
      (c.websiteUrl && c.websiteUrl.toLowerCase().includes(query)) ||
      (c.notes && c.notes.toLowerCase().includes(query))
    );
  }, [credentials, searchQuery]);

  // Try to clean website URL for displaying
  const formatUrl = (url?: string) => {
    if (!url) return '';
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border-custom">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-soft text-brand rounded-xl">
            <Key size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-text-main">Passwords & Logins</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Securely store and copy logins, passwords, and accounts. Encrypted locally in your browser.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand/90 text-white rounded-lg text-xs font-medium transition-all duration-150 active:scale-95 cursor-pointer shadow-xs"
        >
          <Plus size={14} />
          <span>Add Password</span>
        </button>
      </div>

      {/* Grid of Logins */}
      {filteredCredentials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCredentials.map((cred) => {
            const isPassVisible = !!visiblePasswords[cred.id];
            const isUserCopied = !!copiedStates[`${cred.id}-user`];
            const isPassCopied = !!copiedStates[`${cred.id}-pass`];

            return (
              <div 
                key={cred.id}
                className="bg-surface border border-border-custom rounded-2xl p-5 hover:border-brand/40 hover:shadow-xs transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top: Icon & Title */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-surface-muted rounded-xl text-brand/80 border border-border-custom/50">
                        <Lock size={16} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-text-main truncate">{cred.title}</h3>
                        {cred.websiteUrl && (
                          <a 
                            href={cred.websiteUrl.startsWith('http') ? cred.websiteUrl : `https://${cred.websiteUrl}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] text-text-muted hover:text-brand flex items-center gap-1 mt-0.5 transition-colors"
                          >
                            <span className="truncate">{formatUrl(cred.websiteUrl)}</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => deleteCredential(cred.id)}
                      className="p-1.5 text-text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                      title="Delete password"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Inputs: Username & Password */}
                  <div className="space-y-2.5 pt-1">
                    {/* Username */}
                    <div className="bg-surface-muted border border-border-custom/60 rounded-xl px-3 py-2 flex items-center justify-between">
                      <div className="min-w-0 flex-grow">
                        <span className="text-[9px] text-text-muted font-bold block uppercase tracking-wider">Username / Email</span>
                        <span className="text-xs text-text-main font-medium truncate block select-all mt-0.5">
                          {cred.usernameEmail}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(cred.usernameEmail, `${cred.id}-user`)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isUserCopied 
                            ? 'text-emerald-600 bg-emerald-500/10' 
                            : 'text-text-muted hover:text-text-main hover:bg-surface'
                        }`}
                        title="Copy username"
                      >
                        {isUserCopied ? <ShieldCheck size={14} /> : <Copy size={14} />}
                      </button>
                    </div>

                    {/* Password */}
                    <div className="bg-surface-muted border border-border-custom/60 rounded-xl px-3 py-2 flex items-center justify-between">
                      <div className="min-w-0 flex-grow">
                        <span className="text-[9px] text-text-muted font-bold block uppercase tracking-wider">Password</span>
                        <span className="text-xs text-text-main font-mono tracking-wide truncate block mt-0.5">
                          {isPassVisible ? cred.passwordEncrypted : '••••••••••••'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => toggleVisibility(cred.id)}
                          className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface rounded-lg transition-colors"
                          title={isPassVisible ? "Hide password" : "Show password"}
                        >
                          {isPassVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => handleCopy(cred.passwordEncrypted, `${cred.id}-pass`)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isPassCopied 
                              ? 'text-emerald-600 bg-emerald-500/10' 
                              : 'text-text-muted hover:text-text-main hover:bg-surface'
                          }`}
                          title="Copy password"
                        >
                          {isPassCopied ? <ShieldCheck size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom: Notes */}
                {cred.notes && (
                  <div className="mt-4 pt-3 border-t border-border-custom/50 flex items-start gap-2 text-[11px] text-text-muted leading-relaxed">
                    <FileText size={12} className="mt-0.5 shrink-0" />
                    <p className="line-clamp-2">{cred.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="p-4 bg-surface border border-border-custom rounded-full text-text-muted/60 shadow-xs">
            <Lock size={32} />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-text-main">No credentials saved</h3>
            <p className="text-xs text-text-muted max-w-[280px]">
              Store your website logins, passwords, or secure account details safely in one place.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-1.5 bg-brand hover:bg-brand/90 text-white rounded-lg text-xs font-medium transition-all duration-150 active:scale-95 cursor-pointer shadow-xs"
          >
            Add First Login
          </button>
        </div>
      )}

      {/* Add Credential Modal */}
      <AddCredentialModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
