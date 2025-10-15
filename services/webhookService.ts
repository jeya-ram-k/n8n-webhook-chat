import { BotResponse, MessageType, AuthConfig } from '../types';

// Helper to convert a Blob to a base64 string (without the data URI prefix).
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // reader.result is "data:[mime/type];base64,[base64 string]"
        // We only want the base64 part.
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error("Failed to read blob as a data URL."));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Maps common MIME types to file extensions.
const getExtensionFromMimeType = (mimeType: string): string => {
    if (!mimeType) return 'bin';

    const mimeMap: { [key: string]: string } = {
        'application/pdf': 'pdf',
        'application/zip': 'zip',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/vnd.ms-powerpoint': 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        'text/plain': 'txt',
        'text/csv': 'csv',
        'text/html': 'html',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/svg+xml': 'svg',
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
        'audio/webm': 'webm',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
    };
    
    const normalizedMimeType = mimeType.toLowerCase().split(';')[0];
    if (mimeMap[normalizedMimeType]) {
        return mimeMap[normalizedMimeType];
    }
    
    // Fallback for less common types
    const parts = normalizedMimeType.split('/');
    const subType = parts[1];
    if (subType) {
        // e.g., for 'image/svg+xml', it would extract 'svg'
        return subType.split('+')[0];
    }
    
    return 'bin'; // Default for unknown binary files
};


export async function sendToWebhook(url: string, text: string, files: File[], authConfig: AuthConfig, chatId: string): Promise<BotResponse[]> {
  const formData = new FormData();
  formData.append('text', text);
  formData.append('chatId', chatId);

  files.forEach((file, index) => {
    formData.append(`file${index}`, file);
  });

  const headers: HeadersInit = {};

  switch (authConfig.type) {
    case 'basic':
      if (authConfig.username || authConfig.password) {
        const credentials = btoa(`${authConfig.username || ''}:${authConfig.password || ''}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }
      break;
    case 'header':
      if (authConfig.headerName && authConfig.headerValue) {
        headers[authConfig.headerName] = authConfig.headerValue;
      }
      break;
    case 'jwt':
      if (authConfig.token) {
        headers['Authorization'] = `Bearer ${authConfig.token}`;
      }
      break;
    case 'none':
    default:
      // No auth headers needed
      break;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Request failed: ${response.status} ${response.statusText}. Server response: ${errorText}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    // If the response is not explicitly JSON or plain text, try to treat it as a file.
    // This is more robust for various file types (zip, docx, etc.).
    if (!contentType.startsWith('application/json') && !contentType.startsWith('text/')) {
      const blob = await response.blob();

      // If the blob is empty, it's not a file to be processed.
      if (blob.size === 0) {
        return [];
      }
      
      const base64Content = await blobToBase64(blob);

      const getMessageType = (mimeType: string): MessageType => {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        return 'file';
      };

      // Try to get a filename from the Content-Disposition header
      const disposition = response.headers.get('content-disposition');
      let fileName: string | undefined;
      if (disposition && disposition.includes('attachment')) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          // Decode URI component to handle encoded characters and remove quotes
          fileName = decodeURIComponent(matches[1].replace(/['"]/g, ''));
        }
      }

      // If no filename is found from the header, generate a descriptive one.
      if (!fileName) {
          const fileMimeType = blob.type || contentType;
          const extension = getExtensionFromMimeType(fileMimeType);
          const formattedDate = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
          fileName = `file-${formattedDate}.${extension}`;
      }

      return [{
        type: getMessageType(blob.type || contentType),
        content: base64Content,
        fileName: fileName,
        mimeType: blob.type || contentType,
      }];
    }

    // Otherwise, assume it's a text-based response (JSON or plain text)
    const responseText = await response.text();
    if (!responseText.trim()) {
      return [];
    }

    try {
      const responseData = JSON.parse(responseText);

      if (responseData.responses && Array.isArray(responseData.responses)) {
        return responseData.responses as BotResponse[];
      }

      if (Array.isArray(responseData)) {
        return responseData as BotResponse[];
      }

      if (responseData.text && typeof responseData.text === 'string') {
        return [{ type: 'text', content: responseData.text }];
      }
      
      throw new Error("Invalid JSON structure from webhook. Expected { responses: [...] }, an array of responses, or { text: '...' }.");

    } catch (e) {
      // If JSON.parse fails, treat the entire response as a single plain text message.
      return [{ type: 'text', content: responseText }];
    }

  } catch (error) {
    if (error instanceof TypeError) { // Network error
      throw new Error("Network error or CORS issue. Check the webhook URL and server configuration.");
    }
    throw error;
  }
}
