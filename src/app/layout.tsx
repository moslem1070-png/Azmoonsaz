
'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// Metadata export is removed to fix the "use client" conflict.

function ForceRefresh() {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const key = `refreshed_${pathname}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, 'true');
        window.location.reload();
      }
    }
  }, [pathname, isClient]);

  return null; // This component renders nothing
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <title>آزمونساز</title>
        <meta name="description" content="یک سیستم آزمون آنلاین برای دانش آموزان و معلمان." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Kalameh:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-gradient-to-br from-[#302851] to-[#1A162E] min-h-screen">
        <FirebaseClientProvider>
          <ForceRefresh />
          {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
