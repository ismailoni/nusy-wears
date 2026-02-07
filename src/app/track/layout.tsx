import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track Order',
  description: 'Track your Nusy Wears order status using your tracking details.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/track',
  },
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
