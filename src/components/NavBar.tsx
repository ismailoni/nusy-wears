'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Menu, X, Package, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function NavBar() {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { href: '/shop', label: 'Shop' },
    { href: '/track', label: 'Track Order' },
  ];

  return (
    <TooltipProvider>
      <header className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 sm:gap-10">
              <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
                <Image 
                  src="/logo.png" 
                  alt="Nusy Wears" 
                  width={120} 
                  height={40}
                  className="h-9 sm:h-11 w-auto"
                  priority
                />
              </Link>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Desktop Track Order */}
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex items-center gap-2 text-gray-700 hover:text-[#1d4e89] hover:bg-blue-50"
              >
                <Link href="/shop">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Shop</span>
                </Link>
              </Button>

              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex items-center gap-2 text-gray-700 hover:text-[#1d4e89] hover:bg-blue-50"
              >
                <Link href="/track">
                  <Package className="w-4 h-4" />
                  <span>Track Order</span>
                </Link>
              </Button>

              {/* Cart Icon with Badge and Tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="relative group hover:bg-blue-50"
                  >
                    <Link href="/cart">
                      <ShoppingCart
                        className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${
                          isActive('/cart') ? 'text-[#1d4e89]' : 'text-gray-700 group-hover:text-[#1d4e89]'
                        }`}
                      />
                      {totalItems > 0 && (
                        <Badge 
                          className="absolute -top-1 -right-1 bg-[#1d4e89] hover:bg-[#1d4e89] text-white text-xs h-5 min-w-5 p-0 flex items-center justify-center animate-in zoom-in-50 shadow-md border-0"
                        >
                          {totalItems}
                        </Badge>
                      )}
                      <span className="sr-only">Shopping cart</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{totalItems > 0 ? `${totalItems} item${totalItems > 1 ? 's' : ''} in cart` : 'Cart is empty'}</p>
                </TooltipContent>
              </Tooltip>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden hover:bg-gray-100 text-gray-700"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden mt-4 pt-4 border-t border-gray-100 space-y-1 animate-in slide-in-from-top-2">
              {navLinks.map(link => (
                <Button
                  key={link.href}
                  asChild
                  variant="ghost"
                  className={`w-full justify-start px-4 py-3 h-auto font-medium transition-all duration-200 ${
                    isActive(link.href)
                      ? 'bg-blue-50 text-[#1d4e89] shadow-sm hover:bg-blue-50 hover:text-[#1d4e89]'
                      : 'text-gray-700 hover:bg-gray-50 active:scale-95'
                  }`}
                >
                  <Link href={link.href} onClick={() => setMobileMenuOpen(false)}>
                    {link.label}
                  </Link>
                </Button>
              ))}
            </nav>
          )}
        </div>
      </header>
    </TooltipProvider>
  );
}
