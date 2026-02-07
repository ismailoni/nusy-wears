'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '@/firebase/config';
import { Product } from '@/types/products';
import { Edit, Trash2, Plus, LogOut, Search, Package, Loader, ArrowLeft, TrendingUp } from 'lucide-react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import Image from 'next/image';
import { toast } from 'sonner';

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthenticated(true);
        setUserEmail(user.email || '');
        fetchProducts();
      } else {
        setLoading(false);
        router.push('/admin/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchProducts = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'products'));
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(items);
      setFilteredProducts(items);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete product');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (!authenticated) return null;
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-[#1d4e89] mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading products...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: products.length,
    inStock: products.filter(p => p.stock > 0).length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= 10).length,
    outOfStock: products.filter(p => p.stock === 0).length,
  };

  return (
    <main className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-700 transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Back</span>
              </Link>
              <div className="hidden sm:block w-px h-6 bg-gray-200"></div>
              <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-700">Admin</p>
                <p className="text-xs text-gray-500">{userEmail}</p>
              </div>
              <Link 
                href="/admin/products/add"
                className="bg-[#1d4e89] text-white px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-[#15396b] transition-all shadow-md hover:shadow-lg font-medium"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Product</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Inventory Management</h2>
          <p className="text-gray-600">Manage your product catalog and inventory levels</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Products</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">In Stock</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.inStock}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.lowStock}</p>
              </div>
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-yellow-100">
                <span className="text-lg font-bold text-yellow-600">⚠</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Out of Stock</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.outOfStock}</p>
              </div>
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100">
                <span className="text-lg font-bold text-red-600">✕</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d4e89] focus:border-transparent bg-white"
            />
          </div>
        </div>

        {/* Products Table */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No products found' : 'No products yet'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">
              {searchQuery ? 'Try adjusting your search terms or filters' : 'Start building your inventory by adding your first product'}
            </p>
            {!searchQuery && (
              <Link
                href="/admin/products/add"
                className="inline-flex items-center gap-2 bg-[#1d4e89] text-white px-6 py-3 rounded-lg hover:bg-[#15396b] transition-colors font-medium shadow-md hover:shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Add Your First Product
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-linear-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                            {product.images?.[0] ? (
                              <Image 
                                src={product.images?.[0]} 
                                alt={product.name}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 line-clamp-1">{product.name}</p>
                            <p className="text-sm text-gray-500">{product.material || 'Standard'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900">₦{product.price.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                          product.stock > 10 
                            ? 'bg-green-100 text-green-700' 
                            : product.stock > 0 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {product.stock} {product.stock === 1 ? 'unit' : 'units'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/admin/products/${product.id}/edit`}
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                            title="Edit product"
                          >
                            <Edit className="w-4 h-4" />
                            <span className="hidden sm:inline">Edit</span>
                          </Link>
                          <button 
                            onClick={() => handleDelete(product.id)}
                            className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm"
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
