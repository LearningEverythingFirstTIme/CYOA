import type { Metadata } from 'next';
import { GameProvider } from '@/app/contexts/GameContext';
import './globals.css';

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-sonic-black text-white min-h-screen overflow-x-hidden">
        <GameProvider>
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
