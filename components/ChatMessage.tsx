
import React, { useState, useRef, useEffect } from 'react';
import { Message, Role } from '../types';
import QuizCard from './QuizCard';
import QuizSetup from './QuizSetup';
import { textToSpeech } from '../services/geminiService';
import { updateMessageBookmark } from '../services/supabase';

interface ChatMessageProps {
  message: Message;
  onStartQuiz?: (topic: string) => void;
  onMagicAction?: (action: string, context: { text: string; id: string }) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onStartQuiz, onMagicAction }) => {
  const [isBookmarked, setIsBookmarked] = useState(message.isBookmarked || false);
  const [isLiked, setIsLiked] = useState(message.isLiked || false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showLoveEffect, setShowLoveEffect] = useState(false);
  const lastTap = useRef<number>(0);
  const isUser = message.role === Role.USER;

  // Sync bookmark state if prop changes (e.g., after initial save to DB)
  useEffect(() => {
    setIsBookmarked(message.isBookmarked || false);
  }, [message.isBookmarked, message.id]);

  useEffect(() => {
    if (message.isLoveEffect) {
      setShowLoveEffect(true);
      const timer = setTimeout(() => setShowLoveEffect(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [message.isLoveEffect]);

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !isBookmarked;
    setIsBookmarked(newState);
    
    // Check if ID is a temporary local ID
    const isTempId = message.id.toString().startsWith('u-') || 
                     message.id.toString().startsWith('b-') || 
                     message.id.toString().startsWith('w-') || 
                     message.id.toString().startsWith('e-');

    if (message.id && !isTempId) {
       await updateMessageBookmark(message.id, newState);
    } else {
      // If it's a temp ID, we just keep the local state. 
      // The parent App usually updates the message object once saved, 
      // and our useEffect above will handle final state.
      console.log("Suji: Bookmarking locally, will sync when saved to cloud.");
    }
  };

  const handleLike = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newState = !isLiked;
    setIsLiked(newState);
    if (newState) {
      triggerHeartAnim();
    }
  };

  const triggerHeartAnim = () => {
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 600);
  };

  const handleDownloadImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!message.imageData) return;
    const link = document.createElement('a');
    link.href = message.imageData;
    link.download = `Suji-Diagram-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      const newState = !isLiked;
      setIsLiked(newState);
      if (newState) {
        triggerHeartAnim();
      }
    }
    lastTap.current = now;
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(message.text);
  };

  const handleListen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) return;
    setIsPlaying(true);
    const success = await textToSpeech(message.text);
    if (success) {
      setTimeout(() => setIsPlaying(false), 5000);
    } else {
      setIsPlaying(false);
    }
  };

  const handleVisualise = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMagicAction?.('Imagine', { text: message.text, id: message.id });
  };

  const parseContent = (inputText: any) => {
    const text = typeof inputText === 'string' ? inputText : (inputText ? JSON.stringify(inputText) : "");
    if (!text) return null;

    const lines = text.split('\n');
    
    return lines.map((line, i) => {
      const isBullet = line.trim().startsWith('- ');
      let content = isBullet ? line.trim().substring(2) : line;
      
      const boldParts = content.split(/(\*\*.*?\*\*)/g);
      
      const renderedLine = boldParts.flatMap((part, j) => {
        const isBold = part.startsWith('**') && part.endsWith('**');
        const innerText = isBold ? part.slice(2, -2) : part;

        if (!isUser) {
          const capsParts = innerText.split(/(\b[A-Z]{2,}\b)/g);
          return capsParts.map((subPart, k) => {
            if (/^[A-Z]{2,}$/.test(subPart)) {
              return (
                <span key={`caps-${i}-${j}-${k}`} className="inline-block px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-md font-black text-[9px] sm:text-[10px] align-middle mx-1 border border-orange-200 transform -rotate-1 hover:rotate-0 transition-all shadow-sm">
                  {subPart}
                </span>
              );
            }
            return isBold ? <strong key={`bold-${i}-${j}-${k}`} className="font-black text-indigo-700 underline decoration-indigo-200 decoration-2 px-0.5">{subPart}</strong> : subPart;
          });
        }
        return isBold ? <strong key={`user-bold-${i}-${j}`} className="font-bold underline decoration-white/40 decoration-2">{innerText}</strong> : innerText;
      });

      return (
        <div key={`line-${i}`} className={`mb-2 sm:mb-3 last:mb-0 leading-relaxed ${isBullet ? 'pl-5 sm:pl-6 relative' : ''}`}>
          {isBullet && <span className="absolute left-0 top-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-rose-500 rotate-45 rounded-sm"></span>}
          <span className="text-[14px] sm:text-[15px] font-medium tracking-tight">{renderedLine}</span>
        </div>
      );
    });
  };

  const LoveParticles = () => {
    if (!showLoveEffect) return null;
    return (
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {[...Array(8)].map((_, i) => (
          <div 
            key={i} 
            className="heart-particle text-rose-500"
            style={{ 
              left: `${Math.random() * 80 + 10}%`, 
              top: '50%',
              animationDelay: `${i * 0.15}s`,
              fontSize: `${Math.random() * 10 + 10}px`
            }}
          >
            <svg className="w-6 h-6 fill-current drop-shadow-sm" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`flex w-full mb-8 sm:mb-12 animate-message ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="relative max-w-[95%] sm:max-w-[85%]">
        <LoveParticles />
        <div 
          onClick={handleDoubleTap}
          className={`group relative rounded-2xl sm:rounded-[2.5rem] px-5 py-4 sm:px-8 sm:py-7 shadow-sm transition-all cursor-pointer select-none flex flex-col overflow-hidden ${
          isUser 
            ? `text-white rounded-tr-none shadow-indigo-100 ${message.isLoveEffect ? 'bg-gradient-to-br from-indigo-600 to-rose-600 border border-rose-400/30' : 'bg-indigo-600'}` 
            : 'bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-slate-100 hover:border-indigo-100 hover:shadow-indigo-50/50'
        }`}>
          {/* Heart Pop Animation Overlay */}
          {showHeartAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
              <svg className="w-24 h-24 text-white fill-current animate-heart-pop drop-shadow-lg" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
          )}

          {message.isGeneratingImage && !message.imageData && (
            <div className="mb-4 sm:mb-6 relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-50 border-2 border-dashed border-indigo-200 h-40 sm:h-52 flex flex-col items-center justify-center gap-2 sm:gap-4 animate-pulse order-first shadow-inner">
               <div className="w-8 h-8 sm:w-12 sm:h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
               <p className="text-[10px] sm:text-[12px] font-black uppercase text-indigo-400 tracking-widest">Drawing Diagram...</p>
            </div>
          )}

          {message.imageData && (
            <div className="mb-4 sm:mb-6 flex flex-col order-first animate-message">
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-white group-image group/img">
                <div className="absolute top-0 left-0 right-0 p-3 sm:p-5 z-20 flex items-center justify-between bg-gradient-to-b from-black/40 via-black/10 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 pointer-events-none group-hover/img:pointer-events-auto">
                  <div className="bg-indigo-600 text-white text-[9px] sm:text-[10px] font-black px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl uppercase tracking-widest shadow-2xl backdrop-blur-lg border border-white/20 flex items-center gap-1.5 sm:gap-2">
                    <div className="w-1.5 h-1.5 sm:w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    IMAGE
                  </div>
                  
                  <button 
                    onClick={handleDownloadImage}
                    title="Download this image"
                    className="p-2 sm:p-2.5 bg-white/95 hover:bg-white text-indigo-600 rounded-lg sm:rounded-xl shadow-2xl border border-white/50 transition-all active:scale-90 flex items-center gap-1.5 sm:gap-2"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest hidden xs:inline">Save</span>
                  </button>
                </div>
                
                <img 
                  src={message.imageData} 
                  alt="Image" 
                  className="w-full h-auto block min-h-[150px] sm:min-h-[200px] object-cover hover:scale-[1.03] transition-transform duration-1000 ease-in-out" 
                />
              </div>
              <p className={`mt-2 text-[9px] font-black uppercase tracking-widest ${isUser ? 'text-white/60 text-right pr-2' : 'text-slate-400 pl-2'}`}>
                {isUser ? 'User Uploaded Image' : 'Illustration by Suji'}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-5">
            <div className="flex items-center gap-2 sm:gap-3">
              {!isUser && (
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white text-[10px] sm:text-[12px] font-black shadow-lg shadow-indigo-100">S</div>
              )}
              <span className={`opacity-60 text-[9px] sm:text-[11px] font-black uppercase tracking-widest ${isUser ? 'text-white' : 'text-slate-400'}`}>{isUser ? 'You' : 'Suji'}</span>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2">
              {!isUser && (
                <button 
                  onClick={handleVisualise} 
                  title="Create an illustration based on this explanation" 
                  className="p-1.5 sm:p-2 rounded-lg bg-indigo-50/50 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-90 border border-indigo-100/30"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </button>
              )}

              {!isUser && (
                <button 
                  onClick={handleListen} 
                  title="Play voice audio for this message" 
                  className={`p-1.5 sm:p-2 rounded-lg transition-all border ${isPlaying ? 'text-indigo-600 bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-indigo-50/50 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 border-indigo-100/30'}`}
                >
                  <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isPlaying ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                </button>
              )}

              <button 
                onClick={handleCopy} 
                title="Copy this text to clipboard" 
                className={`p-1.5 sm:p-2 rounded-lg transition-all active:scale-90 border ${isUser ? 'bg-white/10 text-white/60 hover:text-white hover:bg-white/20 border-white/10' : 'bg-indigo-50/50 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 border-indigo-100/30'}`}
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
              </button>

              <button 
                onClick={handleBookmark} 
                title="Save this to your bookmark library" 
                className={`p-1.5 sm:p-2 rounded-lg transition-all active:scale-90 border ${isBookmarked ? 'text-amber-500 bg-amber-50 shadow-sm border-amber-200' : isUser ? 'bg-white/10 text-white/60 hover:text-amber-300 hover:bg-white/20 border-white/10' : 'bg-indigo-50/50 text-indigo-400 hover:text-amber-500 hover:bg-amber-50 border-indigo-100/30'}`}
              >
                <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
              </button>
            </div>
          </div>

          {message.quizData ? <QuizCard quiz={message.quizData} /> : 
           message.isQuizSetup ? <QuizSetup suggestedTopic={message.suggestedTopic || ''} onStart={(t) => onStartQuiz?.(t)} /> : (
            <div className="overflow-wrap-anywhere">
              {parseContent(message.text)}
            </div>
          )}

          {message.sources && message.sources.length > 0 && (
            <div className="mt-6 pt-4 sm:mt-8 sm:pt-6 border-t border-slate-100 flex flex-wrap gap-2 sm:gap-3">
              {message.sources.map((s, idx) => (
                <a 
                  key={idx} 
                  href={s.uri} 
                  target="_blank" 
                  rel="noreferrer" 
                  title={`Learn more from: ${s.title}`}
                  className="text-[9px] sm:text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest shadow-sm border border-indigo-100/50"
                >
                  {s.title.substring(0, 18)}...
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Instagram style Liked indicator (below side) */}
        <button
          onClick={handleLike}
          className={`absolute ${isUser ? '-bottom-4 -left-2' : '-bottom-4 -right-2'} z-20 transition-all duration-300 transform active:scale-75 select-none`}
        >
          <div className={`p-1.5 sm:p-2 rounded-full border-2 transition-all shadow-md ${
            isLiked 
              ? 'bg-white border-rose-100 text-rose-500 scale-100' 
              : 'bg-white/80 border-slate-50 text-slate-300 opacity-20 hover:opacity-100 scale-90'
          }`}>
            <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLiked ? 'fill-rose-500 stroke-rose-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
};

export default ChatMessage;
