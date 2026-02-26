import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'sonic-black': '#050508',
        'sonic-void': '#0a0a0f',
        'wave-cyan': '#00f0ff',
        'wave-pink': '#ff006e',
        'wave-amber': '#ff9f1c',
        'wave-purple': '#9d4edd',
      },
      fontFamily: {
        heading: ['Orbitron', 'sans-serif'],
        body: ['Crimson Text', 'serif'],
        mono: ['Share Tech Mono', 'monospace'],
        ui: ['Rajdhani', 'sans-serif'],
      },
      animation: {
        'equalizer-pulse': 'equalizerPulse 4s ease-in-out infinite',
        'text-vibrate': 'textVibrate 0.15s ease-in-out infinite',
        'waveform-flow': 'waveformFlow 3s linear infinite',
        'glitch-1': 'glitch-1 0.3s infinite linear alternate-reverse',
        'glitch-2': 'glitch-2 0.3s infinite linear alternate-reverse',
      },
      keyframes: {
        equalizerPulse: {
          '0%, 100%': { 
            borderColor: 'transparent',
            boxShadow: 'inset 0 0 30px rgba(0, 240, 255, 0.05), 0 0 30px rgba(0, 240, 255, 0.05)'
          },
          '50%': { 
            borderColor: 'rgba(255, 0, 110, 0.1)',
            boxShadow: 'inset 0 0 50px rgba(255, 0, 110, 0.15), 0 0 50px rgba(255, 0, 110, 0.15)'
          },
        },
        textVibrate: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-1px)' },
          '75%': { transform: 'translateX(1px)' },
        },
        waveformFlow: {
          '0%': { backgroundPosition: '100% 0' },
          '100%': { backgroundPosition: '-100% 0' },
        },
        'glitch-1': {
          '0%, 100%': { clipPath: 'inset(0 0 95% 0)', transform: 'translate(-2px, 0)' },
          '50%': { clipPath: 'inset(50% 0 20% 0)', transform: 'translate(2px, 0)' },
        },
        'glitch-2': {
          '0%, 100%': { clipPath: 'inset(95% 0 0 0)', transform: 'translate(2px, 0)' },
          '50%': { clipPath: 'inset(20% 0 50% 0)', transform: 'translate(-2px, 0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
