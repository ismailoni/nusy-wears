import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Admin',
    template: '%s | Admin | Nusy Wears',
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      nosnippet: true,
      noarchive: true,
    },
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
