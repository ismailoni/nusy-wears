'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Eye, Edit, ExternalLink, Loader, Search, Clock, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { collection, query, orderBy, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { customizedOrder } from '@/types/order';
import Link from 'next/link';
import { formatFirestoreTimestamp } from '@/lib/utils';
import { toast } from 'sonner';



export default function AdminCustomizedOrdersPage() {
  const [orders, setOrders] = useState<customizedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<customizedOrder | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [finalLensPrice, setFinalLensPrice] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const ordersQuery = query(
        collection(db, 'customizedOrders'),
        orderBy('submittedAt', 'desc')
      );
      const snapshot = await getDocs(ordersQuery);
      const ordersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate?.()?.toISOString() || doc.data().submittedAt,
        quotedAt: doc.data().quotedAt?.toDate?.()?.toISOString() || doc.data().quotedAt,
      })) as customizedOrder[];
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (order: customizedOrder) => {
    setSelectedOrder(order);
    setShowDetailsDialog(true);
  };

  const handleSetPrice = (order: customizedOrder) => {
    setSelectedOrder(order);
    setFinalLensPrice(order.finalLensPrice?.toString() || order.estimatedLensPrice.toString());
    setAdminNotes('');
    setGeneratedLink(order.checkoutLink || '');
    setShowPricingDialog(true);
  };

  const handleSubmitPrice = async () => {
    if (!selectedOrder || !finalLensPrice) {
      toast.error('Please enter a valid lens price');
      return;
    }

    setSubmitting(true);

    try {
      const lensPrice = parseFloat(finalLensPrice);
      const totalAmount = selectedOrder.framePrice + lensPrice;

      await updateDoc(doc(db, 'customizedOrders', selectedOrder.id), {
        finalLensPrice: lensPrice,
        totalAmount,
        paymentStatus: 'quoted',
        adminNotes: adminNotes || null,
        quotedAt: Timestamp.now(),
      });

      toast.success('Price quoted successfully!');
      fetchOrders();
      setSelectedOrder({ ...selectedOrder, finalLensPrice: lensPrice, totalAmount });
    } catch (error) {
      console.error('Error setting price:', error);
      toast.error('Failed to set price. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!selectedOrder || !selectedOrder.finalLensPrice) {
      toast.error('Please set the final price first');
      return;
    }

    setSubmitting(true);

    try {
      const checkoutLink = `${window.location.origin}/customized-checkout/${selectedOrder.id}`;

      await updateDoc(doc(db, 'customizedOrders', selectedOrder.id), {
        checkoutLink,
      });

      setGeneratedLink(checkoutLink);
      await fetchOrders();
      toast.success('Checkout link generated successfully!');
    } catch (error) {
      console.error('Error generating link:', error);
      toast.error('Failed to generate link. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          toast.success('Link copied to clipboard!');
        })
        .catch(() => {
          fallbackCopyToClipboard(text);
        });
    } else {
      fallbackCopyToClipboard(text);
    }
  };

  const fallbackCopyToClipboard = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        toast.success('Link copied to clipboard!');
      } else {
        toast.error('Failed to copy link. Please copy manually.');
      }
    } catch (error) {
      console.error('Fallback copy failed:', error);
      toast.error('Failed to copy link. Please copy manually.');
    }

    document.body.removeChild(textArea);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; className: string }> = {
      'pending-quote': { text: 'Pending Quote', className: 'bg-yellow-100 text-yellow-800' },
      quoted: { text: 'Quoted', className: 'bg-blue-100 text-blue-800' },
      paid: { text: 'Paid', className: 'bg-green-100 text-green-800' },
    };

    const badge = badges[status] || { text: status, className: 'bg-gray-100 text-gray-800' };

    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>{badge.text}</span>;
  };

   if (loading) {
     return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-b from-white to-gray-50">
         <Loader className="w-12 h-12 animate-spin text-[#1d4e89] mb-4" />
         <p className="text-gray-600 font-medium">Loading Customized Orders...</p>
       </div>
     );
   }

  const filteredOrders = searchTerm.trim()
    ? orders.filter(
        (order) =>
          order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customer.phone.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : orders;

  const stats = {
    pending: orders.filter((o) => o.paymentStatus === 'pending-quote').length,
    quoted: orders.filter((o) => o.paymentStatus === 'quoted').length,
    paid: orders.filter((o) => o.paymentStatus === 'paid').length,
    totalRevenue: orders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + (o.totalAmount ?? 0), 0),
  };

  if (orders.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="text-center py-20 px-6">
          <div className="mb-6">
            <AlertCircle className="w-20 h-20 text-gray-300 mx-auto" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No Customized Orders Yet</h3>
          <p className="text-gray-600 text-base max-w-md mx-auto mb-8">
            There are no customized lens orders at the moment. New orders will appear here once customers submit their requests.
          </p>
          <Button asChild className="bg-[#1d4e89] hover:bg-[#15396b]">
            <Link href="/admin/dashboard">← Back to Dashboard</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Button asChild className="bg-[#1d4e89] hover:bg-[#15396b]">
            <Link href="/admin/dashboard">← Back to Dashboard</Link>
          </Button>
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customized Orders</h1>
          <p className="text-gray-600 mt-1">Manage custom lens orders and generate checkout links</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pending Quote</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Quoted</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.quoted}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Paid</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.paid}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">₦{(stats.totalRevenue / 1000).toFixed(0)}k</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer name, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d4e89] focus:border-transparent"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-linear-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prices</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono font-semibold text-[#1d4e89]">{order.orderId}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900">{order.customer.name}</div>
                      <div className="text-gray-500 text-sm">{order.customer.phone}</div>
                      {order.customer.email && <div className="text-gray-400 text-xs">{order.customer.email}</div>}
                    </div>
                  </td>
                  <td className="px-4 py-4 mr-2">
                    <div className="flex items-center gap-3">
                      <Image
                        src={order.productImage}
                        alt={order.productName}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div className="text-sm font-medium text-gray-900">{order.productName}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between text-gray-700">
                        <span>Frame:</span>
                        <span className="font-medium">₦{order.framePrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Lens:</span>
                        {order.finalLensPrice ? (
                          <span className="font-medium text-gray-900">₦{order.finalLensPrice.toLocaleString()}</span>
                        ) : (
                          <span className="font-medium text-yellow-600">₦{order.estimatedLensPrice.toLocaleString()} (Est.)</span>
                        )}
                      </div>
                      {order.totalAmount && (
                        <div className="border-t pt-1 flex justify-between font-semibold text-[#1d4e89]">
                          <span>Total:</span>
                          <span>₦{order.totalAmount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">{getStatusBadge(order.paymentStatus)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatFirestoreTimestamp(order.submittedAt, 'en-NG')}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetails(order)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="hidden sm:inline">View</span>
                      </button>
                      <button
                        onClick={() => handleSetPrice(order)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Set Price"
                      >
                        <Edit className="w-4 h-4" />
                        <span className="hidden sm:inline">Quote</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No orders found matching your search</p>
            </div>
          )}
        </div>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl">Order Details</DialogTitle>
            <DialogDescription>Complete order information and prescription details</DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-5 pt-4">
              <div className="flex items-center justify-between p-4 bg-linear-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div>
                  <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Order ID</div>
                  <div className="font-mono font-bold text-lg text-[#1d4e89] mt-1">{selectedOrder.id}</div>
                </div>
                {getStatusBadge(selectedOrder.paymentStatus)}
              </div>

              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-3">Product Information</h3>
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <Image
                    src={selectedOrder.productImage}
                    alt={selectedOrder.productName}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded object-cover"
                  />
                  <div>
                    <div className="font-medium">{selectedOrder.productName}</div>
                    <div className="text-sm text-gray-600">Frame Price: ₦{selectedOrder.framePrice.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Coating: {selectedOrder.lensCoating}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-3">Customer Information</h3>
                <div className="space-y-2 p-4 border rounded-lg">
                  <div>
                    <span className="text-sm text-gray-500">Name:</span>
                    <span className="ml-2 font-medium">{selectedOrder.customer.name}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Phone:</span>
                    <span className="ml-2 font-medium">{selectedOrder.customer.phone}</span>
                  </div>
                  {selectedOrder.customer.email && (
                    <div>
                      <span className="text-sm text-gray-500">Email:</span>
                      <span className="ml-2 font-medium">{selectedOrder.customer.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedOrder.prescriptionData && (
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-3">Prescription Details</h3>
                  <div className="space-y-3 p-4 border rounded-lg">
                    {selectedOrder.prescriptionData.rightEye?.sphere && (
                      <div>
                        <div className="text-sm font-medium text-gray-700">Right Eye (OD)</div>
                        <div className="text-sm text-gray-600">
                          SPH: {selectedOrder.prescriptionData.rightEye.sphere}
                          {selectedOrder.prescriptionData.rightEye.cylinder &&
                            `, CYL: ${selectedOrder.prescriptionData.rightEye.cylinder}`}
                          {selectedOrder.prescriptionData.rightEye.axis &&
                            `, AXIS: ${selectedOrder.prescriptionData.rightEye.axis}`}
                        </div>
                      </div>
                    )}
                    {selectedOrder.prescriptionData.leftEye?.sphere && (
                      <div>
                        <div className="text-sm font-medium text-gray-700">Left Eye (OS)</div>
                        <div className="text-sm text-gray-600">
                          SPH: {selectedOrder.prescriptionData.leftEye.sphere}
                          {selectedOrder.prescriptionData.leftEye.cylinder &&
                            `, CYL: ${selectedOrder.prescriptionData.leftEye.cylinder}`}
                          {selectedOrder.prescriptionData.leftEye.axis &&
                            `, AXIS: ${selectedOrder.prescriptionData.leftEye.axis}`}
                        </div>
                      </div>
                    )}
                    {selectedOrder.prescriptionData.pd && (
                      <div>
                        <div className="text-sm font-medium text-gray-700">Pupillary Distance</div>
                        <div className="text-sm text-gray-600">{selectedOrder.prescriptionData.pd}mm</div>
                      </div>
                    )}
                    {selectedOrder.prescriptionData.additionalNotes && (
                      <div>
                        <div className="text-sm font-medium text-gray-700">Additional Notes</div>
                        <div className="text-sm text-gray-600">{selectedOrder.prescriptionData.additionalNotes}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedOrder.prescriptionData?.prescriptionFile && (
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-3">Prescription Image</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Image
                      src={selectedOrder.prescriptionData?.prescriptionFile}
                      alt="Prescription"
                      width={700}
                      height={500}
                      className="w-full"
                    />
                  </div>
                  <a
                    href={selectedOrder.prescriptionData?.prescriptionFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in new tab
                  </a>
                </div>
              )}

              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-3">Pricing</h3>
                <div className="space-y-2 p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">Frame Price:</span>
                    <span className="font-medium">₦{selectedOrder.framePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">
                      {selectedOrder.finalLensPrice ? 'Final Lens Price:' : 'Estimated Lens Price:'}
                    </span>
                    <span className={`font-medium ${!selectedOrder.finalLensPrice ? 'text-yellow-600' : ''}`}>
                      ₦{(selectedOrder.finalLensPrice || selectedOrder.estimatedLensPrice).toLocaleString()}
                      {!selectedOrder.finalLensPrice && ' (Not set)'}
                    </span>
                  </div>
                  {selectedOrder.totalAmount && (
                    <div className="flex justify-between pt-2 border-t border-blue-200">
                      <span className="font-semibold text-gray-900">Total:</span>
                      <span className="font-bold text-[#1d4e89]">₦{selectedOrder.totalAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedOrder.checkoutLink && (
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-3">Checkout Link</h3>
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <input type="text" value={selectedOrder.checkoutLink} readOnly className="flex-1 bg-transparent text-sm" />
                    <button
                      onClick={() => copyToClipboard(selectedOrder.checkoutLink!)}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <Button onClick={() => setShowDetailsDialog(false)} className="w-full">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl">Quote Customized Order</DialogTitle>
            <DialogDescription>
              Set the final lens price and generate a checkout link
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-5 pt-4">
              <div className="p-4 bg-linear-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="text-sm text-gray-500 mb-1">Order ID</div>
                <div className="font-mono font-semibold mb-3">{selectedOrder.id}</div>
                <div className="flex items-center gap-3 mb-3">
                  <Image
                    src={selectedOrder.productImage}
                    alt={selectedOrder.productName}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded object-cover"
                  />
                  <div>
                    <div className="font-medium">{selectedOrder.productName}</div>
                    <div className="text-sm text-gray-600">{selectedOrder.customer?.name || 'N/A'}</div>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Frame Price:</span>
                  <span className="font-medium">₦{selectedOrder.framePrice.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="final-lens-price">Final Lens Price (₦)</Label>
                <Input
                  id="final-lens-price"
                  type="number"
                  placeholder="25000"
                  value={finalLensPrice}
                  onChange={(event) => setFinalLensPrice(event.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Estimated: ₦{selectedOrder.estimatedLensPrice.toLocaleString()}
                </p>
              </div>

              {finalLensPrice && !Number.isNaN(parseFloat(finalLensPrice)) && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total Price:</span>
                    <span className="text-2xl font-bold text-[#1d4e89]">
                      ₦{(selectedOrder.framePrice + parseFloat(finalLensPrice)).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="admin-notes">Notes for Customer (Optional)</Label>
                <Textarea
                  id="admin-notes"
                  placeholder="Any additional information about the pricing or order..."
                  value={adminNotes}
                  onChange={(event) => setAdminNotes(event.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>

              {generatedLink && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm font-semibold text-green-900 mb-2">✓ Checkout Link Generated!</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={generatedLink}
                      readOnly
                      className="flex-1 bg-white px-3 py-2 rounded text-sm border"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedLink)}
                      className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 whitespace-nowrap"
                    >
                      Copy Link
                    </button>
                  </div>
                  <p className="text-xs text-green-700 mt-2">Send this link to the customer via WhatsApp or Email</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPricingDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                {!selectedOrder.finalLensPrice ? (
                  <Button
                    type="button"
                    onClick={handleSubmitPrice}
                    className="flex-1 bg-[#1d4e89] hover:bg-[#15396b] text-white"
                    disabled={submitting || !finalLensPrice}
                  >
                    {submitting ? 'Quoting...' : 'Quote Price'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleGenerateLink}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={submitting || generatedLink !== ''}
                  >
                    {submitting ? 'Generating...' : generatedLink ? 'Link Generated' : 'Generate Link'}
                  </Button>
                )}
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
