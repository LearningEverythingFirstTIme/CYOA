@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    @apply scroll-smooth;
  }
  
  body {
    @apply bg-[#050508] text-white antialiased;
    font-family: var(--font-body);
  }
}

@layer components {
  .story-container {
    @apply max-w-3xl mx-auto px-4 py-8 min-h-screen;
  }
  
  .location-header {
    @apply font-mono text-xs tracking-[0.3em] uppercase mb-4 opacity-70;
  }
  
  .story-content {
    @apply text-lg leading-relaxed space-y-4;
  }
  
  .choice-button {
    @apply relative w-full text-left p-4 border border-white/20 rounded 
           transition-all duration-300 hover:border-cyan-400/60 
           hover:bg-white/5 group;
  }
  
  .choice-label {
    @apply font-mono text-xs tracking-wider text-pink-400 mb-1 block;
  }
  
  .choice-text {
    @apply text-white/90 group-hover:text-white transition-colors;
  }
  
  .choice-flavor {
    @apply text-xs text-white/40 mt-2 italic opacity-0 group-hover:opacity-100 
           transition-opacity duration-300;
  }
}
