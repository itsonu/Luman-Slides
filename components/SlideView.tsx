import React, { useEffect, useRef } from 'react';
import { Slide, SlideLayout, MediaType } from '../types';
import { Loader2, Image as ImageIcon, Video, Sparkles, X, RefreshCw } from 'lucide-react';

interface SlideViewProps {
  slide: Slide;
  onGenerateMedia: (id: string, type: 'image' | 'video') => void;
  onUpdateSlide: (id: string, updates: Partial<Slide>) => void;
}

// Helper Component for Auto-Resizing Textareas
const AutoResizeTextarea = ({ 
  value, 
  onChange, 
  className, 
  placeholder, 
  minHeight 
}: { 
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  minHeight?: string;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
     if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);
  
  useEffect(() => {
      window.addEventListener('resize', adjustHeight);
      return () => window.removeEventListener('resize', adjustHeight);
  }, []);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className={`w-full bg-transparent border border-transparent hover:border-white/20 focus:border-brand-500/50 focus:bg-slate-900/50 rounded px-2 py-1 outline-none resize-none overflow-hidden transition-all ${className}`}
      style={{ minHeight }}
    />
  );
};

const SlideView: React.FC<SlideViewProps> = ({ slide, onGenerateMedia, onUpdateSlide }) => {
  
  const updateContentItem = (index: number, newVal: string) => {
    const newContent = [...slide.content];
    newContent[index] = newVal;
    onUpdateSlide(slide.id, { content: newContent });
  };

  const renderMediaPlaceholder = () => {
    if (slide.isLoadingMedia) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 z-20">
          <div className="relative">
            <div className="absolute inset-0 bg-brand-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
            <Loader2 className="w-10 h-10 text-brand-400 animate-spin relative z-10" />
          </div>
          <p className="text-slate-300 font-medium tracking-wide mt-4 text-sm animate-pulse">
            {slide.mediaType === MediaType.Video ? 'Veo is creating video...' : 'Imagen is painting pixels...'}
          </p>
        </div>
      );
    }

    if (slide.mediaUrl) {
      return (
        <div className="w-full h-full relative group">
             {slide.mediaType === MediaType.Video ? (
                <video 
                    src={slide.mediaUrl} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="w-full h-full object-cover rounded-lg shadow-2xl"
                />
             ) : (
                <img 
                  src={slide.mediaUrl} 
                  alt="Slide Visual" 
                  className="w-full h-full object-cover rounded-lg shadow-2xl"
                />
             )}
             
             {/* Overlay Controls for Media */}
             <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm z-10">
                 <button 
                    onClick={() => onUpdateSlide(slide.id, { mediaUrl: undefined, mediaType: MediaType.None })}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded-lg border border-red-500/30 transition-all"
                 >
                     <X className="w-4 h-4" /> Remove
                 </button>
                 <button 
                    onClick={() => onGenerateMedia(slide.id, slide.mediaType === MediaType.Video ? 'video' : 'image')}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/10 transition-all"
                 >
                     <RefreshCw className="w-4 h-4" /> Regenerate
                 </button>
             </div>
        </div>
      );
    }

    // Empty State - Editor Mode
    return (
      <div className="absolute inset-0 flex flex-col bg-slate-800 rounded-lg border-2 border-dashed border-slate-700 p-6 hover:border-brand-500/50 transition-colors group">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
             <div className="mb-4 p-3 rounded-full bg-slate-900 group-hover:bg-slate-800 transition-colors">
                <Sparkles className="w-6 h-6 text-slate-500 group-hover:text-brand-400 transition-colors" />
            </div>
            
            <div className="w-full max-w-md mb-6">
                <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 block">AI Image Prompt</label>
                <textarea
                    value={slide.imagePrompt}
                    onChange={(e) => onUpdateSlide(slide.id, { imagePrompt: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 placeholder-slate-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 outline-none resize-none transition-all hover:bg-slate-900"
                    rows={3}
                    placeholder="Describe the image you want..."
                />
            </div>

            <div className="flex gap-3 w-full max-w-xs">
            <button
                onClick={() => onGenerateMedia(slide.id, 'image')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-brand-600 hover:text-white rounded-md text-slate-200 transition-all text-sm font-medium shadow-lg shadow-black/20"
            >
                <ImageIcon className="w-4 h-4" />
                Image
            </button>
            <button
                onClick={() => onGenerateMedia(slide.id, 'video')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-purple-600 hover:text-white rounded-md text-slate-200 transition-all text-sm font-medium shadow-lg shadow-black/20"
            >
                <Video className="w-4 h-4" />
                Video
            </button>
            </div>
        </div>
      </div>
    );
  };

  const renderContent = () => (
    <div className="space-y-6 z-10 relative w-full">
      <div>
        <AutoResizeTextarea
            value={slide.title}
            onChange={(val) => onUpdateSlide(slide.id, { title: val })}
            className="text-4xl md:text-5xl font-serif font-bold text-white mb-4 leading-tight drop-shadow-sm -ml-2"
            placeholder="Slide Title"
        />
        {slide.subtitle && (
            <div className="flex border-l-4 border-brand-500 pl-4">
                 <AutoResizeTextarea
                    value={slide.subtitle}
                    onChange={(val) => onUpdateSlide(slide.id, { subtitle: val })}
                    className="text-xl text-brand-100 font-light tracking-wide -ml-2"
                    placeholder="Subtitle"
                />
            </div>
        )}
      </div>
      <ul className="space-y-4">
        {slide.content.map((point, idx) => (
          <li key={idx} className="flex items-start gap-3 text-lg text-slate-200 leading-relaxed group">
            <span className="mt-3 w-2 h-2 rounded-full bg-brand-500 shrink-0 group-hover:scale-125 transition-transform" />
            <AutoResizeTextarea
                value={point}
                onChange={(val) => updateContentItem(idx, val)}
                className="text-slate-200 -ml-2 flex-1"
            />
          </li>
        ))}
      </ul>
    </div>
  );

  // Layout Rendering Logic
  switch (slide.layout) {
    case SlideLayout.Title:
      return (
        <div className="w-full h-full relative flex flex-col items-center justify-center text-center p-12 overflow-hidden bg-gradient-to-br from-slate-900 via-brand-950 to-slate-950">
             {/* Background image with overlay if present */}
             {slide.mediaUrl && slide.mediaType === MediaType.Image && (
                <div className="absolute inset-0 z-0">
                    <img src={slide.mediaUrl} className="w-full h-full object-cover filter blur-sm opacity-40 scale-105 transform" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/50"></div>
                </div>
             )}
          <div className="relative z-10 max-w-4xl w-full flex flex-col items-center">
             <div className="mb-8 inline-block p-1 rounded-full bg-gradient-to-r from-brand-500 to-purple-600 shadow-lg shadow-brand-500/20">
                 <div className="bg-slate-950 rounded-full px-4 py-1 text-xs font-bold tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400">
                    AI Presentation
                 </div>
             </div>
            
            <AutoResizeTextarea
                value={slide.title}
                onChange={(val) => onUpdateSlide(slide.id, { title: val })}
                className="text-6xl md:text-7xl font-serif font-bold text-white mb-6 drop-shadow-2xl text-center placeholder-slate-600"
                placeholder="Presentation Title"
            />

            <AutoResizeTextarea
                value={slide.subtitle || slide.content[0] || ''}
                onChange={(val) => {
                     if (slide.subtitle !== undefined) {
                         onUpdateSlide(slide.id, { subtitle: val });
                     } else {
                        updateContentItem(0, val);
                     }
                }}
                className="text-2xl text-slate-300 font-light max-w-2xl mx-auto mb-12 text-center placeholder-slate-600"
                placeholder="Subtitle or Description"
            />
            
            {!slide.mediaUrl && !slide.isLoadingMedia && (
                <div className="flex flex-col items-center gap-4 animate-fade-in-up">
                     <button
                        onClick={() => onGenerateMedia(slide.id, 'image')}
                        className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md rounded-full text-white transition-all"
                    >
                        <Sparkles className="w-5 h-5 text-brand-400" />
                        Generate Title Background
                    </button>
                    <p className="text-xs text-slate-500">Uses prompt: "{slide.imagePrompt.slice(0,40)}..."</p>
                </div>
            )}
            {slide.isLoadingMedia && <div className="mt-8 flex items-center justify-center gap-2 text-brand-300"><Loader2 className="animate-spin" /> Designing title slide...</div>}
          </div>
        </div>
      );

    case SlideLayout.SplitLeft:
      return (
        <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 md:p-12 bg-slate-950">
          <div className="relative h-64 lg:h-auto min-h-[300px] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-inner">
            {renderMediaPlaceholder()}
          </div>
          <div className="flex flex-col justify-center">
            {renderContent()}
          </div>
        </div>
      );

    case SlideLayout.SplitRight:
      return (
        <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 md:p-12 bg-slate-950">
          <div className="flex flex-col justify-center order-2 lg:order-1">
            {renderContent()}
          </div>
          <div className="relative h-64 lg:h-auto min-h-[300px] order-1 lg:order-2 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-inner">
            {renderMediaPlaceholder()}
          </div>
        </div>
      );
    
    case SlideLayout.ImageHeavy:
        return (
            <div className="w-full h-full relative p-8 md:p-12 bg-slate-900">
                 <div className="absolute inset-0 z-0">
                    {renderMediaPlaceholder()}
                 </div>
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent z-10 pointer-events-none"></div>
                 <div className="relative z-20 h-full flex flex-col justify-end max-w-4xl w-full mx-auto">
                    <div className="bg-black/20 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                        <AutoResizeTextarea
                            value={slide.title}
                            onChange={(val) => onUpdateSlide(slide.id, { title: val })}
                            className="text-4xl font-bold text-white mb-4 drop-shadow-md -ml-2"
                        />
                        <div className="flex flex-wrap gap-3">
                            {slide.content.map((c, i) => (
                                <AutoResizeTextarea
                                    key={i}
                                    value={c}
                                    onChange={(val) => updateContentItem(i, val)}
                                    className="bg-brand-500/20 border border-brand-500/30 px-4 py-2 rounded-xl text-white/90 text-sm outline-none focus:bg-brand-500/40 transition-colors min-w-[150px]"
                                />
                            ))}
                        </div>
                    </div>
                 </div>
            </div>
        );
    
    case SlideLayout.Data:
        return (
            <div className="w-full h-full flex flex-col p-8 md:p-16 bg-slate-950">
                <div className="mb-8 border-b border-slate-800 pb-6">
                     <AutoResizeTextarea
                        value={slide.title}
                        onChange={(val) => onUpdateSlide(slide.id, { title: val })}
                        className="text-4xl font-bold text-white -ml-2"
                    />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
                    <div className="space-y-4">
                        {slide.content.map((point, idx) => (
                             <div key={idx} className="flex gap-4 items-center p-4 bg-slate-900 rounded-lg border border-slate-800">
                                <div className="w-12 h-12 rounded-full bg-brand-900 flex items-center justify-center text-brand-400 font-bold text-xl shrink-0">
                                    {idx + 1}
                                </div>
                                <AutoResizeTextarea
                                    value={point}
                                    onChange={(val) => updateContentItem(idx, val)}
                                    className="text-lg text-slate-200 -ml-2 font-medium"
                                />
                             </div>
                        ))}
                    </div>
                    <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 min-h-[300px]">
                         {renderMediaPlaceholder()}
                    </div>
                </div>
            </div>
        );

    default: // Center or Conclusion
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 md:p-16 bg-slate-950 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-500 to-purple-600" />
           
           <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 pointer-events-none bg-gradient-to-l from-brand-900 to-transparent"></div>

          <div className="max-w-4xl w-full text-center z-10 flex flex-col items-center">
            <AutoResizeTextarea
                value={slide.title}
                onChange={(val) => onUpdateSlide(slide.id, { title: val })}
                className="text-5xl font-serif