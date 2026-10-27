import type { Metadata } from 'next';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import './globals.css';
import { LanguageProvider, defaultLocale, Locale } from '@/core/i18n';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AuthModal } from '@/components/auth/AuthModal';

export const metadata: Metadata = {
  title: 'CoSpace - Reserva de Espacios de Coworking por Horas',
  description: 'Plataforma de reservas de coworking: escritorios, salas y cabinas por horas.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const initialLocale: Locale = cookieLocale === 'en' ? 'en' : defaultLocale;

  return (
    <html lang={initialLocale} className="light bg-[#f8fafc] text-slate-900" style={{ colorScheme: 'light' }}>
      <body className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-sky-200">
        <LanguageProvider initialLocale={initialLocale}>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Suspense fallback={null}>
            <AuthModal />
          </Suspense>
        </LanguageProvider>
      </body>
    </html>
  );
}
