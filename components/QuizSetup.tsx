
import React, { useState } from 'react';

interface QuizSetupProps {
  suggestedTopic: string;
  onStart: (topic: string) => void;
}

const PREDEFINED_TOPICS = [
  { name: 'Solar System', emoji: '🪐' },
  { name: 'Human Body', emoji: '🧬' },
  { name: 'Ancient Egypt', emoji: '🏺' },
  { name: 'Photosynthesis', emoji: '🌱' },
  { name: 'Ocean Life', emoji: '🌊' },
  { name: 'Computers', emoji: '💻' }
];

const QuizSetup: React.FC<QuizSetupProps> = ({ suggestedTopic, onStart }) => {
  const [customTopic, setCustomTopic] = useState('');

  const handleStart = (topic: string) => {
    onStart(topic);
  };

  const truncatedLabel = suggestedTopic && suggestedTopic.length > 40 
    ? suggestedTopic.substring(0, 37) + '...' 
    : suggestedTopic;

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-rose-50 border-2 border-slate-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl animate-message w-full max-w-lg mx-auto">
      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-tr from-rose-500 to-orange-400 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
          <svg className="w-5 h-5 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight leading-none">Suji Challenge</h3>
          <p className="text-[8px] sm:text-[10px] text-rose-500 font-black uppercase tracking-widest mt-1">Ready to test your brain?</p>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {suggestedTopic && suggestedTopic !== "Everything we discussed" && (
          <div>
            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Current Context</p>
            <button
              onClick={() => handleStart(suggestedTopic)}
              title={`Take a quiz about: ${suggestedTopic}`}
              className="w-full p-3 sm:p-4 bg-white border-2 border-indigo-100 rounded-xl sm:rounded-2xl text-left hover:border-indigo-400 hover:shadow-md transition-all group flex items-center justify-between"
            >
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">Latest Lesson</p>
                <p className="text-xs sm:text-sm font-black text-slate-700 truncate">{truncatedLabel}</p>
              </div>
              <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
              </div>
            </button>
          </div>
        )}

        <div>
          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Quick Picks</p>
          <div className="grid grid-cols-2 gap-2">
            {PREDEFINED_TOPICS.map((t) => (
              <button
                key={t.name}
                onClick={() => handleStart(t.name)}
                title={`Quiz on ${t.name}`}
                className="p-2.5 sm:p-3 bg-slate-50 border border-slate-100 rounded-lg sm:rounded-xl text-left hover:bg-white hover:border-orange-300 hover:shadow-sm transition-all flex items-center gap-2 group"
              >
                <span className="text-base sm:text-lg group-hover:scale-125 transition-transform">{t.emoji}</span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-600 truncate">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Custom Topic</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="e.g. Rocket Science..."
              className="flex-1 px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-rose-400 focus:bg-white transition-all text-xs sm:text-sm font-bold text-slate-700"
            />
            <button
              onClick={() => handleStart(customTopic)}
              disabled={!customTopic.trim()}
              title="Start Custom Quiz"
              className={`p-2.5 sm:p-3 rounded-xl transition-all shadow-lg ${
                !customTopic.trim() 
                  ? 'bg-slate-100 text-slate-300' 
                  : 'bg-rose-500 text-white hover:bg-rose-600 active:scale-90 shadow-rose-200'
              }`}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizSetup;
