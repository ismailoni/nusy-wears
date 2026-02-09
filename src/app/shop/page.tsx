'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Product } from '@/types/products';
import { useCart } from '@/context/CartContext';
import { 
  ShoppingCart, 
  Eye, 
  Star, 
  Check, 
  Search, 
  SlidersHorizontal, 
  ArrowUp,
  X,
  ArrowUpDown
} from 'lucide-react';
import Navigation from '@/components/NavBar';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

// --- Sub-component: Loading Skeleton ---
const ProductSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
        <div className="aspect-square bg-gray-200 animate-pulse" />
        <div className="p-5 space-y-3">
          <div className="h-6 bg-gray-200 rounded-md w-3/4 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded-md w-1/4 animate-pulse" />
          <div className="flex justify-between pt-2">
            <div className="h-6 bg-gray-200 rounded-md w-1/3 animate-pulse" />
            <div className="h-6 bg-gray-200 rounded-md w-10 animate-pulse" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default function ShopPage() {
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UX/UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOption, setSortOption] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Cart State
  const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set());
  const { addToCart } = useCart();

  // 1. Fetch Data
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

  // 2. Handle Scroll Event for "Back to Top" button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 3. Derived State: Extract Unique Categories dynamically
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['All', ...Array.from(cats)];
  }, [products]);

  // 4. Derived State: Filter & Sort Products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by Search
    if (searchQuery) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by Category
    if (selectedCategory !== 'All') {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Sort
    if (sortOption === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else {
      // Default to newest (assuming createdAt exists, otherwise logical fallback)
      // Since we fetched 'desc' initially, standard array order is 'newest'
    }

    return result;
  }, [products, searchQuery, selectedCategory, sortOption]);

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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen bg-linear-to-b from-white via-gray-50 to-white relative">
      <Navigation />

      {/* Hero Header */}
      <section className="relative overflow-hidden bg-linear-to-br from-[#1d4e89] to-[#15396b] text-white">
        {/* Soft highlight overlay */}
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-b from-white/10 via-white/0 to-black/10"
        />

        {/* Decorative background shapes */}
        <div
          aria-hidden
          className="absolute -top-16 -right-16 size-72 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-20 -left-20 size-80 rounded-full bg-black/10 blur-3xl"
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs sm:text-sm text-white/90 backdrop-blur-sm">
              <span className="inline-block size-1.5 rounded-full bg-white/70" />
              Premium frames, modern comfort
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="block">Our Collection</span>
              <span className="mt-2 block bg-linear-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Find your next favorite pair
              </span>
            </h1>

            <p className="mt-6 text-blue-100 text-base sm:text-lg leading-relaxed">
              Discover premium eyewear that blends timeless style with modern comfort. Use the filters below to
              narrow down styles and prices in seconds.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-white text-[#1d4e89] hover:bg-white/90 shadow-lg shadow-black/10"
              >
                <a href="#collection">Browse frames</a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href="/contact">Need help choosing?</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-white/80">
              <span className="rounded-full bg-white/10 px-3 py-1">Quality lenses</span>
              <span className="rounded-full bg-white/10 px-3 py-1">Secure checkout</span>
              <span className="rounded-full bg-white/10 px-3 py-1">Fast delivery</span>
            </div>
          </div>
        </div>
      </section>

      <section id="collection" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">  
        
        {/* Controls Bar (Search/Filter/Sort) */}
        <div className="sticky top-20 z-30 bg-white/80 backdrop-blur-lg border border-gray-100 rounded-2xl shadow-sm p-4 mb-8 transition-all duration-300">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
            
            {/* Search */}
            <div className="relative w-full lg:w-96 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#1d4e89] transition-colors" />
              <Input 
                placeholder="Search frames..." 
                className="pl-10 bg-gray-50 border-transparent focus:bg-white focus:border-[#1d4e89]/30 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filters & Sort */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
              {/* Category Pills */}
              <div className="flex gap-2 items-center">
                <SlidersHorizontal className="w-4 h-4 text-gray-400 mr-1 hidden sm:block" />
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat 
                        ? 'bg-[#1d4e89] text-white shadow-md shadow-[#1d4e89]/20' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="w-px h-8 bg-gray-200 hidden sm:block mx-2" />

              {/* Sort Dropdown (Native Select styled to match) */}
              <div className="relative min-w-35">
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select 
                  value={sortOption}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === 'newest' || value === 'price-asc' || value === 'price-desc') {
                      setSortOption(value)
                    }
                  }}
                  className="w-full appearance-none bg-gray-50 border border-transparent rounded-md py-2 pl-10 pr-8 text-sm focus:outline-hidden cursor-pointer"
                >
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {error ? (
          <Card className="bg-red-50 border-l-4 border-red-500 mb-8 shadow-sm">
            <CardContent className="pt-6">
              <p className="font-semibold text-red-700">Unable to load collection</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4 border-red-200 text-red-700 hover:bg-red-100"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : loading ? (
          <ProductSkeleton />
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No matches found</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              We couldn&apos;t find any eyewear matching <q>{searchQuery}</q> in this category.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {setSearchQuery(''); setSelectedCategory('All');}}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">  
            {filteredProducts.map((product, i) => (
              <Card 
                key={i} 
                className="group overflow-hidden hover:shadow-2xl hover:shadow-[#1d4e89]/10 border-gray-100 transition-all duration-300 h-full flex flex-col"
              >
                <div className="relative aspect-square bg-[#f8fafc] overflow-hidden">
                  {product.image ? (
                    <>
                      <Image 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
                        width={400}
                        height={400}
                      />
                      {/* Gradient Overlay on Hover */}
                      <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Quick View Button */}
                      <Link
                        href={`/product/${product.id}`}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        <Button 
                          size="sm" 
                          className="bg-white/90 backdrop-blur-xs text-[#1d4e89] hover:bg-white hover:text-[#15396b] shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 rounded-full px-6"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Quick View
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                      <Eye className="w-12 h-12 opacity-50" />
                    </div>
                  )}
                  
                  {/* Category Badge - Top Left */}
                  <div className="absolute top-3 left-3">
                     <Badge variant="secondary" className="bg-white/90 backdrop-blur-xs shadow-sm text-xs font-medium uppercase tracking-wider">
                      {product.category}
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-5 space-y-3 grow">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-[#1d4e89] transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                  </div>
                  
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xl font-bold text-[#1d4e89]">
                      ₦{product.price.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 text-yellow-500 text-sm font-medium">
                      <Star className="w-4 h-4 fill-current" />
                      <span>4.8</span>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="p-5 pt-0 mt-auto grid grid-cols-5 gap-2">
                  <Button 
                    asChild
                    variant="outline"
                    className="col-span-2 border-gray-200 hover:bg-gray-50 text-gray-700"
                  >
                    <Link href={`/product/${product.id}`}>
                      Details
                    </Link>
                  </Button>
                  <Button 
                    onClick={() => handleAddToCart(product)}
                    disabled={addedProducts.has(product.id)}
                    className={`col-span-3 transition-all duration-300 ${
                      addedProducts.has(product.id)
                        ? 'bg-green-600 hover:bg-green-700 text-white border-transparent'
                        : 'bg-[#1d4e89] hover:bg-[#15396b] text-white shadow-md hover:shadow-lg hover:shadow-[#1d4e89]/20'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {addedProducts.has(product.id) ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </span>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Scroll To Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 bg-white text-[#1d4e89] p-3 rounded-full shadow-lg border border-gray-100 transition-all duration-300 z-50 hover:shadow-xl hover:-translate-y-1 ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
        }`}
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-6 h-6" />
      </button>

    </main>
  );
}