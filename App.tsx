import React, { useState, useCallback, useEffect } from 'react';
import { Slide, GenerationStatus, MediaType, SlideLayout } from './types';
import { generatePresentationStructure, generateSlideImage, generateSlideVideo, refineImagePrompt } from './services/gemini';
import InputForm from './components/InputForm';
import SlideView from './components/SlideView';
import { Layout, Play, Download, ChevronLeft, ChevronRight, Plus, Trash2, ArrowUp, ArrowDown, RotateCcw, RotateCw, Save, FilePlus, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'lumina-project-data';

const App: React.FC = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [presentationTitle, setPresentationTitle] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // History Management
  const [history, setHistory] = useState<{slides: Slide[], title: string}[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isRestoringHistory, setIsRestoringHistory] = useState(false);

  // --- Persistence ---
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const { slides: savedSlides, title: savedTitle, status: savedStatus } = JSON.parse(savedData);
        if (savedSlides && savedSlides.length > 0) {
          setSlides(savedSlides);
          setPresentationTitle(savedTitle);
          setStatus('complete');
          // Initialize history with loaded state
          setHistory([{ slides: savedSlides, title: savedTitle }]);
          setHistoryIndex(0);
        }
      } catch (e) {
        console.error("Failed to load saved project", e);
      }
    }
  }, []);

  useEffect(() => {
    if (status === 'complete' && slides.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        slides,
        title: presentationTitle,
        status
      }));
    }
  }, [slides, presentationTitle, status]);

  // --- History Logic ---
  const pushToHistory = useCallback((newSlides: Slide[], newTitle: string) => {
      setHistory(prev => {
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push({ slides: newSlides, title: newTitle });
          // Keep history size manageable (e.g., max 30 steps)
          if (newHistory.length > 30) newHistory.shift(); 
          return newHistory;
      });
      setHistoryIndex(prev => {
          const nextIndex = prev + 1;
          // Adjust index if we shifted the array
          return history.length > 30 ? 29 : nextIndex; 
      });
  }, [history, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      setIsRestoringHistory(true);
      const prevState = history[historyIndex - 1];
      setSlides(prevState.slides);
      setPresentationTitle(prevState.title);
      setHistoryIndex(historyIndex - 1);
      // Restore flag reset in useEffect or next tick
      setTimeout(() => setIsRestoringHistory(false), 0);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setIsRestoringHistory(true);
      const nextState = history[historyIndex + 1];
      setSlides(nextState.slides);
      setPresentationTitle(nextState.title);
      setHistoryIndex(historyIndex + 1);
      setTimeout(() => setIsRestoringHistory(false), 0);
    }
  };

  const deleteProject = () => {
      if (window.confirm("Are you sure you want to delete this project? This cannot be undone.")) {
          localStorage.removeItem(STORAGE_KEY);
          setSlides([]);
          setPresentationTitle('');
          setStatus('idle');
          setHistory([]);
          setHistoryIndex(-1);
      }
  };

  // --- Media Generation ---
  const generateMediaForSlide = useCallback(async (slideId: string, type: 'image' | 'video') => {
    // Snapshot before media generation
    pushToHistory(slides, presentationTitle);

    const slide = slides.find(s => s.id === slideId);
    if (!slide) return;

    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, isLoadingMedia: true, mediaType: type === 'video' ? MediaType.Video : MediaType.Image } : s));

    let mediaUrl: string | null = null;

    try {
        let activePrompt = slide.imagePrompt;
        
        if (activePrompt.length < 100 && !activePrompt.includes(",")) {
             try {
                 activePrompt = await refineImagePrompt(slide.imagePrompt, slide.title);
             } catch (err) {
                 console.warn("Prompt refinement failed, using original.", err);
             }
        }

        if (type === 'video') {
             mediaUrl = await generateSlideVideo(activePrompt);
        } else {
             mediaUrl = await generateSlideImage(activePrompt);
        }
    } catch (e) {
        console.error(e);
        setSlides(prev => prev.map(s => s.id === slideId ? { ...s, isLoadingMedia: false, mediaType: MediaType.None } : s));
        alert("Media generation failed. Please try again.");
        return;
    }

    const updatedSlides = slides.map(s => 
      s.id === slideId 
        ? { ...s, isLoadingMedia: false, mediaUrl: mediaUrl || undefined, mediaType: mediaUrl ? (type === 'video' ? MediaType.Video : MediaType.Image) : MediaType.None } 
        : s
    );
    
    setSlides(updatedSlides);
    pushToHistory(updatedSlides, presentationTitle); // Snapshot after success
  }, [slides, presentationTitle, pushToHistory]);

  // --- Generation & Editing ---

  const handleGenerateStructure = async (topic: string, rawText: string) => {
    setStatus('analyzing');
    setPresentationTitle(topic);
    try {
      const generatedSlides = await generatePresentationStructure(topic, rawText);
      setSlides(generatedSlides);
      setStatus('complete');
      
      // Init History
      setHistory([{ slides: generatedSlides, title: topic }]);
      setHistoryIndex(0);
      
      // Auto-generate title slide image
      if (generatedSlides.length > 0) {
         const firstSlide = generatedSlides[0];
         setSlides(prev => prev.map((s, i) => i === 0 ? { ...s, isLoadingMedia: true, mediaType: MediaType.Image } : s));
         
         refineImagePrompt(firstSlide.imagePrompt, firstSlide.title).then(refinedPrompt => {
             generateSlideImage(refinedPrompt).then(url => {
                 if (url) {
                     setSlides(prev => {
                         const withImg = prev.map((s, i) => i === 0 ? { ...s, isLoadingMedia: false, mediaUrl: url, mediaType: MediaType.Image } : s);
                         // We don't push to history here to avoid cluttering history with async auto-load, 
                         // or we could if we want "undo auto-generation". Let's skip for now to keep history clean.
                         return withImg;
                     });
                 } else {
                     setSlides(prev => prev.map((s, i) => i === 0 ? { ...s, isLoadingMedia: false, mediaType: MediaType.None } : s));
                 }
             });
         });
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
      alert("Failed to generate structure. Please check your API key.");
    }
  };

  // Called instantly on keystrokes to keep UI responsive
  const handleSlideUpdate = (id: string, updates: Partial<Slide>) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  // Called onBlur or when a major action finishes
  const saveSnapshot = () => {
      if (isRestoringHistory) return;
      
      // Check if state is actually different from last history state to avoid dupes
      const lastState = history[historyIndex];
      if (lastState && JSON.stringify(lastState.slides) === JSON.stringify(slides)) return;

      pushToHistory(slides, presentationTitle);
  };

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) setCurrentSlideIndex(prev => prev + 1);
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) setCurrentSlideIndex(prev => prev - 1);
  };

  const addSlide = () => {
    pushToHistory(slides, presentationTitle); // Save state before adding
    const newSlide: Slide = {
        id: `slide-${Date.now()}`,
        layout: SlideLayout.SplitRight,
        title: 'New Slide',
        content: ['Click to edit point 1', 'Click to edit point 2'],
        imagePrompt: 'A professional office background, cinematic lighting',
        mediaType: MediaType.None,
    };
    const newSlides = [...slides];
    newSlides.splice(currentSlideIndex + 1, 0, newSlide);
    setSlides(newSlides);
    setCurrentSlideIndex(currentSlideIndex + 1);
    pushToHistory(newSlides, presentationTitle); // Save state after adding
  };

  const deleteSlide = (index: number, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (slides.length <= 1) {
          alert("Presentation must have at least one slide.");
          return;
      }
      pushToHistory(slides, presentationTitle); // Save state before delete
      const newSlides = slides.filter((_, i) => i !== index);
      setSlides(newSlides);
      if (currentSlideIndex >= index && currentSlideIndex > 0) {
          setCurrentSlideIndex(currentSlideIndex - 1);
      }
      pushToHistory(newSlides, presentationTitle); // Save state after delete
  };

  const moveSlide = (fromIndex: number, direction: 'up' | 'down', e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (direction === 'up' && fromIndex === 0) return;
      if (direction === 'down' && fromIndex === slides.length - 1) return;

      pushToHistory(slides, presentationTitle); // Save state before move
      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
      const newSlides = [...slides];
      const [movedSlide] = newSlides.splice(fromIndex, 1);
      newSlides.splice(toIndex, 0, movedSlide);
      
      setSlides(newSlides);
      if (currentSlideIndex === fromIndex) {
          setCurrentSlideIndex(toIndex);
      } else if (currentSlideIndex === toIndex) {
          setCurrentSlideIndex(fromIndex);
      }
      pushToHistory(newSlides, presentationTitle); // Save state after move
  };

  const changeLayout = (layout: SlideLayout) => {
      if (!slides[currentSlideIndex]) return;
      pushToHistory(slides, presentationTitle); // Save before
      
      // Update state immediately
      const newSlides = slides.map(s => s.id === slides[currentSlideIndex].id ? { ...s, layout } : s);
      setSlides(newSlides);
      
      pushToHistory(newSlides, presentationTitle); // Save after
  };

  // Early return for input view
  if (status === 'idle' || status === 'analyzing') {
    return <InputForm onSubmit={handleGenerateStructure} isGenerating={status === 'analyzing'} />;
  }

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="flex h-screen bg-slate-950 text-white font-sans overflow-hidden">
      
      {/* Sidebar - Slide Management */}
      <div className="w-72 border-r border-slate-800 bg-slate-900/95 flex flex-col hidden md:flex z-30">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
           <div className="flex items-center justify-between mb-2">
               <h3 className="font-bold text-brand-100 truncate max-w-[180px]">{presentationTitle}</h3>
               <div className="flex items-center gap-1">
                   <button 
                        onClick={deleteProject}
                        className="p-1.5 hover:bg-red-900/30 rounded text-slate-400 hover:text-red-400 transition-colors" 
                        title="New Project (Delete Current)"
                    >
                        <FilePlus className="w-4 h-4" />
                    </button>
               </div>
           </div>
           <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-500">{slides.length} Slides</p>
                <button onClick={addSlide} className="p-1 hover:bg-slate-800 rounded text-brand-400 hover:text-brand-300 transition-colors" title="Add Slide">
                    <Plus className="w-4 h-4" />
                </button>
           </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {slides.map((slide, idx) => (
            <div 
              key={slide.id}
              onClick={() => setCurrentSlideIndex(idx)}
              className={`group relative aspect-video bg-slate-800 rounded-lg border-2 transition-all overflow-hidden cursor-pointer ${
                idx === currentSlideIndex ? 'border-brand-500 shadow-lg shadow-brand-500/20 ring-1 ring-brand-500/50' : 'border-transparent hover:border-slate-600'
              }`}
            >
               {/* Mini preview content mockup */}
              <div className="p-2 transform scale-50 origin-top-left w-[200%] h-[200%] pointer-events-none absolute top-0 left-0">
                 <h1 className="text-slate-400 text-lg font-bold truncate w-3/4">{slide.title}</h1>
                 <div className="space-y-1 mt-2">
                    <div className="h-1.5 bg-slate-700 rounded w-2/3"></div>
                    <div className="h-1.5 bg-slate-700 rounded w-1/2"></div>
                 </div>
              </div>
              
              {/* Thumbnail Image Overlay if available */}
              {slide.mediaUrl && slide.mediaType === MediaType.Image && (
                  <img src={slide.mediaUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" />
              )}
               {slide.mediaUrl && slide.mediaType === MediaType.Video && (
                 <div className="absolute inset-0 w-full h-full bg-black/50 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white/80" />
                 </div>
              )}

              {/* Slide Number */}
              <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 rounded text-[10px] font-mono text-white z-10">
                {idx + 1}
              </div>

              {/* Hover Actions */}
              <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded p-1 z-20">
                   <button onClick={(e) => deleteSlide(idx, e)} className="p-1 hover:bg-red-500/50 rounded text-white"><Trash2 className="w-3 h-3" /></button>
                   <button onClick={(e) => moveSlide(idx, 'up', e)} className="p-1 hover:bg-slate-500/50 rounded text-white"><ArrowUp className="w-3 h-3" /></button>
                   <button onClick={(e) => moveSlide(idx, 'down', e)} className="p-1 hover:bg-slate-500/50 rounded text-white"><ArrowDown className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
          <button 
            onClick={addSlide}
            className="w-full py-4 border-2 border-dashed border-slate-800 hover:border-brand-500/50 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:text-brand-400 transition-colors gap-2 group"
          >
              <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium">Add New Slide</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative bg-slate-950">
        
        {/* Toolbar */}
        <div className="h-14 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between px-4 z-20 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 mr-4">
                <button 
                    onClick={undo} 
                    disabled={historyIndex <= 0}
                    className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Undo"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
                <button 
                    onClick={redo} 
                    disabled={historyIndex >= history.length - 1}
                    className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Redo"
                >
                    <RotateCw className="w-4 h-4" />
                </button>
                <div className="text-xs text-slate-600 flex items-center gap-1 ml-2 select-none">
                    <CheckCircle2 className="w-3 h-3 text-green-900" />
                    <span className="hidden lg:inline">Saved locally</span>
                </div>
            </div>
            
            <button className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white md:hidden">
               <Layout className="w-5 h-5" />
            </button>
            
            {/* Layout Selector */}
            <div className="flex items-center gap-2 border-l border-slate-700 pl-4">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider hidden lg:block">Layout</span>
                <select 
                    value={currentSlide?.layout} 
                    onChange={(e) => changeLayout(e.target.value as SlideLayout)}
                    className="bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-brand-500 outline-none"
                >
                    <option value={SlideLayout.Title}>Title Slide</option>
                    <option value={SlideLayout.SplitLeft}>Split Left</option>
                    <option value={SlideLayout.SplitRight}>Split Right</option>
                    <option value={SlideLayout.Center}>Center Focus</option>
                    <option value={SlideLayout.ImageHeavy}>Image Heavy</option>
                    <option value={SlideLayout.Data}>Data Points</option>
                    <option value={SlideLayout.Conclusion}>Conclusion</option>
                </select>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => alert("Export feature coming soon!")}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button 
               onClick={() => {
                   const elem = document.documentElement;
                   if (!isFullScreen) {
                       if (elem.requestFullscreen) elem.requestFullscreen();
                       setIsFullScreen(true);
                   } else {
                       if (document.exitFullscreen) document.exitFullscreen();
                       setIsFullScreen(false);
                   }
               }}
               className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white text-sm font-bold rounded-full shadow-lg shadow-brand-500/20 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              Present
            </button>
          </div>
        </div>

        {/* Slide Stage */}
        <div className="flex-1 bg-black/50 relative overflow-hidden flex items-center justify-center p-4 md:p-8">
            {/* Viewport Container for Aspect Ratio */}
            <div className="w-full max-w-6xl aspect-video bg-slate-950 shadow-2xl relative overflow-hidden ring-1 ring-slate-800 rounded-sm">
               {currentSlide && (
                 <SlideView 
                    slide={currentSlide} 
                    onGenerateMedia={generateMediaForSlide}
                    onUpdateSlide={handleSlideUpdate}
                    onCommitEdit={saveSnapshot}
                 />
               )}
            </div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-6 z-20">
           <div className="flex items-center gap-4">
               <button 
                 onClick={prevSlide}
                 disabled={currentSlideIndex === 0}
                 className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
               >
                   <ChevronLeft className="w-5 h-5" />
               </button>
               <span className="text-sm font-mono text-slate-400">
                 Slide {currentSlideIndex + 1} <span className="text-slate-600">/</span> {slides.length}
               </span>
               <button 
                 onClick={nextSlide}
                 disabled={currentSlideIndex === slides.length - 1}
                 className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
               >
                   <ChevronRight className="w-5 h-5" />
               </button>
           </div>

           {currentSlide && currentSlide.notes && (
             <div className="flex-1 mx-8 hidden lg:block">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Speaker Notes</span>
                </div>
                <div className="text-xs text-slate-400 truncate border-l-2 border-slate-700 pl-2 py-1 italic">
                   {currentSlide.notes}
                </div>
             </div>
           )}

           <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded bg-slate-800 text-xs font-mono text-slate-400 border border-slate-700">
                    {currentSlide?.layout}
                </span>
           </div>
        </div>

      </div>
    </div>
  );
};

export default App;