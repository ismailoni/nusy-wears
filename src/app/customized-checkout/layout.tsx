import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Customized Checkout',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CustomizedCheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
