'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Check, CreditCard, Loader, AlertCircle, Download, Home } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Button } from '@/components/ui/button';
import { customizedOrder } from '@/types/order';
import { PaystackModal } from '@/components/PaystackModal';
import { toast } from 'sonner';
import { formatFirestoreTimestamp } from '@/lib/utils';



export default function CustomizedCheckoutPage() {
  const params = useParams<{ checkoutId: string }>();
  const router = useRouter();
  const checkoutId = params?.checkoutId;
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<customizedOrder | null>(null);
  const [showPaystackModal, setShowPaystackModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const lensPrice = useMemo(() => {
    if (!order) return 0;
    return order.finalLensPrice ?? order.estimatedLensPrice ?? 0;
  }, [order]);


  const fetchOrderData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const orderDoc = await getDoc(doc(db, 'customizedOrders', checkoutId!));

      if (!orderDoc.exists()) {
        setError('Order not found');
        return;
      }

      const orderData = {
        id: orderDoc.id,
        ...orderDoc.data(),
      } as customizedOrder;

      if (orderData.paymentStatus === 'paid') {
        setPaymentSuccess(true);
      }

      if (!orderData.totalAmount) {
        setError('Order price not set yet. Please contact support.');
        return;
      }

      setOrder(orderData);
    } catch (fetchError) {
      console.error('Error fetching order:', fetchError);
      setError('Failed to load order information');
    } finally {
      setLoading(false);
    }
  }, [checkoutId]);

  useEffect(() => {
    if (!checkoutId) return;
    fetchOrderData();
  }, [checkoutId, fetchOrderData]);

  const handleProceedToPayment = () => {
    if (!order?.totalAmount) {
      toast.error('Order price not set yet.');
      return;
    }
    if (!order.customer?.email) {
      toast.error('Email is required for payment.', {
        description: 'Please contact support to update your email on this order.',
      });
      return;
    }
    setShowPaystackModal(true);
  };

  const handlePaymentSuccess = async (reference: string) => {
    try {
      if (!checkoutId) return;

      await updateDoc(doc(db, 'customizedOrders', checkoutId), {
        paymentStatus: 'paid',
        paymentReference: reference,
        paidAt: new Date(),
      });

      setOrder((prev) =>
        prev
          ? {
              ...prev,
              paymentStatus: 'paid',
              paymentReference: reference,
              paidAt: new Date(),
            }
          : prev
      );

      setPaymentSuccess(true);
      toast.success('Payment Successful!', {
        description: 'Your order has been confirmed.',
      });
    } catch (paymentError) {
      console.error('Error updating order payment status:', paymentError);
      toast.error('Payment captured, but order update failed.', {
        description: 'Please contact support with your payment reference.',
      });
    } finally {
      setShowPaystackModal(false);
    }
  };

  const handlePaymentError = (message: string) => {
    setShowPaystackModal(false);
    toast.error(message || 'Payment failed. Please try again.');
  };

    const downloadReceipt = () => {
      if (!order) return;

      (async () => {
        try {
          type JsPDFConstructor = new (...args: unknown[]) => {
            internal: { pageSize: { getWidth(): number; getHeight(): number } };
            addImage: (data: string, format: string, x: number, y: number, w: number, h: number) => void;
            setFontSize: (size: number) => void;
            setTextColor: (r: number, g?: number, b?: number) => void;
            setFont: (font: string, style?: string) => void;
            text: (text: string, x: number, y: number, opts?: Record<string, unknown>) => void;
            setDrawColor: (r: number, g?: number, b?: number) => void;
            setLineWidth: (width: number) => void;
            line: (x1: number, y1: number, x2: number, y2: number) => void;
            setFillColor: (r: number, g?: number, b?: number) => void;
            roundedRect: (x: number, y: number, w: number, h: number, rx: number, ry: number, style: string) => void;
            save: (name: string) => void;
          };

          const jspdfModule = await import('jspdf');
          const jsPDFCtor = ((jspdfModule as unknown) as { jsPDF?: JsPDFConstructor }).jsPDF ?? ((jspdfModule as unknown) as JsPDFConstructor);

          const doc = new jsPDFCtor({ unit: 'pt', format: 'a4' });
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();

          // Header with logo and company info
          doc.setFontSize(18);
          doc.setTextColor(29, 78, 137); // #1d4e89
          doc.setFont('helvetica', 'bold');
          doc.text('NUSY WEARS', 120, 50);
          doc.setFontSize(10);
          doc.setTextColor(100);
          doc.setFont('helvetica', 'normal');
          doc.text('Premium Optical Solutions', 120, 64);
          doc.text('Lagos, Nigeria', 120, 78);

          // Separator line
          doc.setDrawColor(29, 78, 137);
          doc.setLineWidth(1.2);
          doc.line(40, 100, pageWidth - 40, 100);

          // Order metadata box
          const metaBoxY = 116;
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(234, 236, 240);
          doc.roundedRect(40, metaBoxY, pageWidth - 80, 60, 8, 8, 'FD');

          doc.setTextColor(71, 85, 105);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text('Order ID', 56, metaBoxY + 16);
          doc.text('Order Date', 56, metaBoxY + 34);
          doc.text('Payment Ref', 56, metaBoxY + 52);

          doc.setTextColor(15, 23, 42);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(String(order.orderId), 140, metaBoxY + 16);
          doc.text(new Date(order.submittedAt).toLocaleDateString(), 140, metaBoxY + 34);
          doc.text(String(order.paymentReference || ''), 140, metaBoxY + 52);

          // Customer section
          let currentY = metaBoxY + 80;
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text('Customer Information', 40, currentY);

          currentY += 16;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          doc.text('Name:', 56, currentY);
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          doc.text(String(order.customer.name), 140, currentY);

          currentY += 16;
          doc.setTextColor(71, 85, 105);
          doc.setFont('helvetica', 'normal');
          doc.text('Email:', 56, currentY);
          doc.setTextColor(15, 23, 42);
          doc.text(String(order.customer.email || ''), 140, currentY);

          currentY += 16;
          doc.setTextColor(71, 85, 105);
          doc.setFont('helvetica', 'normal');
          doc.text('Phone:', 56, currentY);
          doc.setTextColor(15, 23, 42);
          doc.text(String(order.customer.phone || ''), 140, currentY);

          // Items section
          currentY += 28;
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text('Order Items', 40, currentY);

          currentY += 16;
          // Table header
          doc.setFillColor(29, 78, 137);
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('Product', 56, currentY);
          doc.text('Details', 200, currentY);
          doc.text('Amount', pageWidth - 56, currentY, { align: 'right' });

          currentY += 12;
          doc.setDrawColor(226, 232, 240);
          doc.line(40, currentY, pageWidth - 40, currentY);

          // Item row
          currentY += 12;
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text(String(order.productName), 56, currentY);

          currentY += 12;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100);
          const details = `${order.lensType ? `Lens: ${order.lensType}` : ''}${order.lensCoating ? ` • Coating: ${order.lensCoating}` : ''}`;
          doc.text(String(details), 200, currentY);

          doc.setTextColor(15, 23, 42);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(`₦${String(order.totalAmount.toLocaleString())}`, pageWidth - 56, currentY, { align: 'right' });

          // Summary section
          const summaryY = currentY + 28;
          const leftCol = 280;
          const rightCol = pageWidth - 56;

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100);
          doc.text('Subtotal:', leftCol, summaryY);
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          doc.text(`₦${String(order.totalAmount.toLocaleString())}`, rightCol, summaryY, { align: 'right' });

          // Total line
          doc.setDrawColor(226, 232, 240);
          doc.line(leftCol, summaryY + 12, rightCol, summaryY + 12);

          // Grand total
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(29, 78, 137);
          doc.text('Total Due:', leftCol, summaryY + 28);
          doc.text(`₦${String(order.totalAmount.toLocaleString())}`, rightCol, summaryY + 28, { align: 'right' });

          // Footer
          const footerY = pageHeight - 50;
          doc.setDrawColor(241, 245, 249);
          doc.line(40, footerY - 10, pageWidth - 40, footerY - 10);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(148, 163, 184);
          doc.text('Thank you for shopping with Nusy Wears!', 40, footerY + 10);
          doc.text('Support: +234 808 202 0919 • info@nusywears.com', pageWidth - 40, footerY + 10, { align: 'right' });

          doc.save(`Nusy-Wears-Receipt-${order.orderId}.pdf`);

          toast.success('Receipt Downloaded', {
            description: 'Your receipt has been downloaded successfully.',
          });
        } catch (err) {
          console.error('PDF generation failed', err);
          toast.error('Failed to generate PDF receipt.');
        }
      })();
    };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-[#1d4e89] mx-auto mb-3" />
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'This order link is invalid or has expired.'}</p>
            <Button onClick={() => router.push('/')} className="bg-[#1d4e89] hover:bg-[#15396b]">
              Return to Shop
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h2>
            <p className="text-gray-600 mb-4">
              Thank you for your purchase. Your order has been confirmed.
            </p>
          </div>

          {order && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">Order ID</span>
                <span className="font-mono font-bold text-gray-900">{order.orderId}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">Payment Reference</span>
                <span className="font-mono text-sm text-gray-900">{order.paymentReference}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">Total Amount</span>
                <span className="text-xl font-bold text-green-600">₦{order.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Order Date</span>
                <span className="text-sm text-gray-900">{formatFirestoreTimestamp(order.submittedAt, 'en-NG')}</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={downloadReceipt}
              className="w-full bg-[#1d4e89] hover:bg-[#15396b] text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Receipt
            </Button>
            
            <Button
              onClick={() => router.push(`/track?orderId=${order?.orderId}`)}
              variant="outline"
              className="w-full py-3 rounded-xl font-semibold"
            >
              Track Your Order
            </Button>

            <Button
              onClick={() => router.push('/')}
              variant="ghost"
              className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center">
            <Image src="/logo.png" alt="NusyWears Logo" width={120} height={32} className="h-8 w-auto" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

              <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                <Image
                  src={order.productImage}
                  alt={order.productName}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{order.productName}</h3>
                  <p className="text-sm text-gray-600">Customized Optical Lens</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span>Frame</span>
                  <span className="font-medium">₦{order.framePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Customized Lens</span>
                  <span className="font-medium">₦{lensPrice.toLocaleString()}</span>
                </div>
                {order.lensCoating && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Coating:</span>
                    <span>{order.lensCoating}</span>
                  </div>
                )}
                <div className="pt-3 border-t flex justify-between">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-[#1d4e89]">
                    ₦{order.totalAmount?.toLocaleString()}
                  </span>
                </div>
              </div>

              {order.prescriptionData?.additionalNotes && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">Note from NusyWears</h4>
                  <p className="text-sm text-blue-800">{order.prescriptionData?.additionalNotes}</p>
                </div>
              )}
            </div>

            {order.prescriptionData && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Your Prescription</h3>
                <div className="space-y-3 text-sm">
                  {order.prescriptionData.rightEye?.sphere && (
                    <div>
                      <div className="font-medium text-gray-700">Right Eye (OD)</div>
                      <div className="text-gray-600">
                        SPH: {order.prescriptionData.rightEye.sphere}
                        {order.prescriptionData.rightEye.cylinder &&
                          `, CYL: ${order.prescriptionData.rightEye.cylinder}`}
                        {order.prescriptionData.rightEye.axis &&
                          `, AXIS: ${order.prescriptionData.rightEye.axis}`}
                      </div>
                    </div>
                  )}
                  {order.prescriptionData.leftEye?.sphere && (
                    <div>
                      <div className="font-medium text-gray-700">Left Eye (OS)</div>
                      <div className="text-gray-600">
                        SPH: {order.prescriptionData.leftEye.sphere}
                        {order.prescriptionData.leftEye.cylinder &&
                          `, CYL: ${order.prescriptionData.leftEye.cylinder}`}
                        {order.prescriptionData.leftEye.axis &&
                          `, AXIS: ${order.prescriptionData.leftEye.axis}`}
                      </div>
                    </div>
                  )}
                  {order.prescriptionData.pd && (
                    <div>
                      <div className="font-medium text-gray-700">Pupillary Distance</div>
                      <div className="text-gray-600">{order.prescriptionData.pd}mm</div>
                    </div>
                  )}
                </div>

                {order.prescriptionData.prescriptionFile && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-medium text-gray-700 mb-2">Prescription Image</div>
                    <Image
                      src={order.prescriptionData.prescriptionFile}
                      alt="Prescription"
                      width={640}
                      height={400}
                      className="w-full rounded-lg border"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Customer Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-500">Name</div>
                  <div className="font-medium text-gray-900">{order.customer.name}</div>
                </div>
                <div>
                  <div className="text-gray-500">Phone</div>
                  <div className="font-medium text-gray-900">{order.customer.phone}</div>
                </div>
                {order.customer.email && (
                  <div>
                    <div className="text-gray-500">Email</div>
                    <div className="font-medium text-gray-900">{order.customer.email}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Payment</h3>

              <button
                onClick={handleProceedToPayment}
                disabled={showPaystackModal || !order.totalAmount}
                className="w-full bg-[#1d4e89] text-white py-4 px-6 rounded-xl hover:bg-[#15396b] transition-colors flex items-center justify-center gap-2 font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showPaystackModal ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Opening Paystack...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Pay ₦{order.totalAmount?.toLocaleString()}
                  </>
                )}
              </button>

              <p className="text-xs text-center text-gray-500 mt-4">Secure payment • Your data is protected</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <div className="flex justify-between text-gray-600 mb-2">
                <span>Order ID:</span>
                <span className="font-mono font-medium text-gray-900">{order.orderId}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Quote Date:</span>
                <span className="font-medium text-gray-900">
                  {formatFirestoreTimestamp(order.submittedAt, 'en-NG')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PaystackModal
        isOpen={showPaystackModal}
        onClose={() => setShowPaystackModal(false)}
        amount={order.totalAmount}
        email={order.customer.email ?? ''}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </div>
  );
}
