'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Eye, Edit, ExternalLink } from 'lucide-react';
import { collection, query, orderBy, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface Order {
  id: string;
  productName: string;
  productImage: string;
  framePrice: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  lensType: string;
  lensCoating: string;
  prescriptionData?: {
    rightEye?: { sphere?: string; cylinder?: string; axis?: string };
    leftEye?: { sphere?: string; cylinder?: string; axis?: string };
    pd?: string;
    additionalNotes?: string;
  };
  prescriptionImageUrl?: string;
  estimatedLensPrice: number;
  finalLensPrice?: number;
  totalPrice?: number;
  status: string;
  checkoutLink?: string;
  submittedAt: string;
  quotedAt?: string;
}

export default function AdminCustomizedOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
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
      })) as Order[];
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailsDialog(true);
  };

  const handleSetPrice = (order: Order) => {
    setSelectedOrder(order);
    setFinalLensPrice(order.finalLensPrice?.toString() || order.estimatedLensPrice.toString());
    setAdminNotes('');
    setGeneratedLink('');
    setShowPricingDialog(true);
  };

  const handleSubmitPrice = async () => {
    if (!selectedOrder || !finalLensPrice) {
      alert('Please enter a valid lens price');
      return;
    }

    setSubmitting(true);

    try {
      const lensPrice = parseFloat(finalLensPrice);
      const totalPrice = selectedOrder.framePrice + lensPrice;
      const checkoutLink = `${window.location.origin}/customized-checkout/${selectedOrder.id}`;

      await updateDoc(doc(db, 'customizedOrders', selectedOrder.id), {
        finalLensPrice: lensPrice,
        totalPrice,
        status: 'quoted',
        checkoutLink,
        adminNotes: adminNotes || null,
        quotedAt: Timestamp.now(),
      });

      setGeneratedLink(checkoutLink);
      await fetchOrders();
      alert('Price set successfully! Checkout link generated.');
    } catch (error) {
      console.error('Error setting price:', error);
      alert('Failed to set price. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          alert('Link copied to clipboard!');
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
        alert('Link copied to clipboard!');
      } else {
        alert('Failed to copy link. Please copy manually.');
      }
    } catch (error) {
      console.error('Fallback copy failed:', error);
      alert('Failed to copy link. Please copy manually.');
    }

    document.body.removeChild(textArea);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; className: string }> = {
      'pending-quote': { text: 'Pending Quote', className: 'bg-yellow-100 text-yellow-800' },
      quoted: { text: 'Quoted', className: 'bg-blue-100 text-blue-800' },
      confirmed: { text: 'Confirmed', className: 'bg-green-100 text-green-800' },
      processing: { text: 'Processing', className: 'bg-purple-100 text-purple-800' },
      shipped: { text: 'Shipped', className: 'bg-indigo-100 text-indigo-800' },
      delivered: { text: 'Delivered', className: 'bg-gray-100 text-gray-800' },
      cancelled: { text: 'Cancelled', className: 'bg-red-100 text-red-800' },
    };

    const badge = badges[status] || { text: status, className: 'bg-gray-100 text-gray-800' };

    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>{badge.text}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading orders...</div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No customized lens orders yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
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
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-900">{order.id}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{order.customerName}</div>
                      <div className="text-gray-500">{order.customerPhone}</div>
                      {order.customerEmail && <div className="text-gray-500 text-xs">{order.customerEmail}</div>}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Image
                        src={order.productImage}
                        alt={order.productName}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div className="text-sm text-gray-900">{order.productName}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      <div className="text-gray-700">Frame: ₦{order.framePrice.toLocaleString()}</div>
                      <div className="text-gray-700">
                        Lens:{' '}
                        {order.finalLensPrice ? (
                          `₦${order.finalLensPrice.toLocaleString()}`
                        ) : (
                          <span className="text-yellow-600">₦{order.estimatedLensPrice.toLocaleString()} (Est.)</span>
                        )}
                      </div>
                      {order.totalPrice && (
                        <div className="font-semibold text-[#1d4e89] mt-1">Total: ₦{order.totalPrice.toLocaleString()}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">{getStatusBadge(order.status)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetails(order)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleSetPrice(order)}
                        className="text-green-600 hover:text-green-800 p-1"
                        title="Set Price"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-175 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>Complete order information and prescription details</DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-500">Order ID</div>
                  <div className="font-mono font-semibold">{selectedOrder.id}</div>
                </div>
                {getStatusBadge(selectedOrder.status)}
              </div>

              <div>
                <h3 className="font-semibold mb-3">Product Information</h3>
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
                <h3 className="font-semibold mb-3">Customer Information</h3>
                <div className="space-y-2 p-4 border rounded-lg">
                  <div>
                    <span className="text-sm text-gray-500">Name:</span>
                    <span className="ml-2 font-medium">{selectedOrder.customerName}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Phone:</span>
                    <span className="ml-2 font-medium">{selectedOrder.customerPhone}</span>
                  </div>
                  {selectedOrder.customerEmail && (
                    <div>
                      <span className="text-sm text-gray-500">Email:</span>
                      <span className="ml-2 font-medium">{selectedOrder.customerEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedOrder.prescriptionData && (
                <div>
                  <h3 className="font-semibold mb-3">Prescription Details</h3>
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

              {selectedOrder.prescriptionImageUrl && (
                <div>
                  <h3 className="font-semibold mb-3">Prescription Image</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Image
                      src={selectedOrder.prescriptionImageUrl}
                      alt="Prescription"
                      width={700}
                      height={500}
                      className="w-full"
                    />
                  </div>
                  <a
                    href={selectedOrder.prescriptionImageUrl}
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
                <h3 className="font-semibold mb-3">Pricing</h3>
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
                  {selectedOrder.totalPrice && (
                    <div className="flex justify-between pt-2 border-t border-blue-200">
                      <span className="font-semibold text-gray-900">Total:</span>
                      <span className="font-bold text-[#1d4e89]">₦{selectedOrder.totalPrice.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedOrder.checkoutLink && (
                <div>
                  <h3 className="font-semibold mb-3">Checkout Link</h3>
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
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>Set Final Lens Price</DialogTitle>
            <DialogDescription>
              Enter the final lens price and generate a checkout link for the customer
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg">
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
                    <div className="text-sm text-gray-600">{selectedOrder.customerName}</div>
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

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPricingDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmitPrice}
                  className="flex-1 bg-[#1d4e89] hover:bg-[#15396b]"
                  disabled={submitting || !finalLensPrice}
                >
                  {submitting ? 'Generating...' : 'Generate Checkout Link'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
