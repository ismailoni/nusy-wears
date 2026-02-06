'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Plus, LogOut, DollarSign, Truck } from 'lucide-react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/config';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthenticated(true);
        setUserEmail(user.email || '');
        setLoading(false);
      } else {
        setLoading(false);
        router.push('/admin/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!authenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b p-6 flex items-center justify-between">
        <div>
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Nusy Wears Admin
          </Link>
          <p className="text-sm text-gray-600">Signed in as {userEmail}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link 
            href="/admin/products"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
          >
            <Package className="w-8 h-8 text-blue-600 mb-3" />
            <h3 className="font-semibold text-lg mb-2">Products</h3>
            <p className="text-gray-600">Manage product inventory</p>
          </Link>

          <Link 
            href="/admin/products/add"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
          >
            <Plus className="w-8 h-8 text-green-600 mb-3" />
            <h3 className="font-semibold text-lg mb-2">Add Product</h3>
            <p className="text-gray-600">Add new products to store</p>
          </Link>

          <Link 
            href="/admin/orders"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
          >
            <Package className="w-8 h-8 text-orange-600 mb-3" />
            <h3 className="font-semibold text-lg mb-2">Orders</h3>
            <p className="text-gray-600">View and manage orders</p>
          </Link>
          <Link 
            href="/admin/customized-orders"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
          >
            <Package className="w-8 h-8 text-orange-600 mb-3" />
            <h3 className="font-semibold text-lg mb-2">Customized Orders</h3>
            <p className="text-gray-600">View and manage customized orders</p>
          </Link>

          <Link 
            href="/admin/transactions"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
          >
            <DollarSign className="w-8 h-8 text-emerald-600 mb-3" />
            <h3 className="font-semibold text-lg mb-2">Transactions</h3>
            <p className="text-gray-600">View completed transactions</p>
          </Link>

          <Link 
            href="/admin/delivery"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
          >
            <Truck className="w-8 h-8 text-purple-600 mb-3" />
            <h3 className="font-semibold text-lg mb-2">Delivery</h3>
            <p className="text-gray-600">Manage deliveries & tracking</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
