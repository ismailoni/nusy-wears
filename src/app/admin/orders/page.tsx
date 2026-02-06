'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Clock, CheckCircle2, X, LogOut, Loader } from 'lucide-react';
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

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(o => o.deliveryStatus === filter);

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
        <div className="mb-6">
          <Link href="/admin/dashboard" className="text-blue-600 hover:text-blue-700">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
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

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
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

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
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

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
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

          {/* Orders Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-lg font-semibold text-gray-900">Orders</h2>
                <div className="flex items-center gap-2">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="all">All Orders</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
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
                      <td colSpan={7} className="py-12">
                        <div className="flex flex-col items-center justify-center">
                          <Loader className="w-8 h-8 animate-spin text-[#1d4e89] mb-3" />
                          <p className="text-gray-500">Loading orders...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12">
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
                          <p className="text-sm font-medium text-gray-900">{order.orderId}</p>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{order.customer.name}</p>
                            <p className="text-xs text-gray-500">{order.customer.email}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-sm text-gray-700">
                            {formatFirestoreTimestamp(order.createdAt, 'en-NG')}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-sm font-medium text-gray-900">
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
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => viewOrderDetails(order)}
                              className="px-3 py-1.5 text-sm text-[#1d4e89] hover:bg-blue-50 rounded-lg transition-colors"
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
            <DialogContent className="sm:max-w-150">
              <DialogHeader>
                <DialogTitle>Order Details</DialogTitle>
                <DialogDescription>
                  Complete information about selected order
                </DialogDescription>
              </DialogHeader>
              
              {selectedOrder && (
                <div className="space-y-6">
                  {/* Order Info */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b">
                      <div>
                        <p className="text-sm text-gray-500">Order ID</p>
                        <p className="text-base font-semibold text-gray-900">{selectedOrder.orderId}</p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${statusColors[selectedOrder.deliveryStatus as keyof typeof statusColors]}`}>
                        {selectedOrder.deliveryStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Customer Name</p>
                        <p className="text-sm font-medium text-gray-900">{selectedOrder.customer.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Email</p>
                        <p className="text-sm font-medium text-gray-900">{selectedOrder.customer.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Order Date</p>
                        <p className="text-sm font-medium text-gray-900">
                            {formatFirestoreTimestamp(selectedOrder.createdAt, 'en-NG')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                        <p className="text-base font-bold text-gray-900">₦{selectedOrder.totalAmount.toLocaleString()}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 mb-1">Delivery Address</p>
                      <p className="text-sm font-medium text-gray-900">{selectedOrder.customer.address}</p>
                    </div>

                

                    <div>
                      <p className="text-sm text-gray-500 mb-1">Items</p>
                      <div className="space-y-2">
                        {selectedOrder.items.map((item: Item, index: number) => (
                          <div key={index} className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded">
                            <p className="font-semibold">{item.name}</p>
                            <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                              <p>Quantity: {item.quantity}</p>
                              <p>Price: ₦{item.price.toLocaleString()}</p>
                              {item.lensOption && <p>Lens: {item.lensOption}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOrderDetailsOpen(false)}
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
