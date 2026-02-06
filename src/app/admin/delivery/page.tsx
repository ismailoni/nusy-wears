'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Truck, LogOut } from 'lucide-react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase/config';
import { collection, getDocs, query, updateDoc, doc, orderBy } from 'firebase/firestore';
import { Order } from '@/types/order';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function DeliveryPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false);

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
      const fetchOrders = async () => {
    try {
      const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc')) && query(collection(db, 'customizedOrders'), orderBy('submittedAt', 'desc'));
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
          shippingFee: data.shippingFee ?? 0,
          createdAt: data.createdAt
        } as Order;
      });
      
      setOrders(ordersData);
      setActiveDeliveries(ordersData.filter(o => ['processing', 'shipped'].includes(o.deliveryStatus)));
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };
    if (authenticated) {
      fetchOrders();
    }
  }, [authenticated]);



  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const updateOrderStatus = async (id: string, newStatus: Order['deliveryStatus']) => {
    try {
      await updateDoc(doc(db, 'orders', id), {
        deliveryStatus: newStatus
      });
      
      const updatedOrders = orders.map(order =>
        order.id === id ? { ...order, deliveryStatus: newStatus } : order
      );
      
      setOrders(updatedOrders);
      setActiveDeliveries(updatedOrders.filter(o => ['processing', 'shipped'].includes(o.deliveryStatus)));
      
      if (selectedOrder?.id === id) {
        setSelectedOrder({ ...selectedOrder, deliveryStatus: newStatus });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const openUpdateStatusDialog = (order: Order) => {
    setSelectedOrder(order);
    setIsUpdateStatusOpen(true);
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    shipped: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
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
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Shipment</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {orders.filter(o => o.deliveryStatus === 'processing').length}
                  </p>
                </div>
                <Package className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">In Transit</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {orders.filter(o => o.deliveryStatus === 'shipped').length}
                  </p>
                </div>
                <Truck className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Delivered</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {orders.filter(o => o.deliveryStatus === 'delivered').length}
                  </p>
                </div>
                <Truck className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Delivery Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Delivery Management</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeDeliveries.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <p className="text-sm font-medium text-gray-900">{order.orderId}</p>
                        <p className="text-xs text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString('en-NG')}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm font-medium text-gray-900">{order.customer.name}</p>
                        <p className="text-xs text-gray-500">₦{order.totalAmount.toLocaleString()}</p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm text-gray-700 max-w-xs truncate">{order.customer.address}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[order.deliveryStatus]}`}>
                          {order.deliveryStatus}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openUpdateStatusDialog(order)}
                            className="px-3 py-1.5 text-sm text-[#1d4e89] hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            Update Status
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {activeDeliveries.length === 0 && (
                <div className="text-center py-12">
                  <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No active deliveries</p>
                </div>
              )}
            </div>
          </div>

          {/* Update Status Dialog */}
          <Dialog open={isUpdateStatusOpen} onOpenChange={setIsUpdateStatusOpen}>
            <DialogContent className="sm:max-w-106.25">
              <DialogHeader>
                <DialogTitle>Update Order Status</DialogTitle>
                <DialogDescription>
                  Change the delivery status for order {selectedOrder?.orderId}
                </DialogDescription>
              </DialogHeader>
              
              {selectedOrder && (
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="order-status">Order Status</Label>
                    <Select
                      value={selectedOrder.deliveryStatus}
                      onValueChange={(value) => {
                        updateOrderStatus(selectedOrder.id, value as Order['deliveryStatus']);
                      }}
                    >
                      <SelectTrigger id="order-status" className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsUpdateStatusOpen(false)}
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
