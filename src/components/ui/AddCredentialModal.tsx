'use client';
import React, { useState } from 'react';
import { useBookmarkStore } from '../../store/useBookmarkStore';
import { X, Key, Globe, User, ShieldAlert, Sparkles, Eye, EyeOff } from 'lucide-react';

interface AddCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddCredentialModal: React.FC<AddCredentialModalProps> = ({ isOpen, onClose }) => {
  const { addCredential } = useBookmarkStore();
  
  const [title, setTitle] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [usernameEmail, setUsernameEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Password Generator
  const generateStrongPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let generated = '';
    for (let i = 0; i < 14; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setShowPassword(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please enter a title (e.g. GitHub)');
      return;
    }
    if (!usernameEmail.trim()) {
      setError('Please enter a username or email');
      return;
    }
    if (!password.trim()) {
      setError('Please enter or generate a password');
      return;
    }

    addCredential({
      title: title.trim(),
      websiteUrl: websiteUrl.trim() || undefined,
      usernameEmail: usernameEmail.trim(),
      passwordEncrypted: password.trim(), // Stored in state
      notes: notes.trim() || undefined,
    });

    // Reset fields
    setTitle('');
    setWebsiteUrl('');
    setUsernameEmail('');
    setPassword('');
    setNotes('');
    setShowPassword(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/65 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative bg-surface border border-border-custom w-full max-w-md rounded-2xl shadow-xl overflow-hidden transition-all duration-300 z-10 scale-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-custom bg-surface-muted/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-soft text-brand rounded-lg">
              <Key size={16} />
            </div>
            <h3 className="text-sm font-bold text-text-main">Add Login & Password</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-main hover:bg-surface-muted rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 text-xs flex items-center gap-2">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Title / Name *</label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. GitHub, Mail.ru"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface border border-border-custom rounded-xl text-xs text-text-main placeholder-text-muted/60 focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/20 transition-all"
                required
              />
              <Key className="absolute left-3 top-2.5 text-text-muted/60" size={14} />
            </div>
          </div>

          {/* Website URL */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Website URL (Optional)</label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. https://github.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface border border-border-custom rounded-xl text-xs text-text-main placeholder-text-muted/60 focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/20 transition-all"
              />
              <Globe className="absolute left-3 top-2.5 text-text-muted/60" size={14} />
            </div>
          </div>

          {/* Username / Email */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Username or Email *</label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. user@gmail.com or username"
                value={usernameEmail}
                onChange={(e) => setUsernameEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface border border-border-custom rounded-xl text-xs text-text-main placeholder-text-muted/60 focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/20 transition-all"
                required
              />
              <User className="absolute left-3 top-2.5 text-text-muted/60" size={14} />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Password *</label>
              <button
                type="button"
                onClick={generateStrongPassword}
                className="text-[10px] text-brand hover:text-brand/80 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Sparkles size={10} />
                <span>Generate Strong</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-2 bg-surface border border-border-custom rounded-xl text-xs text-text-main font-mono placeholder-text-muted/60 focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/20 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-text-muted/60 hover:text-text-main transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Notes / Info (Optional)</label>
            <textarea
              placeholder="e.g. Recovery code, secret questions, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-surface border border-border-custom rounded-xl text-xs text-text-main placeholder-text-muted/60 focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/20 transition-all resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border-custom">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border-custom text-text-main hover:bg-surface-muted rounded-xl text-xs font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand hover:bg-brand/90 text-white rounded-xl text-xs font-medium transition-all active:scale-95 cursor-pointer"
            >
              Save Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
