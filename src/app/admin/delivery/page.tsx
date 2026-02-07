'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Truck, LogOut, Box, CheckCircle, Loader, ArrowLeft, Search } from 'lucide-react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase/config';
import { collection, getDocs, query, updateDoc, doc, orderBy } from 'firebase/firestore';
import { Order, customizedOrder } from '@/types/order';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatFirestoreTimestamp } from '@/lib/utils';

type DeliveryOrder = {
  id: string;
  orderId: string;
  kind: 'standard' | 'customized';
  customer: {
    name: string;
    email?: string;
    address: string;
    city?: string;
    zipCode?: string;
    phone: string;
  };
  totalAmount: number;
  deliveryStatus: string;
  statusKey: 'pending' | 'processing' | 'in transit' | 'delivered' | 'cancelled';
  paymentReference?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  shippingFee?: number;
  createdAt?: unknown;
};

const normalizeDeliveryStatus = (status: string): DeliveryOrder['statusKey'] => {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'pending') return 'pending';
  if (normalized === 'processing') return 'processing';
  if (normalized === 'in transit') return 'in transit';
  if (normalized === 'delivered') return 'delivered';
  if (normalized === 'cancelled') return 'cancelled';
  if (normalized === 'pending-quote' || normalized === 'quoted') return 'pending';
  if (normalized === 'confirmed' || normalized === 'paid') return 'processing';
  if (normalized === 'shipped') return 'in transit';
  if (normalized === 'completed') return 'delivered';
  return 'pending';
};

const toTitleCase = (value: string) =>
  value
    .replace(/-/g, ' ')
    .split(' ')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

export default function DeliveryPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<DeliveryOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false);
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
      const fetchOrders = async () => {
    try {
      const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const customizedOrdersQuery = query(collection(db, 'customizedOrders'), orderBy('submittedAt', 'desc'));
      const [ordersSnapshot, customizedSnapshot] = await Promise.all([getDocs(ordersQuery), getDocs(customizedOrdersQuery)]);
      const snapshot = { docs: [...ordersSnapshot.docs, ...customizedSnapshot.docs] };
      const ordersData = snapshot.docs.map(doc => {
        const data = doc.data() as Partial<Order> & Partial<customizedOrder>;
        const isCustomizedOrder = Boolean(
          data?.productName || data?.lensType || data?.estimatedLensPrice || data?.framePrice
        );
        const rawStatus = data.deliveryStatus || data.paymentStatus || 'pending';
        return {
          id: doc.id,
          orderId: data.orderId || '',
          kind: isCustomizedOrder ? 'customized' : 'standard',
          customer: {
            name: data.customer?.name || '',
            email: data.customer?.email || '',
            address: data.customer?.address || '',
            city: data.customer?.city || '',
            zipCode: data.customer?.zipCode || '',
            phone: data.customer?.phone || '',
          },
          totalAmount: data.totalAmount || 0,
          deliveryStatus: rawStatus,
          statusKey: normalizeDeliveryStatus(rawStatus),
          paymentReference: data.paymentReference,
          paymentStatus: data.paymentStatus,
          paymentMethod: data.paymentMethod || '',
          shippingFee: data.shippingFee ?? 0,
          createdAt: data.createdAt ?? data.submittedAt
        } as DeliveryOrder;
      });
      
      setOrders(ordersData);
      setActiveDeliveries(ordersData.filter(o => ['pending', 'processing', 'in transit', 'delivered'].includes(o.statusKey)));
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

  const updateOrderStatus = async (order: DeliveryOrder, newStatus: DeliveryOrder['statusKey']) => {
    try {
      const collectionName = order.kind === 'customized' ? 'customizedOrders' : 'orders';
      await updateDoc(doc(db, collectionName, order.id), {
        deliveryStatus: newStatus
      });
      
      const updatedOrders = orders.map(existingOrder =>
        existingOrder.id === order.id
          ? { ...existingOrder, deliveryStatus: newStatus, statusKey: normalizeDeliveryStatus(newStatus) }
          : existingOrder
      );
      
      setOrders(updatedOrders);
      setActiveDeliveries(updatedOrders.filter(o => ['pending', 'processing', 'in transit', 'delivered'].includes(o.statusKey)));
      
      if (selectedOrder?.id === order.id) {
        setSelectedOrder({ ...selectedOrder, deliveryStatus: newStatus, statusKey: normalizeDeliveryStatus(newStatus) });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const openUpdateStatusDialog = (order: DeliveryOrder) => {
    setSelectedOrder(order);
    setIsUpdateStatusOpen(true);
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    "in transit": 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
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

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredDeliveries = normalizedSearch
    ? activeDeliveries.filter((order) => {
        const haystack = [
          order.orderId,
          order.customer.name,
          order.customer.email,
          order.customer.phone,
          order.customer.address,
          order.deliveryStatus,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      })
    : activeDeliveries;

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
            <h1 className="text-2xl font-bold text-gray-900">Delivery Management</h1>
            <p className="text-sm text-gray-600 mt-1">Track and update delivery progress for orders</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Shipment</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {orders.filter(o => o.statusKey === 'pending').length}
                  </p>
                </div>
                <Box className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Processing</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {orders.filter(o => o.statusKey === 'processing').length}
                  </p>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
             </div>
            <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">In Transit</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {orders.filter(o => o.statusKey === 'in transit').length}
                  </p>
                </div>
                <Truck className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Delivered</p>
                  <p className="text-2xl font-semibold text-gray-900">
                  {orders.filter(o => o.statusKey === 'delivered').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order ID, customer, phone, or address..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>

          {/* Delivery Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Delivery Management</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr className="hover:bg-gray-50">
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDeliveries.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <p className="text-sm font-semibold text-[#1d4e89]">{order.orderId}</p>
                        <p className="text-xs text-gray-500">
                            {formatFirestoreTimestamp(order.createdAt, 'en-NG')}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm font-semibold text-gray-900">{order.customer.name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">₦{order.totalAmount.toLocaleString()}</p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm text-gray-700 max-w-xs truncate">{order.customer.address || 'N/A'}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[order.statusKey]}`}>
                          {toTitleCase(order.deliveryStatus)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openUpdateStatusDialog(order)}
                            className="px-4 py-2 text-sm font-medium text-[#1d4e89] hover:bg-blue-50 rounded-lg transition-colors hover:shadow-sm"
                          >
                            Update Status
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredDeliveries.length === 0 && (
                <div className="text-center py-16">
                  <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No active deliveries</p>
                </div>
              )}
            </div>
          </div>

          {/* Update Status Dialog */}
          <Dialog open={isUpdateStatusOpen} onOpenChange={setIsUpdateStatusOpen}>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader className="border-b pb-4 -mx-6 px-6 mb-6 bg-linear-to-r from-[#1d4e89] via-[#1a4475] to-[#1d4e89] py-6 -mt-6 rounded-t-lg">
                <DialogTitle className="text-2xl font-bold text-white">Update Order Status</DialogTitle>
                <DialogDescription className="text-blue-100">
                  Change the delivery status for order {selectedOrder?.orderId}
                </DialogDescription>
              </DialogHeader>
              
              {selectedOrder && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="order-status">Order Status</Label>
                    <Select
                      value={selectedOrder.statusKey}
                      onValueChange={(value) => {
                        updateOrderStatus(selectedOrder, value as DeliveryOrder['statusKey']);
                      }}
                    >
                      <SelectTrigger id="order-status" className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="in transit">In Transit</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2 pt-6 border-t border-gray-200">
                    <Button
                      type="button"
                      onClick={() => setIsUpdateStatusOpen(false)}
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
