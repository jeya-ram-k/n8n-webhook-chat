import React, { useRef, useEffect } from 'react';
import { Message } from '../types';
import MessageBubble from './Message';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isLoading && (
        <div className="flex justify-start">
            <div className="bg-neutral-900 rounded-lg rounded-bl-none p-3 max-w-lg">
                <div className="flex items-center space-x-2">
                    <span className="text-neutral-500">Bot is typing...</span>
                    <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                </div>
            </div>
        </div>
      )}
      <div ref={endOfMessagesRef} />
    </div>
  );
};

export default MessageList;