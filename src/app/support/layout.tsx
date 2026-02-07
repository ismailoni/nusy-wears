import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help with orders, delivery, payments, and product questions from Nusy Wears support.',
  alternates: {
    canonical: '/support',
  },
  openGraph: {
    title: 'Support | Nusy Wears',
    description: 'Get help with orders, delivery, payments, and product questions from Nusy Wears support.',
    url: '/support',
  },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
