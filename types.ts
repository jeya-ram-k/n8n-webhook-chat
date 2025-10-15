export type MessageType = 'text' | 'audio' | 'video' | 'image' | 'file';

export interface BaseMessage {
  id: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

export interface TextMessage extends BaseMessage {
  type: 'text';
  content: string;
}

export interface MediaMessage extends BaseMessage {
  type: 'audio' | 'video' | 'image' | 'file';
  content: string; // URL or Data URI to the media
  fileName?: string;
  mimeType?: string;
}

export type Message = TextMessage | MediaMessage;

export interface MessageContent {
  text: string;
  files: File[];
  // This will be transformed into a message type on send
}

export interface BotResponse {
  type: MessageType;
  content: string;
  fileName?: string;
  mimeType?: string;
}

// --- Authentication Types ---

export type AuthType = 'none' | 'basic' | 'header' | 'jwt';

export interface NoAuth {
  type: 'none';
}

export interface BasicAuth {
  type: 'basic';
  username?: string;
  password?: string;
}

export interface HeaderAuth {
  type: 'header';
  headerName?: string;
  headerValue?: string;
}

export interface JwtAuth {
  type: 'jwt';
  token?: string;
}

export type AuthConfig = NoAuth | BasicAuth | HeaderAuth | JwtAuth;
