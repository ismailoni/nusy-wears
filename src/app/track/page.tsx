'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Package, Search, Loader, AlertCircle, CheckCircle2 } from 'lucide-react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Order, customizedOrder, Item } from '@/types/order';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import NavBar from '@/components/NavBar';
import { formatFirestoreTimestamp } from '@/lib/utils';

type TrackOrder = {
  id: string;
  orderId?: string;
  kind: 'standard' | 'customized';
  customer: {
    name?: string;
    phone?: string;
    address?: string;
    zipCode?: string;
  };
  deliveryStatus: string;
  progressStatus: string;
  totalAmount: number;
  paymentReference?: string;
  createdAt?: unknown;
  items?: Item[];
  product?: {
    name?: string;
    image?: string;
    framePrice?: number;
    lensPrice?: number;
    lensType?: string;
    lensCoating?: string;
    lensPriceLabel?: string;
  };
};

const toTitleCase = (value: string) =>
  value
    .replace(/-/g, ' ')
    .split(' ')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const normalizeProgressStatus = (status: string) => {
  const normalized = (status || '').toLowerCase();
  if (['pending', 'processing', 'in transit', 'delivered', 'cancelled'].includes(normalized)) {
    return normalized;
  }
  if (['pending-quote', 'quoted'].includes(normalized)) {
    return 'pending';
  }
  if (['confirmed', 'paid', 'completed', 'shipped'].includes(normalized)) {
    return 'processing';
  }
  return 'pending';
};

function TrackOrderContent() {
  const params = useSearchParams();
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState<TrackOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // If orderId is passed as query param, auto-search for it
  const handleTrackOrder = useCallback(async (orderNum?: string) => {
    const searchNumber = ((orderNum ?? orderNumber) || '').trim();
    if (!searchNumber) {
      setError('Please enter an order number');
      return;
    }

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const trimmedOrderNumber = searchNumber;
      let foundOrder: TrackOrder | null = null;
      
      // Try querying by orderId field
      const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const customizedOrdersQuery = query(collection(db, 'customizedOrders'), orderBy('submittedAt', 'desc'));
      const [ordersSnapshot, customizedSnapshot] = await Promise.all([getDocs(ordersQuery), getDocs(customizedOrdersQuery)]);

      const snapshot = { docs: [...ordersSnapshot.docs, ...customizedSnapshot.docs] };

      const filteredDocs = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.orderId === trimmedOrderNumber || doc.id === trimmedOrderNumber;
      });
      
      if (filteredDocs.length > 0) {
        const orderData = filteredDocs[0].data() as Partial<Order> & Partial<customizedOrder>;
        const isCustomizedOrder = Boolean(
          orderData?.productName || orderData?.lensType || orderData?.estimatedLensPrice || orderData?.framePrice
        );
        const baseCustomer = {
          name: orderData.customer?.name,
          phone: orderData.customer?.phone,
          address: orderData.customer?.address,
          zipCode: orderData.customer?.zipCode,
        };

        if (isCustomizedOrder) {
          const lensPrice = orderData.finalLensPrice ?? orderData.estimatedLensPrice ?? 0;
          const lensPriceLabel = orderData.finalLensPrice ? 'Final Lens Price' : 'Estimated Lens Price';
          const statusSource = orderData.deliveryStatus || orderData.paymentStatus || 'pending-quote';
          foundOrder = {
            id: filteredDocs[0].id,
            orderId: orderData.orderId,
            kind: 'customized',
            customer: baseCustomer,
            deliveryStatus: statusSource,
            progressStatus: normalizeProgressStatus(statusSource),
            totalAmount: orderData.totalAmount ?? (orderData.framePrice ?? 0) + lensPrice,
            paymentReference: orderData.paymentReference,
            createdAt: orderData.submittedAt ?? orderData.createdAt,
            product: {
              name: orderData.productName,
              image: orderData.productImage,
              framePrice: orderData.framePrice,
              lensPrice,
              lensType: orderData.lensType,
              lensCoating: orderData.lensCoating,
              lensPriceLabel,
            },
          };
        } else {
          const statusSource = orderData.deliveryStatus || 'pending';
          foundOrder = {
            id: filteredDocs[0].id,
            orderId: orderData.orderId,
            kind: 'standard',
            customer: baseCustomer,
            deliveryStatus: statusSource,
            progressStatus: normalizeProgressStatus(statusSource),
            totalAmount: orderData.totalAmount ?? 0,
            paymentReference: orderData.paymentReference,
            createdAt: orderData.createdAt,
            items: (orderData.items ?? []) as Item[],
          };
        }
      }

      if (foundOrder) {
        setOrder(foundOrder);
      } else {
        setError('Order not found. Please check your order number and try again.');
      }
    } catch (err) {
      console.error('Error tracking order:', err);
      setError('Failed to track order. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);
    useEffect(() => {
      const orderId = params?.get ? params.get('orderId') : null;
      if (orderId) {
        console.log('Received orderId from params:', orderId);
        if (orderId !== orderNumber) {
          setOrderNumber(orderId);
          // call handler with the orderId directly to avoid relying on state update timing
          void handleTrackOrder(orderId);
        }
      }
    }, [params, orderNumber, handleTrackOrder]);

  const getStatusColor = (deliveryStatus: string) => {
    switch (deliveryStatus.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'in transit':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending-quote':
      case 'quoted':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
      case 'paid':
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusStep = (deliveryStatus: string) => {
    switch (deliveryStatus.toLowerCase()) {
      case 'pending':
        return 1;
      case 'processing':
        return 2;
      case 'in transit':
        return 3;
      case 'delivered':
        return 4;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-white via-gray-50 to-white">
      <NavBar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-[#1d4e89] to-[#15396b] rounded-2xl mb-6 shadow-lg">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">Track Your Order</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Enter your order number or tracking number to check the status of your delivery
          </p>
        </div>

        {/* Inline searching indicator (shows when loading and before results) */}
        {loading && !order && (
          <div className="bg-white rounded-lg p-4 mb-6 border border-gray-100 flex items-center gap-4">
            <Loader className="w-12 h-12 animate-spin text-[#1d4e89] mb-4" />
            <p className="text-sm text-gray-700">Searching for order{orderNumber ? ` "${orderNumber}"` : ''}...</p>
          </div>
        )}

        {/* Search Box */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8 border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Input
              type="text"
              placeholder="Enter order number (e.g., ORD-12345) or tracking number"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') void handleTrackOrder(); }}
              className="flex-1 px-4 py-3 text-base"
            />
            <Button
                onClick={() => void handleTrackOrder()}
              disabled={loading || !orderNumber.trim()}
              className="bg-linear-to-r from-[#1d4e89] to-[#15396b] hover:shadow-lg hover:scale-105 transition-all duration-200 px-8 py-3 whitespace-nowrap disabled:opacity-50"
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Track Order
                </>
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4 bg-red-50 border-l-4 border-red-500 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5" />
              <AlertDescription className="text-red-700 font-medium">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {order && (
          <div className="space-y-6 animate-in fade-in zoom-in-95">
            {/* Order Info */}
            <Card className="shadow-lg border-gray-100">
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-3xl font-bold text-gray-900">{order.orderId || order.id}</CardTitle>
                    <p className="text-gray-600 mt-2 text-sm">
                      Ordered on {formatFirestoreTimestamp(order.createdAt, 'en-NG')}
                    </p>
                  </div>
                  <Badge className={`px-5 py-2.5 text-sm font-bold flex items-center gap-2 whitespace-nowrap ${getStatusColor(order.deliveryStatus)} shadow-sm border-0`}>
                    {order.progressStatus === 'delivered' && (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                    {toTitleCase(order.deliveryStatus)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>

                {/* Progress Tracker */}
                <div className="mb-10 pb-10 border-b border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-6 text-lg">Delivery Progress</h3>
                  <div className="flex items-center justify-between relative">
                    {/* Progress Line */}
                    <Progress 
                      value={(getStatusStep(order.progressStatus) - 1) * 33.33} 
                      className="absolute left-0 right-0 top-5 h-1.5 bg-gray-200"
                    />

                  {/* Steps */}
                  {['Pending', 'Processing', 'In Transit', 'Delivered'].map((step, index) => {
                    const stepNumber = index + 1;
                    const isActive = getStatusStep(order.progressStatus) >= stepNumber;
                    const isCurrent = getStatusStep(order.progressStatus) === stepNumber;

                    return (
                      <div key={step} className="flex flex-col items-center relative z-10">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 shadow-md ${
                            isActive
                              ? 'bg-linear-to-br from-[#1d4e89] to-[#15396b] text-white'
                              : 'bg-white border-2 border-gray-300 text-gray-500'
                          }`}
                        >
                          {stepNumber}
                        </div>
                        <p
                          className={`text-xs mt-3 font-semibold text-center transition-colors ${
                            isCurrent ? 'text-[#1d4e89]' : isActive ? 'text-blue-900' : 'text-gray-400'
                          }`}
                        >
                          {step}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

                {/* Order ID and Payment Reference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {order.orderId && (
                    <Card className="bg-linear-to-r from-blue-50 to-blue-100 border-blue-200">
                      <CardContent className="pt-6">
                        <p className="text-xs text-gray-700 mb-2 font-medium uppercase tracking-wider">Order ID</p>
                        <p className="text-xl font-bold text-[#1d4e89] font-mono">{order.orderId}</p>
                      </CardContent>
                    </Card>
                  )}
                  {order.paymentReference && (
                    <Card className="bg-linear-to-r from-green-50 to-green-100 border-green-200">
                      <CardContent className="pt-6">
                        <p className="text-xs text-gray-700 mb-2 font-medium uppercase tracking-wider">Payment Reference</p>
                        <p className="text-xl font-bold text-green-700 font-mono">{order.paymentReference}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>


              {/* Delivery Contact Info */}
              <div className="border-t pt-6">
                <h3 className="font-bold text-gray-900 mb-4 text-lg">Delivery To</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Name</p>
                    <p className="text-base font-semibold text-gray-900">{order.customer.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Phone</p>
                    <p className="text-base font-semibold text-gray-900">{order.customer.phone || 'N/A'}</p>
                  </div>
                  {order.customer.address && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Address</p>
                      <p className="text-base font-semibold text-gray-900">{order.customer.address} {order.customer.zipCode}</p>
                    </div>
                  )}
                </div>
              </div>
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card className="shadow-lg border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg">
                  {order.kind === 'customized' ? 'Customized Order Details' : 'Order Items'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.kind === 'customized' ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 bg-linear-to-br from-gray-100 to-gray-50 rounded-lg overflow-hidden shrink-0 shadow-sm">
                        {order.product?.image && (
                          <Image
                            src={order.product.image}
                            alt={order.product.name || 'Customized product'}
                            className="w-full h-full object-cover"
                            width={80}
                            height={80}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900">{order.product?.name || 'Customized Frame'}</h4>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          {order.product?.lensType && (
                            <p>Lens Type: <span className="capitalize">{order.product.lensType}</span></p>
                          )}
                          {order.product?.lensCoating && (
                            <p>Lens Coating: <span className="capitalize">{order.product.lensCoating}</span></p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-gray-50 border">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Frame Price</p>
                        <p className="text-lg font-semibold text-gray-900">
                          ₦{(order.product?.framePrice ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-gray-50 border">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">{order.product?.lensPriceLabel || 'Lens Price'}</p>
                        <p className="text-lg font-semibold text-gray-900">
                          ₦{(order.product?.lensPrice ?? 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t-2 border-gray-200 flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="text-2xl font-extrabold bg-linear-to-r from-[#1d4e89] to-[#2d6bb3] bg-clip-text text-transparent">
                        ₦{order.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {(order.items ?? []).map((item, index) => (
                        <div key={index} className="flex items-start gap-4 pb-3 border-b last:border-0">
                          <div className="w-16 h-16 bg-linear-to-br from-gray-100 to-gray-50 rounded-lg overflow-hidden shrink-0 shadow-sm">
                            {item.image && (
                              <Image src={item.image} alt={item.name} className="w-full h-full object-cover" width={64} height={64} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900">{item.name}</h4>
                            <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                              <p>Qty: {item.quantity}</p>
                              <p>Price: ₦{item.price.toLocaleString()}</p>
                              {item.lensOption && (
                                <p>Lens: <span className="capitalize">{item.lensOption}</span></p>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold text-gray-900">₦{(item.price * item.quantity).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-4 border-t-2 border-gray-200 flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="text-2xl font-extrabold bg-linear-to-r from-[#1d4e89] to-[#2d6bb3] bg-clip-text text-transparent">
                        ₦{order.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>  
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-linear-to-b from-white via-gray-50 to-white">
        <NavBar />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
          <Loader className="w-12 h-12 animate-spin text-[#1d4e89] mb-4" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <TrackOrderContent />
    </Suspense>
  );
}    