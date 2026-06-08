import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/data/content";
import "@/styles/global.css";

const fullTitle = `${siteConfig.name} · ${siteConfig.shortName}`;
const ogImage = `${siteConfig.url}/assets/logo.png`;

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
    icon: "/assets/logo.png",
    apple: "/assets/logo.png",
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@200;350;400;500;550;700&family=Playfair+Display:ital,wght@0,400;1,300;1,400&family=Space+Mono:wght@400;700&display=swap"
        />
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
        <script
          dangerouslySetInnerHTML={{
            __html: `if("scrollRestoration" in history){history.scrollRestoration="manual";}window.scrollTo(0,0);`,
          }}
        />
      </head>
      <body className="loading">{children}</body>
    </html>
  );
}
