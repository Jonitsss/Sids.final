import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/data/content";
import { Providers } from "./providers";
import "./globals.css";

const fullTitle = `${siteConfig.name} · ${siteConfig.shortName}`;
const ogImage = `${siteConfig.url}/assets/logo_sin_fondo.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: fullTitle,
    template: `%s · ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name }],
  generator: "Next.js",
  keywords: [
    "SIDS",
    "Santa Iglesia del Señor",
    "Iglesia",
    "Ingeniero Allan",
    "Arbol de Vida",
    "Evangelio",
    "Fe",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: fullTitle,
    title: fullTitle,
    description: siteConfig.description,
    url: siteConfig.url,
    locale: "es_AR",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: fullTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: fullTitle,
    description: siteConfig.description,
    images: [ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  icons: {
    icon: "/assets/logo_sin_fondo.png",
    apple: "/apple-touch-icon.png",
  },
  other: {
    "geo.region": "AR-B",
    "geo.placename": siteConfig.address.locality,
  },
};

export const viewport: Viewport = {
  themeColor: "#144137",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@200;350;400;500;550;700&family=Playfair+Display:ital,wght@0,400;1,300;1,400&family=Space+Mono:wght@400;700&family=Public+Sans:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@400;500;600;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
        />
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SIDS" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js');}`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if("scrollRestoration" in history){history.scrollRestoration="manual";}window.scrollTo(0,0);`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
