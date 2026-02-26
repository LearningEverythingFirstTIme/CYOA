import type { Metadata } from 'next';
import { GameProvider } from '@/app/contexts/GameContext';

export const metadata: Metadata = {
  title: 'The Silence Bureau',
  description: 'A sonic economy interactive fiction experience',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          @keyframes equalizerPulse {
            0%, 100% { border-color: transparent; box-shadow: inset 0 0 30px rgba(0, 240, 255, 0.05), 0 0 30px rgba(0, 240, 255, 0.05); }
            50% { border-color: rgba(255, 0, 110, 0.1); box-shadow: inset 0 0 50px rgba(255, 0, 110, 0.15), 0 0 50px rgba(255, 0, 110, 0.15); }
          }
          @keyframes textVibrate {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-1px); }
            75% { transform: translateX(1px); }
          }
          @keyframes glitch-1 {
            0%, 100% { clip-path: inset(0 0 95% 0); transform: translate(-2px, 0); }
            50% { clip-path: inset(50% 0 20% 0); transform: translate(2px, 0); }
          }
          @keyframes glitch-2 {
            0%, 100% { clip-path: inset(95% 0 0 0); transform: translate(2px, 0); }
            50% { clip-path: inset(20% 0 50% 0); transform: translate(-2px, 0); }
          }
          body::before {
            content: '';
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            pointer-events: none;
            z-index: 1000;
            border: 2px solid transparent;
            animation: equalizerPulse 4s ease-in-out infinite;
          }
          .vibrate-text { animation: textVibrate 0.15s ease-in-out infinite; }
          .glitch-text::before {
            content: attr(data-text);
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            animation: glitch-1 0.3s infinite linear alternate-reverse;
            color: #ff006e; z-index: -1;
          }
          .glitch-text::after {
            content: attr(data-text);
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            animation: glitch-2 0.3s infinite linear alternate-reverse;
            color: #00f0ff; z-index: -2;
          }
        `}</style>
      </head>
      <body className="antialiased bg-[#050508] text-white min-h-screen overflow-x-hidden">
        <GameProvider>
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
