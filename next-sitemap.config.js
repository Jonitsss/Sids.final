const siteUrl = "https://sidsiglesia.com.ar";

/** @type {import('next-sitemap').SitemapConfig} */
const config = {
  siteUrl,
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [{ userAgent: "*", allow: "/" }],
    sitemap: `${siteUrl}/sitemap.xml`,
  },
  changefreq: "monthly",
  priority: 1.0,
};

export default config;
