import type { Metadata } from 'next';

export function generateMetadata({
  params,
}: {
  params: { id: string };
}): Metadata {
  const id = params.id;

  return {
    title: 'Product Details',
    description: 'View product details and choose lens options from Nusy Wears.',
    alternates: {
      canonical: `/product/${id}`,
    },
    openGraph: {
      title: 'Product Details | Nusy Wears',
      description: 'View product details and choose lens options from Nusy Wears.',
      url: `/product/${id}`,
    },
  };
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
