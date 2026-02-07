'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Clock, CheckCircle2, X, LogOut, Loader, ArrowLeft, Search } from 'lucide-react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase/config';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { Order, Item } from '@/types/order';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatFirestoreTimestamp } from '@/lib/utils';

export default function OrdersPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [fetchingOrders, setFetchingOrders] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  useEffect(() => {
    if (authenticated) {
      fetchOrders();
    }
  }, [authenticated]);
  const fetchOrders = async () => {
    setFetchingOrders(true);
    try {
      const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(ordersQuery);
      const ordersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          orderId: data.orderId || '',
          customer: {
            name: data.customer?.name || '',
            email: data.customer?.email || '',
            address: data.customer?.address || '',
            city: data.customer?.city || '',
            zipCode: data.customer?.zipCode || '',
            phone: data.customer?.phone || '',
          },
          items: data.items || [],
          totalAmount: data.totalAmount || 0,
          deliveryStatus: data.deliveryStatus || 'pending',
          date: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          paymentReference: data.paymentReference,
          paymentStatus: data.paymentStatus,
          paymentMethod: data.paymentMethod || '',
          shippingFee: data.shippingFee || 0,
          createdAt: data.createdAt
        } as Order;
      });
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setFetchingOrders(false);
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

  const filteredOrders = (filter === 'all'
    ? orders
    : orders.filter(o => o.deliveryStatus === filter)
  ).filter(o => 
    o.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customer.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const viewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderDetailsOpen(true);
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    shipped: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    paid: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};
   if (loading) {
     return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-b from-white to-gray-50">
         <Loader className="w-12 h-12 animate-spin text-[#1d4e89] mb-4" />
         <p className="text-gray-600 font-medium">Loading Orders...</p>
       </div>
     );
   }

  if (!authenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b p-6 flex items-center justify-between">
        <div>
          <Link href="/admin/dashboard" className="text-2xl font-bold text-blue-600">
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
        {/* Navigation Header */}
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="h-8 border-l border-gray-200" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
            <p className="text-sm text-gray-600 mt-1">Track and manage all customer orders and deliveries</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="bg-orange-50 p-2 rounded-lg">
                  <ShoppingBag className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">All Orders</p>
                <p className="text-2xl font-semibold text-gray-900">{orders.length}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="bg-yellow-50 p-2 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {orders.filter(o => o.deliveryStatus === 'pending').length}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="bg-green-50 p-2 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {orders.filter(o => o.deliveryStatus === 'delivered').length}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="bg-red-50 p-2 rounded-lg">
                  <X className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Cancelled</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {orders.filter(o => o.deliveryStatus === 'cancelled').length}
                </p>
              </div>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order ID, customer name, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Orders List</h2>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d4e89] focus:ring-offset-0"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr className="hover:bg-gray-50">
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Status</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fetchingOrders ? (
                    <tr>
                      <td colSpan={7} className="py-16">
                        <div className="flex flex-col items-center justify-center">
                          <Loader className="w-8 h-8 animate-spin text-[#1d4e89] mb-3" />
                          <p className="text-gray-500">Loading orders...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16">
                        <div className="text-center">
                          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No orders found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6">
                          <p className="text-sm font-semibold text-[#1d4e89]">{order.orderId}</p>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{order.customer.name}</p>
                            <p className="text-xs text-gray-500">{order.customer.email}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-sm text-gray-700">
                            {formatFirestoreTimestamp(order.createdAt, 'en-NG')}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-sm font-bold text-gray-900">
                            ₦{order.totalAmount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">{order.items.length} items</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[order.paymentStatus as keyof typeof statusColors]}`}>
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[order.deliveryStatus as keyof typeof statusColors]}`}>
                            {order.deliveryStatus}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => viewOrderDetails(order)}
                              className="px-4 py-2 text-sm font-medium text-[#1d4e89] hover:bg-blue-50 rounded-lg transition-colors hover:shadow-sm"
                            >
                              View Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Details Dialog */}
          <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader className="border-b pb-4 -mx-6 px-6 mb-6 bg-linear-to-r from-[#1d4e89] via-[#1a4475] to-[#1d4e89] py-6 -mt-6 rounded-t-lg">
                <DialogTitle className="text-2xl font-bold text-white">Order Details</DialogTitle>
                <DialogDescription className="text-blue-100">
                  Complete information about selected order
                </DialogDescription>
              </DialogHeader>
              
              {selectedOrder && (
                <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
                  {/* Order Info */}
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-300">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</p>
                        <p className="text-lg font-bold text-[#1d4e89] mt-1">{selectedOrder.orderId}</p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold capitalize ${statusColors[selectedOrder.deliveryStatus as keyof typeof statusColors]}`}>
                        {selectedOrder.deliveryStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Customer Name</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedOrder.customer.name}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Email</p>
                        <p className="text-sm font-medium text-gray-700">{selectedOrder.customer.email}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Order Date</p>
                        <p className="text-sm font-medium text-gray-700">
                            {formatFirestoreTimestamp(selectedOrder.createdAt, 'en-NG')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Total Amount</p>
                        <p className="text-lg font-bold text-[#1d4e89]">₦{selectedOrder.totalAmount.toLocaleString()}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Delivery Address</p>
                      <p className="text-sm font-medium text-gray-700 bg-white p-3 rounded border border-gray-200">{selectedOrder.customer.address}</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Items Ordered</p>
                      <div className="space-y-2">
                        {selectedOrder.items.map((item: Item, index: number) => (
                          <div key={index} className="bg-white border border-gray-200 p-3 rounded-lg">
                            <p className="text-sm font-bold text-gray-900">{item.name}</p>
                            <div className="text-xs text-gray-600 mt-2 space-y-1 border-t border-gray-100 pt-2">
                              <div className="flex justify-between">
                                <span>Quantity:</span>
                                <span className="font-medium text-gray-900">{item.quantity}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Price:</span>
                                <span className="font-bold text-[#1d4e89]">₦{item.price.toLocaleString()}</span>
                              </div>
                              {item.lensOption && (
                                <div className="flex justify-between text-blue-600 font-medium">
                                  <span>Lens:</span>
                                  <span>{item.lensOption}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-6 border-t border-gray-200 mt-6">
                    <Button
                      type="button"
                      onClick={() => setIsOrderDetailsOpen(false)}
                      className="px-6 py-2 bg-[#1d4e89] text-white rounded-lg hover:bg-[#15396b] font-medium transition-colors"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </main>
  );
}
