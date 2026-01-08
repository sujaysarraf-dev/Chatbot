
import React, { useState, useRef, useEffect } from 'react';
import { Role, Message } from './types';
import { sendMessageToGemini, generateQuiz, generateImage } from './services/geminiService';
import { 
  fetchSessions,
  createSession,
  saveMessage,
  fetchMessagesBySession,
  fetchBookmarkedMessages,
  updateMessageImageData,
  updateSessionTitle,
  uploadImageToBucket,
  deleteSession
} from './services/supabase';
import ChatMessage from './components/ChatMessage';

interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
    length: number;
  };
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const App: React.FC = () => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<Message[]>([]);
  const [sidebarTab, setSidebarTab] = useState<'history' | 'bookmarks'>('history');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [showMagicTools, setShowMagicTools] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const sessionList = await fetchSessions();
        if (sessionList && sessionList.length > 0) {
          setSessions(sessionList);
          await loadSession(sessionList[0].id);
        } else {
          await startNewChat(true);
        }
        const bms = await fetchBookmarkedMessages();
        setBookmarks(bms);
      } catch (e) {
        console.warn("Suji: Local mode triggered.");
        await startNewChat(true);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
        setInput(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return alert("Speech recognition not supported.");
    if (isListening) recognitionRef.current.stop();
    else { setIsListening(true); recognitionRef.current.start(); }
  };

  const startNewChat = async (skipConfirm: boolean = false) => {
    if (isLoading && !skipConfirm) {
      const confirmAbort = window.confirm("Suji is still thinking. Start a new chat anyway?");
      if (!confirmAbort) return;
    }

    setIsLoading(true);
    setInput('');
    setSelectedImage(null);
    setShowMagicTools(false);
    setShowSidebar(false);

    try {
      const session = await createSession("New Chat...");
      const activeSessionId = session.id;
      
      const welcome: Message = { 
        id: 'w-' + Date.now(), 
        role: Role.MODEL, 
        text: "Hi! I'm Suji. What should we explore today?", 
        timestamp: new Date() 
      };
      
      setCurrentSessionId(activeSessionId);
      setMessages([welcome]);
      
      if (!activeSessionId.toString().startsWith('local-')) {
        const saved = await saveMessage(activeSessionId, welcome);
        if (saved) {
           welcome.id = saved.id;
           setMessages([welcome]);
        }
      }
      
      setSessions(prev => [session, ...prev]);
    } catch (e) {
      const localId = `local-${Date.now()}`;
      setCurrentSessionId(localId);
      setMessages([{ 
        id: 'w-' + Date.now(), 
        role: Role.MODEL, 
        text: "Hi! I'm Suji. (Offline Mode Active)", 
        timestamp: new Date() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSession = async (sessionId: string) => {
    setIsLoading(true);
    try {
      setCurrentSessionId(sessionId);
      const history = await fetchMessagesBySession(sessionId);
      setMessages(history.length > 0 ? history : []);
      setShowSidebar(false);
    } catch (e) { 
      console.error("Failed to load session", e);
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this chat permanently from your library?")) return;
    
    try {
      // 1. Delete from Database
      await deleteSession(sessionId);
      
      // 2. Update UI
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(updatedSessions);

      // 3. If the deleted session was the active one, switch to another
      if (currentSessionId === sessionId) {
        if (updatedSessions.length > 0) {
          await loadSession(updatedSessions[0].id);
        } else {
          await startNewChat(true);
        }
      }
    } catch (err) {
      console.error("Deletion failed:", err);
      alert("Oops! Could not delete the chat. Please try again.");
    }
  };

  const handleClearAll = () => {
    // Note: For safety, this just clears the UI list in this session.
    // Full database wipe would require a bulk delete service call.
    if (!window.confirm("Clear library view? (History remains in cloud)")) return;
    setSessions([]);
    setMessages([{ id: 'empty', role: Role.MODEL, text: "History hidden. Tap '+ New Topic' to start again!", timestamp: new Date() }]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (re) => setSelectedImage(re.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDirectVisualise = async (content: string, messageId: string) => {
    if (!currentSessionId) return;
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isGeneratingImage: true } : m));
    try {
      const primaryTopic = content.split('\n')[0].substring(0, 100);
      const prompt = `Educational diagram showing: ${primaryTopic}. Clean infographic style.`;
      const base64Img = await generateImage(prompt);
      if (base64Img) {
        const imageUrl = await uploadImageToBucket(base64Img);
        const finalImageData = imageUrl || base64Img;
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, imageData: finalImageData, isGeneratingImage: false } : m));
        if (!currentSessionId.startsWith('local-')) {
          await updateMessageImageData(messageId, finalImageData);
        }
      } else {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isGeneratingImage: false } : m));
      }
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isGeneratingImage: false } : m));
    }
  };

  const handleSend = async (textOverride?: string, withLove: boolean = false) => {
    const text = (textOverride || input).trim();
    if (!currentSessionId || (!text && !selectedImage) || isLoading) return;
    if (isListening) recognitionRef.current?.stop();
    setShowMagicTools(false);

    const isFirstUserMessage = !messages.some(m => m.role === Role.USER);
    if (isFirstUserMessage && !currentSessionId.startsWith('local-')) {
      const cleanText = text.replace(/[^\w\s]/gi, '').trim();
      const newTitle = cleanText.length > 25 ? cleanText.substring(0, 25) + '...' : (cleanText || "Chat");
      updateSessionTitle(currentSessionId, `Chat: ${newTitle}`);
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title: `Chat: ${newTitle}` } : s));
    }

    let userImageUrl = selectedImage;
    if (selectedImage && selectedImage.startsWith('data:image')) {
      const uploadedUrl = await uploadImageToBucket(selectedImage);
      userImageUrl = uploadedUrl || selectedImage;
    }

    const tempId = 'u-' + Date.now();
    const userMsg: Message = { 
      id: tempId, 
      role: Role.USER, 
      text: text || (withLove ? "Sending love! ❤️" : "Explain this!"), 
      timestamp: new Date(), 
      imageData: userImageUrl || undefined,
      isLoveEffect: withLove
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput(''); setSelectedImage(null); setIsLoading(true);

    if (!currentSessionId.startsWith('local-')) {
      const saved = await saveMessage(currentSessionId, userMsg);
      if (saved) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: saved.id } : m));
      }
    }
    
    try {
      let botMsg: Message;
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes("imagine") || lowerText.includes("draw") || text.startsWith("Imagine this concept:")) {
        const prompt = text.startsWith("Imagine this concept:") ? text.replace("Imagine this concept:", "") : text;
        const base64Img = await generateImage(prompt);
        let finalBotImg = undefined;
        if (base64Img) {
          const uploadedUrl = await uploadImageToBucket(base64Img);
          finalBotImg = uploadedUrl || base64Img;
        }
        botMsg = { id: 'b-' + Date.now(), role: Role.MODEL, text: finalBotImg ? `Here is your Suji Diagram!` : "I couldn't draw that right now.", imageData: finalBotImg || undefined, timestamp: new Date(), suggestions: ["Explain it"] };
      } else if (lowerText.includes("quiz") && !text.startsWith("START_QUIZ:")) {
        botMsg = { id: 'b-' + Date.now(), role: Role.MODEL, text: "Assessment ready! Pick a topic.", timestamp: new Date(), isQuizSetup: true, suggestedTopic: messages.length > 0 ? messages[messages.length-1].text : "General Learning" };
      } else if (text.startsWith("START_QUIZ:")) {
        const topic = text.replace("START_QUIZ:", "");
        const data = await generateQuiz(topic);
        botMsg = { id: 'b-' + Date.now(), role: Role.MODEL, text: `Quiz on ${topic}`, timestamp: new Date(), quizData: data || undefined };
      } else {
        const res = await sendMessageToGemini(text, messages, userMsg.imageData);
        botMsg = { id: 'b-' + Date.now(), role: Role.MODEL, text: res.text, timestamp: new Date(), suggestions: res.suggestions, sources: res.sources };
      }
      
      const tempBotId = botMsg.id;
      setMessages(prev => [...prev, botMsg]);
      
      if (!currentSessionId.startsWith('local-')) {
        const saved = await saveMessage(currentSessionId, botMsg);
        if (saved) {
          setMessages(prev => prev.map(m => m.id === tempBotId ? { ...m, id: saved.id } : m));
        }
      }
    } catch (e) { 
      setMessages(prev => [...prev, { id: 'e-' + Date.now(), role: Role.MODEL, text: "Snag! Try again?", timestamp: new Date() }]);
    } finally { setIsLoading(false); }
  };

  useEffect(() => { 
    if (showSidebar && sidebarTab === 'bookmarks') {
      fetchBookmarkedMessages().then(setBookmarks);
    }
  }, [showSidebar, sidebarTab]);

  useEffect(() => { 
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-slate-50 overflow-hidden relative">
      {/* Sidebar Overlay */}
      {showSidebar && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]" onClick={() => setShowSidebar(false)} />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 right-0 w-[300px] bg-white shadow-2xl z-[70] transition-transform duration-300 ${showSidebar ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="p-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-black text-xs uppercase tracking-widest text-slate-800">Library</h2>
            {sidebarTab === 'history' && sessions.length > 0 && (
               <button 
                 onClick={handleClearAll}
                 className="p-1 px-2 text-[8px] font-black uppercase text-rose-500 bg-rose-50 rounded-md hover:bg-rose-100 transition-colors"
               >
                 Clear View
               </button>
            )}
          </div>
          <button onClick={() => setShowSidebar(false)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">✕</button>
        </div>
        <div className="flex bg-slate-50 p-1 mx-4 mt-4 rounded-xl shadow-inner border border-slate-100">
          <button onClick={() => setSidebarTab('history')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${sidebarTab === 'history' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>History</button>
          <button onClick={() => setSidebarTab('bookmarks')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${sidebarTab === 'bookmarks' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>Bookmarks</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {sidebarTab === 'history' ? (
            <>
              <button onClick={() => startNewChat()} className="w-full p-3 border-2 border-dashed border-indigo-100 rounded-xl text-indigo-600 font-black text-[10px] uppercase hover:bg-indigo-50 mb-2 transition-all">+ New Topic</button>
              {sessions.length === 0 ? (
                <div className="py-10 text-center opacity-30 italic text-[10px] font-black uppercase text-slate-400 tracking-widest">No history yet</div>
              ) : (
                sessions.map(s => (
                  <div key={s.id} className="relative group">
                    <button onClick={() => loadSession(s.id)} className={`w-full p-3 rounded-xl border text-left transition-all ${s.id === currentSessionId ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-100 hover:border-indigo-200'}`}>
                      <p className="text-xs font-black truncate pr-8">{s.title || "Study Session"}</p>
                      <p className={`text-[8px] uppercase mt-1 ${s.id === currentSessionId ? 'text-indigo-100' : 'text-slate-400'}`}>{new Date(s.created_at).toLocaleDateString()}</p>
                    </button>
                    <button 
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${s.id === currentSessionId ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'}`}
                      title="Delete History Permanently"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))
              )}
            </>
          ) : (
            bookmarks.map(bm => (
              <div key={bm.id} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm border-l-4 border-l-amber-400 group">
                <p className="text-xs font-medium text-slate-600 line-clamp-2 leading-relaxed mb-2">"{bm.text}"</p>
                <button onClick={() => loadSession(bm.session_id!)} className="text-[8px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-colors">View Context →</button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FIXED HEADER */}
      <header className="glass shrink-0 h-16 border-b flex items-center justify-between px-4 sm:px-6 z-[40]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-100">S</div>
          <div>
            <h1 className="font-black text-slate-800 text-sm leading-tight">Suji</h1>
            <p className="text-[9px] font-black uppercase text-indigo-500 tracking-widest flex items-center gap-1">
              <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span> Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleSend("Give me a quiz!")} className="p-2 bg-rose-50 text-rose-500 rounded-lg shadow-sm active:scale-95 hover:bg-rose-100 transition-all" title="Quiz">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          </button>
          <button onClick={() => setShowSidebar(true)} className="p-2 bg-slate-50 text-slate-600 rounded-lg active:scale-95 hover:bg-slate-100 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </button>
        </div>
      </header>

      {/* SCROLLABLE MAIN */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar overscroll-contain relative z-10">
        <div className="max-w-3xl mx-auto w-full">
          {messages.map((m, i) => (
            <ChatMessage 
              key={m.id || i} 
              message={m} 
              onStartQuiz={(t) => handleSend(`START_QUIZ:${t}`)} 
              onMagicAction={(act, { text, id }) => act === 'Imagine' ? handleDirectVisualise(text, id) : handleSend(`${act} this concept: ${text}`)} 
            />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 p-3 bg-white border border-indigo-50 rounded-2xl w-max shadow-sm animate-pulse mb-8">
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
            </div>
          )}
          <div ref={scrollRef} className="h-12" />
        </div>
      </main>

      {/* FIXED FOOTER */}
      <footer className="shrink-0 p-3 sm:p-5 bg-white border-t border-slate-100 z-[40]">
        <div className="max-w-3xl mx-auto">
          {selectedImage && (
            <div className="relative w-16 h-16 mb-3 rounded-xl overflow-hidden border-2 border-indigo-500 shadow-xl group animate-message">
              <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
              <button onClick={() => setSelectedImage(null)} className="absolute top-0 right-0 p-1 bg-black/50 text-white rounded-bl-lg hover:bg-rose-500 transition-colors">✕</button>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
              </button>
              
              <button onClick={toggleListening} className={`p-3 rounded-xl shadow-sm active:scale-95 transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400 hover:text-rose-500'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 00-3 3v8a3 3 0 006 0V5a3 3 0 00-3-3z" /></svg>
              </button>

              <button onClick={() => setShowMagicTools(!showMagicTools)} className={`p-3 rounded-xl shadow-sm active:scale-95 transition-all ${showMagicTools ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 hover:text-indigo-600'}`} title="Magic Tools">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </button>
              
              <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/5 focus-within:border-indigo-400 transition-all shadow-sm">
                <textarea 
                  rows={1}
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
                  placeholder={isListening ? "Listening..." : "Ask Suji..."} 
                  className="flex-1 p-3.5 bg-transparent focus:outline-none text-sm font-medium resize-none" 
                />
                <button onClick={() => handleSend()} disabled={!input.trim() && !selectedImage} className={`p-2.5 m-1 rounded-xl transition-all ${(!input.trim() && !selectedImage) ? 'text-slate-300' : 'bg-indigo-600 text-white shadow-lg active:scale-90'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
            </div>

            <div className={`flex items-center gap-2 overflow-x-auto no-scrollbar transition-all duration-300 ${showMagicTools ? 'max-h-12 opacity-100 mt-1' : 'max-h-0 opacity-0 pointer-events-none'}`}>
              {[
                { l: 'Simplify ✨', a: 'Simplify this.' },
                { l: 'ELI5 👶', a: 'Explain like I am 5.' },
                { l: 'Example 💡', a: 'Give me a real world example.' }
              ].map(t => (
                <button key={t.l} onClick={() => handleSend(t.a)} className="whitespace-nowrap px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-[10px] font-black uppercase shadow-sm hover:bg-indigo-600 hover:text-white active:scale-95 transition-all">{t.l}</button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
