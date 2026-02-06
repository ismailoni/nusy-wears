'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Product } from '@/data/products';
import { useCart } from '@/context/CartContext';
import { Loader, ShoppingCart, Eye, Star, Check } from 'lucide-react';
import Navigation from '@/components/NavBar';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set());
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsQuery = query(
          collection(db, 'products'),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(productsQuery);
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        setProducts(items);
      } catch (err) {
        console.error('Product fetch error:', err);
        setError('Failed to load products. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-b from-white to-gray-50">
        <Loader className="w-12 h-12 animate-spin text-[#1d4e89] mb-4" />
        <p className="text-gray-600 font-medium">Loading our collection...</p>
      </div>
    );
  }

  const handleAddToCart = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      lensOption: 'standard'
    });
    
    setAddedProducts(prev => new Set(prev).add(product.id));
    setTimeout(() => {
      setAddedProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(product.id);
        return newSet;
      });
    }, 2000);
  };

  return (
    <main className="min-h-screen bg-linear-to-b from-white via-gray-50 to-white">
      <Navigation />

      {/* Hero Header */}
      <section className="bg-linear-to-br from-[#1d4e89] to-[#15396b] text-white py-12 sm:py-16\">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4\">
            Our Collection
          </h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto\">
            Explore our complete range of premium eyewear designed for every style
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">  
        {error && (
          <Card className="bg-red-50 border-l-4 border-red-500 mb-8 shadow-sm">
            <CardContent className="pt-6">
              <p className="font-semibold text-red-700">Error loading products</p>
              <p className="text-sm text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {products.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent className="flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 text-lg">No products available yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">  
            {products.map((product, index) => (
              <Card 
                key={product.id} 
                className="group overflow-hidden hover:shadow-2xl hover:border-[#1d4e89]/20 transition-all duration-300 animate-in fade-in zoom-in-95"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative aspect-square bg-linear-to-br from-gray-100 to-gray-50 overflow-hidden">
                  {product.image ? (
                    <>
                      <Image 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        width={400}
                        height={400}
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Quick View Overlay */}
                      <Link
                        href={`/product/${product.id}`}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        <Button 
                          size="sm" 
                          className="bg-white text-[#1d4e89] hover:bg-gray-50 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300"
                        >
                          <Eye className="w-4 h-4" />
                          Quick View
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Eye className="w-12 h-12" />
                    </div>
                  )}
                </div>
                
                <CardContent className="p-5 space-y-4">
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-[#1d4e89] transition-colors line-clamp-1">{product.name}</h3>
                    <Badge variant="secondary" className="capitalize text-xs">
                      {product.category}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-bold bg-linear-to-r from-[#1d4e89] to-[#2d6bb3] bg-clip-text text-transparent">
                      ₦{product.price.toLocaleString()}
                    </p>
                    <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-800">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      4.8
                    </Badge>
                  </div>
                </CardContent>
                
                <CardFooter className="flex gap-2 p-5 pt-0">
                  <Button 
                    asChild
                    variant="outline"
                    className="flex-1"
                  >
                    <Link href={`/product/${product.id}`}>
                      View Details
                    </Link>
                  </Button>
                  <Button 
                    onClick={() => handleAddToCart(product)}
                    disabled={addedProducts.has(product.id)}
                    className={`flex-1 ${
                      addedProducts.has(product.id)
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-linear-to-r from-[#1d4e89] to-[#15396b] hover:shadow-lg'
                    }`}
                  >
                    {addedProducts.has(product.id) ? (
                      <>
                        <Check className="w-4 h-4" />
                        Added
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        Add
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
