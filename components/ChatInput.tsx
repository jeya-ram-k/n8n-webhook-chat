import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MessageContent } from '../types';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { SendIcon } from './icons/SendIcon';
import { StopIcon } from './icons/StopIcon';
import { XIcon } from './icons/XIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ChatInputProps {
  onSendMessage: (content: MessageContent) => void;
  disabled: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled }) => {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && !isRecording) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [text, isRecording]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSend = () => {
    if (disabled || (!text.trim() && files.length === 0)) return;
    onSendMessage({ text, files });
    setText('');
    setFiles([]);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(prev => [...prev, ...Array.from(event.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const stopRecordingCleanup = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      isCancelledRef.current = false;

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (!isCancelledRef.current) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
          setFiles(prev => [...prev, audioFile]);
        }
        stream.getTracks().forEach(track => track.stop());
        stopRecordingCleanup();
      };

      mediaRecorder.start();
      setIsRecording(true);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access was denied. Please allow microphone access in your browser settings.");
    }
  }, [isRecording, stopRecordingCleanup]);

  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    isCancelledRef.current = false;
    mediaRecorderRef.current.stop();
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    isCancelledRef.current = true;
    mediaRecorderRef.current.stop();
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-neutral-950/80 backdrop-blur-md border border-neutral-800 rounded-lg p-2 flex flex-col shadow-lg">
      {files.length > 0 && (
        <div className="p-2 border-b border-neutral-800 mb-2">
          <p className="text-sm font-semibold mb-2 text-indigo-300">Attachments:</p>
          <div className="flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div key={index} className="bg-neutral-900 rounded-md p-2 flex items-center gap-2 text-sm max-w-xs">
                <span className="truncate">{file.name}</span>
                <button onClick={() => removeFile(index)} className="text-neutral-500 hover:text-indigo-300 transition-colors">
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-end gap-2">
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between gap-3 px-2 h-[42px]">
            <button
              onClick={cancelRecording}
              className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
              aria-label="Cancel recording"
            >
              <TrashIcon className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-mono text-neutral-300 w-12">{formatTime(recordingTime)}</span>
            </div>
            <div className="recording-visualizer flex items-center justify-center gap-1 w-24 h-6">
                <div className="w-1 h-2 bg-purple-400 rounded-full" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1 h-3 bg-purple-400 rounded-full" style={{ animationDelay: '0.3s' }}></div>
                <div className="w-1 h-5 bg-purple-400 rounded-full" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1 h-4 bg-purple-400 rounded-full" style={{ animationDelay: '0s' }}></div>
                <div className="w-1 h-2 bg-purple-400 rounded-full" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-neutral-400 hover:text-indigo-400 disabled:opacity-50 transition-colors"
              disabled={disabled}
              aria-label="Attach file"
            >
              <PaperclipIcon className="w-6 h-6" />
            </button>
            <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={"Type a message or drop files..."}
              className="flex-1 bg-transparent resize-none outline-none placeholder-neutral-600 p-2 max-h-40 overflow-y-auto focus:ring-0"
              rows={1}
              disabled={disabled}
            />
          </>
        )}
        <button
          onClick={toggleRecording}
          className={`p-2 transition-colors disabled:opacity-50 ${isRecording ? 'text-red-500 animate-pulse' : 'text-neutral-400 hover:text-indigo-400'}`}
          disabled={disabled}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? <StopIcon className="w-6 h-6" /> : <MicrophoneIcon className="w-6 h-6" />}
        </button>
        <button
          onClick={handleSend}
          className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-white hover:opacity-90 transition-all disabled:from-neutral-700 disabled:to-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={disabled || isRecording || (!text.trim() && files.length === 0)}
          aria-label="Send message"
        >
          <SendIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;