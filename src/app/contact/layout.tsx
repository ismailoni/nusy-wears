import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact Nusy Wears for support, inquiries, and custom eyewear requests.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact | Nusy Wears',
    description: 'Contact Nusy Wears for support, inquiries, and custom eyewear requests.',
    url: '/contact',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
