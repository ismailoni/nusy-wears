import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nusy-wears-web.vercel.app/';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/cart/', '/checkout/', '/customized-checkout/'],
    },
    sitemap: `${siteUrl.replace(/\/$/, '')}/sitemap.xml`,
  };
}
