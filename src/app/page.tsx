'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, Star, TrendingUp, Eye, Loader } from 'lucide-react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '@/firebase/config';
import Navigation from '@/components/NavBar';
import { Product } from '@/data/products';

export default function Home() {
  const categories = ['All', 'Male', 'Female', 'Sunshades'];
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const productsQuery = query(
          collection(db, 'products'),
          limit(6)
        );
        const snapshot = await getDocs(productsQuery);
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        setAllProducts(items);
        setFeaturedProducts(items);
      } catch (err) {
        console.error('Featured products fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  useEffect(() => {
    if (selectedCategory === 'All') {
      setFeaturedProducts(allProducts);
    } else {
      const filtered = allProducts.filter(
        product => product.category.toLowerCase() === selectedCategory.toLowerCase()
      );
      setFeaturedProducts(filtered);
    }
  }, [selectedCategory, allProducts]);

  return (
    <main className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-blue-50/30 to-white overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#1d4e89]/5 rounded-full blur-3xl" />
          <div className="absolute top-60 -left-40 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center py-12 sm:py-16 lg:py-24">
            {/* Left Content */}
            <div className="px-4 sm:px-6 lg:px-8 order-2 lg:order-1 space-y-6 sm:space-y-8">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-blue-100 px-4 sm:px-5 py-2 rounded-full shadow-sm animate-in fade-in slide-in-from-bottom-3 duration-700">
                <Star className="w-4 h-4 text-[#1d4e89] fill-[#1d4e89]" />
                <span className="text-xs font-semibold text-[#1d4e89] uppercase tracking-wider">Premium Quality Eyewear</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-tight animate-in fade-in slide-in-from-bottom-4 duration-1000">
                See the World <br />
                <span className="bg-gradient-to-r from-[#1d4e89] to-[#2d6bb3] bg-clip-text text-transparent">Through Style</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-xl animate-in fade-in slide-in-from-bottom-5 duration-1000">
                Discover premium eyewear that combines timeless elegance with modern craftsmanship. 
                Find your perfect frame today.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                <Link
                  href="/shop"
                  className="group px-8 py-4 bg-gradient-to-r from-[#1d4e89] to-[#15396b] text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 text-center relative overflow-hidden"
                >
                  <span className="relative z-10">Shop Collection</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#15396b] to-[#0d2548] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </Link>
                <Link
                  href="/track"
                  className="px-8 py-4 border-2 border-[#1d4e89] text-[#1d4e89] font-semibold rounded-xl hover:bg-[#1d4e89] hover:text-white hover:scale-105 transition-all duration-200 text-center"
                >
                  Track Order
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-4 animate-in fade-in slide-in-from-bottom-7 duration-1000">
                <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Package className="w-5 h-5 text-[#1d4e89]" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">500+</p>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Products</p>
                </div>
                <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Star className="w-5 h-5 text-[#1d4e89] fill-[#1d4e89]" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">4.9/5</p>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Rating</p>
                </div>
                <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-[#1d4e89]" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">50K+</p>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Customers</p>
                </div>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative px-4 sm:px-6 lg:px-8 order-1 lg:order-2 animate-in fade-in zoom-in-95 duration-1000">
              <div className="relative aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl ring-1 ring-gray-900/10">
                <Image
                  src="https://images.unsplash.com/photo-1755519024831-6833a37098ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxleWVnbGFzc2VzJTIwZmFzaGlvbiUyMG1vZGVybnxlbnwxfHx8fDE3NjgyMTY2MjJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Premium Eyewear"
                  className="w-full h-full object-cover"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#1d4e89]/30 via-transparent to-transparent" />
              </div>
              
              {/* Floating Card */}
              <div className="hidden sm:block absolute -bottom-6 -left-6 bg-white rounded-2xl p-6 shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1d4e89] to-[#2d6bb3] flex items-center justify-center text-white shadow-lg">
                    <Package className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Quality Guaranteed</p>
                    <p className="text-sm font-semibold text-gray-900">Authentic eyewear products</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      

      {/* Featured Frames Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-block mb-4">
              <span className="text-[#1d4e89] font-semibold text-sm uppercase tracking-wider">Curated Collection</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
              Featured Frames
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover our handpicked selection of premium eyewear designed for style and comfort
            </p>
          </div>
{/* Category Filter */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2.5 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-[#1d4e89] text-white shadow-md'
                    : 'bg-gray-50 text-gray-700 hover:bg-[#1d4e89] hover:text-white hover:shadow-md'
                } active:scale-95`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader className="w-10 h-10 animate-spin text-[#1d4e89] mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Loading featured products...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {featuredProducts.map((product, index) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-2xl hover:border-[#1d4e89]/20 transition-all duration-300 animate-in fade-in zoom-in-95"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50">
                    <Image
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <div className="bg-white text-[#1d4e89] px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 shadow-lg">
                          <Eye className="w-4 h-4" />
                          Quick View
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 mb-2 group-hover:text-[#1d4e89] transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-bold bg-gradient-to-r from-[#1d4e89] to-[#2d6bb3] bg-clip-text text-transparent">
                        ₦{product.price.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-1.5 bg-yellow-50 px-2.5 py-1 rounded-full">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-semibold text-gray-700">4.8</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-12 sm:mt-16">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#1d4e89] to-[#15396b] text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              <span>View All Products</span>
              <Eye className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative bg-gradient-to-br from-[#1d4e89] via-[#1a4580] to-[#15396b] text-white py-16 sm:py-20 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl font-extrabold mb-5">Ready to Find Your Perfect Frames?</h2>
          <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            Browse our collection of premium eyewear designed for style and comfort.
          </p>
          <Link
            href="/shop"
            className="inline-block px-10 py-4 bg-white text-[#1d4e89] font-bold rounded-xl hover:bg-gray-50 hover:scale-105 hover:shadow-2xl transition-all duration-200"
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Image 
                src="/logo.png" 
                alt="Nusy Wears" 
                width={140} 
                height={50}
                className="mb-4 invert"
              />
              <p className="text-sm">Premium eyewear for every style and budget.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/shop" className="hover:text-white transition">Shop</Link></li>
                <li><Link href="/track" className="hover:text-white transition">Track Order</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/support" className="hover:text-white transition">Help Center</Link></li>
                <li><Link href="/admin/login" className="hover:text-white transition">Admin</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <p className="text-sm">Email: info@nusy.com</p>
              <p className="text-sm">Phone: +234 XXX XXX XXXX</p>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm">
            <p>&copy; 2026 Nusy Wears. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
