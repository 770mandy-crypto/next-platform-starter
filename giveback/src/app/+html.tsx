import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Web only: Hebrew, right-to-left, and a mobile viewport.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="theme-color" content="#137A4F" />
        <meta name="description" content="GiveBack — מוסרים ומקבלים חפצים בחינם מהשכנים" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'body{background-color:#F6F5F1;}' }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
