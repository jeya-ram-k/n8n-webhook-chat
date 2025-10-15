import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';

interface AudioPlayerProps {
  src: string;
}

const WAVEFORM_HEIGHT = 70;
const WAVEFORM_WIDTH = 280; // Corresponds to max-w-xs

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const drawWaveform = useCallback((buffer: AudioBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / WAVEFORM_WIDTH);
    const amp = WAVEFORM_HEIGHT / 2;

    ctx.clearRect(0, 0, WAVEFORM_WIDTH, WAVEFORM_HEIGHT);
    
    // Draw background waveform
    ctx.strokeStyle = '#404040'; // neutral-700
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < WAVEFORM_WIDTH; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        ctx.moveTo(i, amp * (1 + min));
        ctx.lineTo(i, amp * (1 + max));
    }
    ctx.stroke();

  }, []);

  const drawProgress = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBufferRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redraw base waveform first
    drawWaveform(audioBufferRef.current);

    const progress = currentTime / duration;
    const progressWidth = WAVEFORM_WIDTH * progress;
    
    // Draw progress waveform
    const data = audioBufferRef.current.getChannelData(0);
    const step = Math.ceil(data.length / WAVEFORM_WIDTH);
    const amp = WAVEFORM_HEIGHT / 2;

    ctx.strokeStyle = '#818cf8'; // indigo-400
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < progressWidth; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        ctx.moveTo(i, amp * (1 + min));
        ctx.lineTo(i, amp * (1 + max));
    }
    ctx.stroke();

  }, [currentTime, duration, drawWaveform]);


  useEffect(() => {
    const processAudio = async () => {
      try {
        if (!audioContextRef.current) {
           audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        const decodedData = await audioContextRef.current.decodeAudioData(arrayBuffer);
        audioBufferRef.current = decodedData;
        drawWaveform(decodedData);
        setIsLoading(false);
      } catch (e) {
        console.error("Error processing audio:", e);
        setError("Could not load audio file.");
        setIsLoading(false);
      }
    };
    processAudio();
  }, [src, drawWaveform]);

  useEffect(() => {
    drawProgress();
  }, [currentTime, duration, drawProgress]);


  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleSeek = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    if (!audio || !canvas || isNaN(duration) || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / canvas.width;
    const seekTime = duration * percentage;
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const togglePlaybackSpeed = () => {
    const rates = [1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if(audioRef.current) {
        audioRef.current.playbackRate = nextRate;
    }
  };


  if (error) {
    return <div className="text-red-400 text-sm">{error}</div>;
  }
  
  if (isLoading) {
      return <div className="text-neutral-300 text-sm">Loading audio...</div>
  }

  return (
    <div className="w-full max-w-xs">
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
        }}
        preload="metadata"
        className="hidden"
      />
      <canvas
        ref={canvasRef}
        width={WAVEFORM_WIDTH}
        height={WAVEFORM_HEIGHT}
        className="cursor-pointer bg-neutral-900/50 rounded-md"
        onClick={handleSeek}
      />
      <div className="flex items-center justify-between mt-2">
        <button onClick={handlePlayPause} className="text-white p-1 rounded-full hover:bg-neutral-800/50 transition-colors">
          {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
        </button>
        <div className="text-xs text-neutral-400 font-mono">
          <span>{formatTime(currentTime)}</span> / <span>{formatTime(duration)}</span>
        </div>
        <button 
          onClick={togglePlaybackSpeed}
          className="text-xs font-semibold bg-neutral-700/70 hover:bg-neutral-700 text-white rounded-md px-2 py-1 transition-colors"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
};

export default AudioPlayer;