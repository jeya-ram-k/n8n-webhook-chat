import React, { useState } from 'react';
import { XIcon } from './icons/XIcon';
import { AuthConfig, AuthType } from '../types';

interface SettingsModalProps {
  currentUrl: string;
  currentAuthConfig: AuthConfig;
  onSave: (url: string, authConfig: AuthConfig) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ currentUrl, currentAuthConfig, onSave, onClose }) => {
  const [url, setUrl] = useState(currentUrl);
  const [authConfig, setAuthConfig] = useState<AuthConfig>(currentAuthConfig);

  const handleAuthTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as AuthType;
    setAuthConfig({ type: newType });
  };
  
  const handleAuthDetailChange = (field: string, value: string) => {
    setAuthConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (url.trim()) {
      onSave(url.trim(), authConfig);
    }
  };
  
  const renderAuthFields = () => {
    switch (authConfig.type) {
      case 'basic':
        return (
          <div className="space-y-3 animate-fade-in-up">
            <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Username</label>
                <input
                    type="text"
                    value={authConfig.username || ''}
                    onChange={(e) => handleAuthDetailChange('username', e.target.value)}
                    placeholder="Enter username"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Password</label>
                <input
                    type="password"
                    value={authConfig.password || ''}
                    onChange={(e) => handleAuthDetailChange('password', e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
          </div>
        );
      case 'header':
        return (
            <div className="space-y-3 animate-fade-in-up">
                <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Header Name</label>
                    <input
                        type="text"
                        value={authConfig.headerName || ''}
                        onChange={(e) => handleAuthDetailChange('headerName', e.target.value)}
                        placeholder="e.g., X-API-Key"
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Header Value</label>
                    <input
                        type="password"
                        value={authConfig.headerValue || ''}
                        onChange={(e) => handleAuthDetailChange('headerValue', e.target.value)}
                        placeholder="Enter header value"
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>
        );
      case 'jwt':
        return (
            <div className="animate-fade-in-up">
                <label className="block text-sm font-medium text-neutral-300 mb-1">JWT Token</label>
                <textarea
                    value={authConfig.token || ''}
                    onChange={(e) => handleAuthDetailChange('token', e.target.value)}
                    placeholder="Paste your JWT token"
                    rows={3}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950 sm:bg-black/70 sm:backdrop-blur-sm z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="bg-neutral-950 h-full w-full sm:h-auto sm:max-w-md sm:rounded-lg sm:shadow-xl sm:border sm:border-neutral-800 animate-fade-in-up flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-neutral-800" style={{ paddingTop: `calc(1rem + env(safe-area-inset-top, 0rem))` }}>
          <h2 className="text-xl font-bold text-indigo-400">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full text-neutral-400 hover:bg-neutral-800">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-indigo-300">Webhook Management</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="webhookUrl" className="block text-sm font-medium text-neutral-300 mb-1">
                      n8n Webhook URL
                    </label>
                    <input
                      type="text"
                      id="webhookUrl"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://your-n8n-instance/webhook/..."
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="authType" className="block text-sm font-medium text-neutral-300 mb-1">
                        Auth Method
                    </label>
                    <select 
                        id="authType"
                        value={authConfig.type}
                        onChange={handleAuthTypeChange}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="none">None</option>
                        <option value="basic">Basic Auth</option>
                        <option value="header">Header Auth</option>
                        <option value="jwt">JWT Auth</option>
                    </select>
                  </div>
                  
                  {authConfig.type !== 'none' && (
                      <div className="border-t border-neutral-800 pt-4">
                          {renderAuthFields()}
                      </div>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-neutral-500">
                  The URL and authentication details are saved locally in your browser.
              </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex-shrink-0 flex justify-end space-x-3 p-4 border-t border-neutral-800" style={{ paddingBottom: `calc(1rem + env(safe-area-inset-bottom, 0rem))` }}>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-700 text-white rounded-md hover:bg-neutral-600 transition-colors flex-1 sm:flex-none"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-md hover:opacity-90 transition-opacity flex-1 sm:flex-none"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;