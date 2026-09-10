import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Island Voice Lab',
  icons: { icon: '/favicon.svg' },
  description:
    'A multilingual robotic voice playground. Shape a character, synthesize speech locally, and export audio.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
