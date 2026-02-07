import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nusy-wears-web.vercel.app/').replace(/\/$/, '');
  const lastModified = new Date();

  const routes = ['/', '/shop', '/contact', '/support', '/track'];

  return routes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
