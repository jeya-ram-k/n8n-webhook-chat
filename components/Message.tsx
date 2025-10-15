import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message as MessageType } from '../types';
import AudioPlayer from './AudioPlayer';
import { DownloadIcon } from './icons/DownloadIcon';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';

interface MessageProps {
  message: MessageType;
}

// Custom component to render code blocks with a copy button
const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
  const [isCopied, setIsCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const textToCopy = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error("Failed to copy code: ", err);
    });
  };

  return !inline && match ? (
    <div className="bg-neutral-950 rounded-md my-2 relative group border border-neutral-800">
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-neutral-800">
        <span className="text-xs text-neutral-400 font-sans">{match[1]}</span>
        <button
          onClick={handleCopy}
          className="p-1 text-neutral-400 rounded-md hover:bg-neutral-800 hover:text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={isCopied ? "Copied" : "Copy code"}
        >
          {isCopied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm" {...props}>
        <code>{children}</code>
      </pre>
    </div>
  ) : (
    <code className="bg-neutral-800/50 text-indigo-300 rounded-sm px-1.5 py-0.5 text-[0.9em] font-mono" {...props}>
      {children}
    </code>
  );
};


const markdownComponents = {
  h1: ({node, ...props}: any) => <h1 className="text-2xl font-bold my-3" {...props} />,
  h2: ({node, ...props}: any) => <h2 className="text-xl font-bold my-3" {...props} />,
  h3: ({node, ...props}: any) => <h3 className="text-lg font-bold my-2" {...props} />,
  p: ({node, ...props}: any) => <p className="mb-2 last:mb-0" {...props} />,
  a: ({node, ...props}: any) => <a className="text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
  ul: ({node, ...props}: any) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
  ol: ({node, ...props}: any) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />,
  li: ({node, ...props}: any) => <li className="pl-2" {...props} />,
  blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-neutral-700 pl-4 my-2 italic text-neutral-400" {...props} />,
  code: CodeBlock,
  img: ({node, ...props}: any) => <img className="max-w-full rounded-md my-2" {...props} />,
  table: ({node, ...props}: any) => <div className="overflow-x-auto my-2"><table className="w-full my-2 border-collapse" {...props} /></div>,
  thead: ({node, ...props}: any) => <thead className="bg-neutral-800" {...props} />,
  th: ({node, ...props}: any) => <th className="border border-neutral-700 px-3 py-2 text-left" {...props} />,
  td: ({node, ...props}: any) => <td className="border border-neutral-700 px-3 py-2" {...props} />,
};


const MessageBubble: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const [isCopied, setIsCopied] = useState(false);
  
  const bubbleClasses = isUser
    ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-br-none'
    : 'bg-neutral-900 rounded-bl-none';
  const containerClasses = isUser ? 'justify-end' : 'justify-start';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error("Failed to copy text: ", err);
    });
  };

  const handleDownload = () => {
    if (message.type === 'text') {
      const blob = new Blob([message.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const formattedDate = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
      link.download = `message-${formattedDate}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if ('content' in message) {
      // Handles image, audio, video, file
      const link = document.createElement('a');
      link.href = message.content;
      link.download = message.fileName || `download-${message.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderContent = () => {
    switch (message.type) {
      case 'text':
        return (
          <div className="text-white whitespace-pre-wrap break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        );
      case 'image':
        return <img src={message.content} alt={message.fileName || 'image attachment'} className="rounded-lg w-full max-w-xs max-h-64 object-contain" />;
      case 'audio':
        return <AudioPlayer src={message.content} />;
      case 'video':
        return <video controls src={message.content} className="rounded-lg w-full max-w-xs" />;
      case 'file':
        return (
          <div className="flex items-center space-x-2 text-white">
            <PaperclipIcon className="h-6 w-6 flex-shrink-0" />
            <span className="truncate">{message.fileName || 'File'}</span>
          </div>
        );
      default:
        return null;
    }
  };


  return (
    <div className={`flex items-end group ${containerClasses} animate-fade-in-up`}>
      {isUser && message.type === 'text' && (
        <div className="mr-2 flex-shrink-0 self-center flex items-center space-x-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              onClick={() => handleCopy(message.content)}
              aria-label={isCopied ? "Copied" : "Copy text"}
              className="p-1.5 text-neutral-500 rounded-full hover:bg-neutral-800 hover:text-indigo-300 focus:opacity-100"
            >
              {isCopied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
            </button>
        </div>
      )}
      <div className={`rounded-lg p-3 max-w-[85%] sm:max-w-lg shadow-md ${bubbleClasses} overflow-hidden`}>
        {renderContent()}
        <p className={`text-xs mt-1 ${isUser ? 'text-indigo-200' : 'text-neutral-500'} text-right`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {!isUser && (
        <div className="ml-2 flex-shrink-0 self-center flex items-center space-x-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              onClick={handleDownload}
              aria-label="Download"
              className="p-1.5 text-neutral-500 rounded-full hover:bg-neutral-800 hover:text-indigo-300 focus:opacity-100"
            >
              <DownloadIcon className="w-5 h-5" />
            </button>
            {message.type === 'text' && (
              <button
                onClick={() => handleCopy(message.content)}
                aria-label={isCopied ? "Copied" : "Copy text"}
                className="p-1.5 text-neutral-500 rounded-full hover:bg-neutral-800 hover:text-indigo-300 focus:opacity-100"
              >
                {isCopied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
              </button>
            )}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;