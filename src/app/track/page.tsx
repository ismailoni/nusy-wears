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
import Link from 'next/link';
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

  const statusLower = order?.deliveryStatus?.toLowerCase() ?? '';

  return (
    <div className="min-h-screen bg-linear-to-b from-white via-gray-50 to-white">
      <NavBar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#1d4e89] via-[#1c3f6b] to-[#15396b] text-white mb-10 shadow-2xl">
          <div aria-hidden className="absolute inset-0 bg-grid-white/5 mask-[radial-gradient(circle_at_center,white,transparent_60%)]" />
          <div aria-hidden className="absolute -top-24 -right-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden className="absolute -bottom-28 -left-28 h-64 w-64 rounded-full bg-black/15 blur-3xl" />

          <div className="relative z-10 px-6 sm:px-10 lg:px-12 py-10 sm:py-14 flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs sm:text-sm text-white/90 backdrop-blur">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              Live delivery status
            </div>

            <div className="flex flex-col gap-3">
              <div className="inline-flex items-center gap-3 text-sm text-white/80">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 shadow-inner shadow-black/10">
                  <Package className="h-6 w-6" />
                </span>
                <span className="font-medium">Track standard & customized orders in one place</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
                Track your order with
                <span className="block bg-linear-to-r from-white via-blue-50 to-emerald-100 bg-clip-text text-transparent">
                  instant updates
                </span>
              </h1>
              <p className="text-base sm:text-lg text-white/85 max-w-2xl">
                Enter your order or tracking number to see delivery progress, payment reference, and item details without leaving this page.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                asChild
                size="lg"
                className="bg-white text-[#1d4e89] hover:bg-white/90 shadow-lg shadow-black/10"
              >
                <a href="#order-tracker">Start tracking</a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              >
                <Link href="/support">Need help?</Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-white/80">
              <span className="rounded-full bg-white/10 px-3 py-1">Secure lookups</span>
              <span className="rounded-full bg-white/10 px-3 py-1">Realtime status</span>
              <span className="rounded-full bg-white/10 px-3 py-1">Standard & customized</span>
            </div>
          </div>
        </section>

        {/* Inline searching indicator (shows when loading and before results) */}
        {loading && !order && (
          <div className="bg-white rounded-lg p-4 mb-6 border border-gray-100 flex items-center gap-4">
            <Loader className="w-12 h-12 animate-spin text-[#1d4e89] mb-4" />
            <p className="text-sm text-gray-700">Searching for order{orderNumber ? ` "${orderNumber}"` : ''}...</p>
          </div>
        )}

        {/* Search Box */}
        <div id="order-tracker" className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8 border border-gray-100">
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
            <Card className="shadow-lg border-gray-100 py-6">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-3">
                  <div className="inline-flex items-center gap-2 self-start rounded-full bg-blue-50 text-blue-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                    Order details
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-3xl font-bold text-gray-900">{order.orderId}</CardTitle>
                      <p className="text-gray-600 mt-2 text-sm">
                        Ordered on {formatFirestoreTimestamp(order.createdAt, 'en-NG')}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 whitespace-nowrap ${getStatusColor(order.deliveryStatus)} shadow-sm border-0`}>
                        {order.progressStatus === 'delivered' && (
                          <CheckCircle2 className="w-5 h-5" />
                        )}
                        {toTitleCase(order.deliveryStatus)}
                      </Badge>
                      <span className="rounded-full bg-blue-50 text-blue-900 px-4 py-2 text-sm font-semibold border border-blue-100">
                        Total: ₦{order.totalAmount.toLocaleString()}
                      </span>
                      <span className="rounded-full bg-gray-50 text-gray-700 px-3 py-2 text-xs font-semibold border border-gray-200">
                        {order.kind === 'customized' ? 'Customized order' : `${(order.items ?? []).length || 0} items`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>

                {/* Progress Tracker */}
                <div className="mb-10 pb-10 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900 text-lg">Delivery Progress</h3>
                    <p className="text-xs text-gray-500">Live status updates</p>
                  </div>
                  <div className="flex items-center justify-between relative">
                    {/* Progress Line */}
                    <Progress 
                      value={(getStatusStep(order.progressStatus) - 1) * 33.33} 
                      className="absolute left-0 right-0 top-5 h-1.5 bg-gray-200 overflow-hidden"
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
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 text-xs text-gray-600">
                    <div className="flex items-start gap-2 rounded-lg bg-gray-50 border border-gray-100 p-3">
                      <span className="mt-0.5 h-2 w-2 rounded-full bg-yellow-400" />
                      <div>
                        <p className="font-semibold text-gray-800">Pending</p>
                        <p>We received your order and it&apos;s being queued for processing.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg bg-gray-50 border border-gray-100 p-3">
                      <span className="mt-0.5 h-2 w-2 rounded-full bg-blue-500" />
                      <div>
                        <p className="font-semibold text-gray-800">Processing</p>
                        <p>Payment confirmed and the package is being prepared for dispatch.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg bg-gray-50 border border-gray-100 p-3">
                      <span className="mt-0.5 h-2 w-2 rounded-full bg-purple-500" />
                      <div>
                        <p className="font-semibold text-gray-800">In Transit</p>
                        <p>Courier has your order and it&apos;s on the way to your address.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg bg-gray-50 border border-gray-100 p-3">
                      <span className="mt-0.5 h-2 w-2 rounded-full bg-green-500" />
                      <div>
                        <p className="font-semibold text-gray-800">Delivered</p>
                        <p>Package was successfully delivered. Enjoy your eyewear!</p>
                      </div>
                    </div>
                  </div>
                  {(statusLower === 'cancelled' || statusLower === 'pending-quote' || statusLower === 'quoted') && (
                    <div className="mt-4 rounded-xl bg-orange-50 border border-orange-100 p-4 flex items-start gap-3 text-sm text-orange-800">
                      <AlertCircle className="w-4 h-4 mt-0.5" />
                      <div className="space-y-1">
                        {statusLower === 'cancelled' && (
                          <>
                            <p className="font-semibold">Order cancelled</p>
                            <p className="text-xs">This order was cancelled. If this is unexpected, please reach out to support with your order ID.</p>
                          </>
                        )}
                        {(statusLower === 'pending-quote' || statusLower === 'quoted') && (
                          <>
                            <p className="font-semibold">Awaiting quote confirmation</p>
                            <p className="text-xs">We&apos;re preparing your final lens quote. You&apos;ll see updated totals once it&apos;s confirmed.</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
              </div>

                {/* Order ID and Payment Reference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {order.orderId && (
                    <Card className="bg-linear-to-r from-blue-50 to-blue-100 border-blue-200 py-6">
                      <CardContent>
                        <p className="text-xs text-gray-700 mb-2 font-medium uppercase tracking-wider">Order ID</p>
                        <p className="text-xl font-bold text-[#1d4e89] font-mono">{order.orderId}</p>
                      </CardContent>
                    </Card>
                  )}
                  {order.paymentReference && (
                    <Card className="bg-linear-to-r from-green-50 to-green-100 border-green-200 py-6">
                      <CardContent>
                        <p className="text-xs text-gray-700 mb-2 font-medium uppercase tracking-wider">Payment Reference</p>
                        <p className="text-xl font-bold text-green-700 font-mono">{order.paymentReference}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>


              {/* Delivery Contact Info */}
              <div className="border-t pt-6">
                <h3 className="font-bold text-gray-900 mb-4 text-lg">Delivery To</h3>
                <div className="space-y-3 bg-gray-50 border border-gray-100 rounded-xl p-4">
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
            <Card className="shadow-lg border-gray-100 py-6">
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