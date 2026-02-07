'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Plus, LogOut, DollarSign, Truck, BarChart3 } from 'lucide-react';
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
    <main className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link href="/" className="text-2xl font-bold bg-linear-to-r from-[#1d4e89] to-[#15396b] bg-clip-text text-transparent">
              Nusy Wears Admin
            </Link>
            <p className="text-xs text-gray-500 mt-1">📧 {userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your store, orders, and deliveries</p>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Products</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">Manage</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Orders</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">Track</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Transactions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">Review</p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Delivery</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">Manage</p>
              </div>
              <Truck className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Core Management Section */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Core Management</h2>
            <p className="text-sm text-gray-600 mt-1">Essential tools for daily operations</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transactions Card */}
            <Link 
              href="/admin/transactions"
              className="group bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Transactions</h3>
              <p className="text-sm text-gray-600 mb-4">Review and monitor all payments</p>
              <div className="flex items-center text-emerald-600 group-hover:translate-x-1 transition-transform">
                <span className="text-sm font-medium">View Transactions →</span>
              </div>
            </Link>

            {/* Delivery Card */}
            <Link 
              href="/admin/delivery"
              className="group bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md hover:border-purple-300 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                  <Truck className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Delivery</h3>
              <p className="text-sm text-gray-600 mb-4">Manage shipments and tracking</p>
              <div className="flex items-center text-purple-600 group-hover:translate-x-1 transition-transform">
                <span className="text-sm font-medium">View Deliveries →</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Products Section */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Product Management</h2>
            <p className="text-sm text-gray-600 mt-1">Add, edit, and organize your products</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Products Card */}
            <Link 
              href="/admin/products"
              className="group bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Products</h3>
              <p className="text-sm text-gray-600 mb-4">Manage inventory and product details</p>
              <div className="flex items-center text-blue-600 group-hover:translate-x-1 transition-transform">
                <span className="text-sm font-medium">View Products →</span>
              </div>
            </Link>

            {/* Add Product Card */}
            <Link 
              href="/admin/products/add"
              className="group bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md hover:border-green-300 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                  <Plus className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Add Product</h3>
              <p className="text-sm text-gray-600 mb-4">Create new products for your store</p>
              <div className="flex items-center text-green-600 group-hover:translate-x-1 transition-transform">
                <span className="text-sm font-medium">Add New →</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Orders Section */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Orders</h2>
            <p className="text-sm text-gray-600 mt-1">Manage standard and customized orders</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Orders Card */}
            <Link 
              href="/admin/orders"
              className="group bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md hover:border-orange-300 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Orders</h3>
              <p className="text-sm text-gray-600 mb-4">View and manage standard orders</p>
              <div className="flex items-center text-orange-600 group-hover:translate-x-1 transition-transform">
                <span className="text-sm font-medium">View Orders →</span>
              </div>
            </Link>

            {/* Customized Orders Card */}
            <Link 
              href="/admin/customized-orders"
              className="group bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md hover:border-pink-300 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-pink-50 rounded-lg group-hover:bg-pink-100 transition-colors">
                  <Package className="w-6 h-6 text-pink-600" />
                </div>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Customized Orders</h3>
              <p className="text-sm text-gray-600 mb-4">Handle custom lens orders and quotes</p>
              <div className="flex items-center text-pink-600 group-hover:translate-x-1 transition-transform">
                <span className="text-sm font-medium">View Orders →</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
