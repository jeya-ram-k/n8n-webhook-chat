import React, { useState, useEffect, useCallback } from 'react';
import { Message, MessageContent, AuthConfig } from './types';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import SettingsModal from './components/SettingsModal';
import { SettingsIcon } from './components/icons/SettingsIcon';
import { sendToWebhook } from './services/webhookService';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [webhookUrl, setWebhookUrl] = useState<string>(() => localStorage.getItem('n8nWebhookUrl') || '');
  const [authConfig, setAuthConfig] = useState<AuthConfig>(() => {
    const savedAuth = localStorage.getItem('n8nWebhookAuth');
    try {
      return savedAuth ? JSON.parse(savedAuth) : { type: 'none' };
    } catch {
      return { type: 'none' };
    }
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialMessages: Message[] = webhookUrl
      ? [
          {
            id: 'initial-1',
            sender: 'bot',
            type: 'text',
            content: "I'm ready! Send a message to start interacting with your n8n workflow.",
            timestamp: new Date().toISOString(),
          },
        ]
      : [
          {
            id: 'initial-1',
            sender: 'bot',
            type: 'text',
            content: 'Welcome! Please set your n8n Webhook URL in the settings to get started.',
            timestamp: new Date().toISOString(),
          },
        ];
    setMessages(initialMessages);
  }, [webhookUrl]);


  const handleSendMessage = useCallback(async (content: MessageContent) => {
    if (!webhookUrl) {
      setError('Webhook URL is not set. Please configure it in the settings.');
      return;
    }
    setError(null);

    const userMessages: Message[] = [];
    const timestamp = new Date().toISOString();
    let messageIdCounter = 0;

    if (content.text.trim()) {
      userMessages.push({
        id: `user-text-${Date.now()}-${messageIdCounter++}`,
        sender: 'user',
        type: 'text',
        content: content.text,
        timestamp,
      });
    }

    content.files.forEach((file) => {
      const getMessageType = (
        fileType: string
      ): 'image' | 'video' | 'audio' | 'file' => {
        if (fileType.startsWith('image/')) return 'image';
        if (fileType.startsWith('video/')) return 'video';
        if (fileType.startsWith('audio/')) return 'audio';
        return 'file';
      };

      userMessages.push({
        id: `user-file-${Date.now()}-${messageIdCounter++}`,
        sender: 'user',
        type: getMessageType(file.type),
        content: URL.createObjectURL(file),
        fileName: file.name,
        timestamp,
      });
    });

    setMessages((prev) => [...prev, ...userMessages]);
    setIsLoading(true);

    try {
      const chatId = crypto.randomUUID();
      const botResponses = await sendToWebhook(webhookUrl, content.text, content.files, authConfig, chatId);
      
      const responseMessages: Message[] = botResponses.map((res, index) => {
        let finalContent = res.content;
        const isBase64Like = res.content && !/^(https?|blob|data):/.test(res.content);

        if (res.type !== 'text' && res.mimeType && isBase64Like) {
          finalContent = `data:${res.mimeType};base64,${res.content}`;
        }
        
        return {
          id: `bot-${Date.now()}-${index}`,
          sender: 'bot',
          timestamp: new Date().toISOString(),
          ...res,
          content: finalContent,
        };
      });
      
      setMessages(prev => [...prev, ...responseMessages]);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      const errorBotMessage: Message = {
        id: `bot-error-${Date.now()}`,
        sender: 'bot',
        type: 'text',
        content: `Error: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorBotMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [webhookUrl, authConfig]);

  const handleSaveSettings = (url: string, config: AuthConfig) => {
    setWebhookUrl(url);
    setAuthConfig(config);
    localStorage.setItem('n8nWebhookUrl', url);
    localStorage.setItem('n8nWebhookAuth', JSON.stringify(config));
    setIsSettingsOpen(false);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-black/50 text-neutral-200 font-sans">
      <header className="bg-neutral-950/80 backdrop-blur-lg border-b border-neutral-800 p-4 flex justify-between items-center shadow-lg z-10">
        <h1 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
          n8n Webhook Chat
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full text-neutral-400 hover:bg-neutral-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            aria-label="Open settings"
          >
            <SettingsIcon className="w-6 h-6" />
          </button>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <MessageList messages={messages} isLoading={isLoading} />
      </main>

      {error && (
        <div className="p-2 bg-red-500/80 text-white text-center text-sm font-medium">
          {error}
        </div>
      )}

      <footer className="p-4 bg-transparent" style={{ paddingBottom: `calc(1rem + env(safe-area-inset-bottom, 0rem))` }}>
        <ChatInput onSendMessage={handleSendMessage} disabled={isLoading || !webhookUrl} />
      </footer>

      {isSettingsOpen && (
        <SettingsModal
          currentUrl={webhookUrl}
          currentAuthConfig={authConfig}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};

export default App;