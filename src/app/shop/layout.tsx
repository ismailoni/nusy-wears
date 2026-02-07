import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Browse the Nusy Wears collection of premium eyewear and frames.',
  alternates: {
    canonical: '/shop',
  },
  openGraph: {
    title: 'Shop | Nusy Wears',
    description: 'Browse the Nusy Wears collection of premium eyewear and frames.',
    url: '/shop',
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
