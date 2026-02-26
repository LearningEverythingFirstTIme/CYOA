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
      <body className="antialiased">
        <GameProvider>
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
