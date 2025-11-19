import React, { useState } from 'react';
import { Sparkles, ArrowRight, Wand2 } from 'lucide-react';

interface InputFormProps {
  onSubmit: (topic: string, text: string) => void;
  isGenerating: boolean;
}

const InputForm: React.FC<InputFormProps> = ({ onSubmit, isGenerating }) => {
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim() && text.trim()) {
      onSubmit(topic, text);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center relative">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"></div>
      
      <div className="relative w-full max-w-2xl p-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-brand-500/10 rounded-xl mb-4 border border-brand-500/20">
            <Wand2 className="w-8 h-8 text-brand-400" />
          </div>
          <h1 className="text-5xl font-serif font-bold text-white mb-4 tracking-tight">LuminaSlides</h1>
          <p className="text-slate-400 text-lg">Transform raw thoughts into cinematic presentations.</p>
        </div>

        <div className="glass-panel rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Presentation Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., The Future of Renewable Energy"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Raw Content / Notes</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your articles, notes, or rough ideas here..."
                className="w-full h-40 px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isGenerating || !topic || !text}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                isGenerating
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-brand-600 to-accent-500 hover:from-brand-500 hover:to-accent-400 text-white shadow-lg hover:shadow-brand-500/25'
              }`}
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-5 h-5 animate-spin" />
                  Analyzing Structure...
                </>
              ) : (
                <>
                  Generate Presentation
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center">
            <p className="text-slate-500 text-sm">Powered by Google Gemini & Imagen 3</p>
        </div>
      </div>
    </div>
  );
};

export default InputForm;
