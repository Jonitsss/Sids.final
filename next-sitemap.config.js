const siteUrl = "https://sidsiglesia.com.ar";

const protectedPaths = [
  "/login",
  "/register",
  "/dashboard",
  "/ministerios",
  "/ministerios/**",
  "/eventos",
  "/eventos/**",
  "/cronogramas",
  "/cronogramas/**",
  "/tareas",
  "/asistencia",
  "/notificaciones",
  "/perfil",
  "/reportes",
  "/usuarios",
];

/** @type {import('next-sitemap').SitemapConfig} */
const config = {
  siteUrl,
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: protectedPaths },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  },
  exclude: protectedPaths,
  changefreq: "monthly",
  priority: 1.0,
};

export default config;
