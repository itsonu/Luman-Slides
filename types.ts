export enum SlideLayout {
  Title = 'title',
  SplitLeft = 'split-left',
  SplitRight = 'split-right',
  Center = 'center',
  ImageHeavy = 'image-heavy',
  Data = 'data',
  Conclusion = 'conclusion'
}

export enum MediaType {
  None = 'none',
  Image = 'image',
  Video = 'video'
}

export interface Slide {
  id: string;
  layout: SlideLayout;
  title: string;
  subtitle?: string;
  content: string[];
  imagePrompt: string;
  mediaType: MediaType;
  mediaUrl?: string;
  isLoadingMedia?: boolean;
  notes?: string;
}

export interface Presentation {
  title: string;
  slides: Slide[];
}

export type GenerationStatus = 'idle' | 'analyzing' | 'structuring' | 'visualizing' | 'complete' | 'error';
