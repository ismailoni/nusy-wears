'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Check, Lock, Download, Home } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { lensOptions, lensCoatings } from '@/data/products';
import { PaystackModal } from '@/components/PaystackModal';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import Navigation from '@/components/NavBar';
import { db } from '@/firebase/config';
import { collection, addDoc, doc, getDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import Image from 'next/image';

export default function CheckoutPage() {
  type ReceiptItem = {
    id?: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    lensOption?: string;
    customizedLens?: { coating?: string; power?: string } | null;
  };

  type ReceiptCustomer = {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    zipCode?: string;
  };

  type OrderDetailsType = {
    orderId: string;
    orderDate: string;
    paymentReference?: string;
    customer: ReceiptCustomer;
    items: ReceiptItem[];
    totalAmount: number;
  };
  const { items, removeFromCart, updateQuantity, clearCart, totalPrice } = useCart();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
  });
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [showPaystackModal, setShowPaystackModal] = useState(false);
  const [orderDetails, setOrderDetails] = useState<OrderDetailsType | null>(null);
  const [processingOrder, setProcessingOrder] = useState(false);
  // prescription state removed (not used in this view)

  const grandTotal = totalPrice;

  // Prescription functions removed (not used in this checkout view)

  const handleProceedToPayment = () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.address || !formData.city || !formData.zipCode) {
      alert('Please fill in all delivery information');
      return;
    }

    setShowPaystackModal(true);
  };

  const handlePaymentSuccess = async (reference: string) => {
    setShowPaystackModal(false);
    setProcessingOrder(true);

    try {
      const orderId = `ORD-${Date.now()}`;
      const orderDate = new Date();

      // Create order document with clean data (no undefined values)
      const orderData = {
        orderId,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          lensOption: item.lensOption || 'standard',
          ...(item.customizedLens && { customizedLens: item.customizedLens }),
          ...(item.prescription && { prescription: item.prescription }),
        })),
        customer: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          zipCode: formData.zipCode,
        },
        totalAmount: grandTotal,
        deliveryStatus: 'pending',
        paymentStatus: 'paid',
        paymentReference: reference,
        paymentMethod: 'paystack',
        createdAt: Timestamp.fromDate(orderDate),
        updatedAt: Timestamp.fromDate(orderDate),
      };

      // Add order to Firestore
      await addDoc(collection(db, 'orders'), orderData);

      // Create transaction record
      await addDoc(collection(db, 'transactions'), {
        orderId,
        type: 'sale',
        amount: grandTotal,
        paymentReference: reference,
        paymentMethod: 'paystack',
        customerEmail: formData.email,
        customerName: formData.name,
        status: 'completed',
        createdAt: Timestamp.fromDate(orderDate),
      });

      // Update product stock
      for (const item of items) {
        const productRef = doc(db, 'products', item.id);
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
          await updateDoc(productRef, {
            stock: increment(-item.quantity),
          });
        }
      }

      // Store order details for receipt
      setOrderDetails({
        ...orderData,
        orderId,
        orderDate: orderDate.toISOString(),
      });

      setOrderPlaced(true);
      clearCart();
      
      toast.success('Payment Successful!', {
        description: 'Your order has been placed successfully.',
      });
    } catch (error) {
      console.error('Error processing order:', error);
      toast.error('Order Processing Failed', {
        description: 'Payment was successful but there was an error processing your order. Please contact support.',
      });
    } finally {
      setProcessingOrder(false);
    }
  };

  const handlePaymentError = (message: string) => {
    console.error('Payment error:', message);
    toast.error('Payment Failed', {
      description: message || 'Please try again or contact support.',
    });
    setShowPaystackModal(false);
  };

  const downloadReceipt = () => {
    if (!orderDetails) return;

    // Render an HTML invoice, convert to canvas via html2canvas and save as PDF using jsPDF.
    // Use dynamic imports for html2canvas and jsPDF (installed via npm)

    const createInvoiceElement = () => {
      const wrapper = document.createElement('div');
      // use tailwind/shadcn classes so the invoice inherits project styles
      wrapper.className = 'max-w-2xl bg-white p-6 text-sm text-gray-900';
      wrapper.innerHTML = `
        <div class="flex items-center gap-4 mb-4">
          <img src="/logo.png" onerror="this.style.display='none'" alt="Nusy Wears" class="h-14 object-contain" />
          <div>
            <h2 class="text-2xl font-bold text-[#1d4e89] m-0">NUSY WEARS</h2>
            <div class="text-xs text-gray-500">Order Receipt</div>
          </div>
        </div>
        <div class="border-t border-b py-3 mb-4">
          <div class="flex justify-between gap-4">
            <div>
              <div class="text-xs text-gray-500">Order ID</div>
              <div class="font-semibold">${orderDetails.orderId}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500">Order Date</div>
              <div>${new Date(orderDetails.orderDate).toLocaleString()}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500">Payment Ref</div>
              <div class="font-mono text-sm">${orderDetails.paymentReference}</div>
            </div>
          </div>
        </div>

        <h3 class="text-base font-semibold mb-2">Customer</h3>
        <div class="text-sm text-gray-700 mb-4">
          <div>${orderDetails.customer.name}</div>
          <div>${orderDetails.customer.email || ''} ${orderDetails.customer.phone ? '• ' + orderDetails.customer.phone : ''}</div>
          <div>${orderDetails.customer.address || ''} ${orderDetails.customer.zipCode ? '• ' + orderDetails.customer.zipCode : ''}</div>
        </div>

        <h3 class="text-base font-semibold mb-2">Items</h3>
        <table class="w-full border-collapse mb-4 text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-500">
              <th class="pb-2">Item</th>
              <th class="pb-2 text-right">Price</th>
              <th class="pb-2 text-right">Qty</th>
              <th class="pb-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${orderDetails.items.map((item) => `
              <tr class="border-t">
                <td class="py-3 align-top">
                  <div class="font-medium">${item.name}</div>
                  <div class="text-xs text-gray-500">${item.lensOption ? `Lens: ${item.lensOption}` : ''}${item.customizedLens ? ` • Coating: ${item.customizedLens.coating}` : ''}</div>
                </td>
                <td class="py-3 text-right align-top">₦${item.price.toLocaleString()}</td>
                <td class="py-3 text-right align-top">${item.quantity}</td>
                <td class="py-3 text-right align-top">₦${(item.price * item.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="flex justify-end">
          <div class="w-80">
            <div class="flex justify-between py-2"><div class="text-sm text-gray-500">Total</div><div class="font-semibold">₦${orderDetails.totalAmount.toLocaleString()}</div></div>
          </div>
        </div>

        <div class="border-t pt-4 text-xs text-gray-500">Thank you for shopping with Nusy Wears! For support: +234 808 202 0919 • info@nusywears.com</div>
      `;
      return wrapper;
    };

    (async () => {
      try {
        // load modules via dynamic import (installed packages)

        type Html2CanvasType = (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
        type JsPDFConstructor = new (...args: unknown[]) => {
          internal: { pageSize: { getWidth(): number; getHeight(): number } };
          addImage: (...args: unknown[]) => void;
          addPage: () => void;
          save: (name: string) => void;
        };

        const html2canvasModule = await import('html2canvas');
        const html2canvas = ((html2canvasModule as unknown) as { default?: Html2CanvasType }).default ?? ((html2canvasModule as unknown) as Html2CanvasType);
        const jspdfModule = await import('jspdf');
        const jsPDFCtor = ((jspdfModule as unknown) as { jsPDF?: JsPDFConstructor }).jsPDF ?? ((jspdfModule as unknown) as JsPDFConstructor);

        const invoiceEl = createInvoiceElement();
        invoiceEl.style.position = 'fixed';
        invoiceEl.style.left = '-9999px';
        document.body.appendChild(invoiceEl);

        const canvas = await html2canvas(invoiceEl, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDFCtor('p', 'pt', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Calculate image dimensions to fit pdf width
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > -pdfHeight) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        pdf.save(`Nusy-Wears-Receipt-${orderDetails.orderId}.pdf`);
        document.body.removeChild(invoiceEl);

        toast.success('Receipt Downloaded', {
          description: 'Your receipt has been downloaded successfully.',
        });
      } catch (err) {
        console.error('PDF generation failed', err);
        toast.error('Failed to generate PDF receipt. Opening plain text as fallback.');
        // fallback to text download
        const receiptContent = `Order ID: ${orderDetails.orderId}\nTotal: ₦${orderDetails.totalAmount}`;
        const blob = new Blob([receiptContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Nusy-Wears-Receipt-${orderDetails.orderId}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    })();
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Toaster richColors position="top-center" />
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

          {orderDetails && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">Order ID</span>
                <span className="font-mono font-bold text-gray-900">{orderDetails.orderId}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">Payment Reference</span>
                <span className="font-mono text-sm text-gray-900">{orderDetails.paymentReference}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">Total Amount</span>
                <span className="text-xl font-bold text-green-600">₦{orderDetails.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Order Date</span>
                <span className="text-sm text-gray-900">{new Date(orderDetails.orderDate).toLocaleDateString()}</span>
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
              onClick={() => router.push(`/track?orderId=${orderDetails?.orderId}`)}
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

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-center text-gray-600">
              📧 A confirmation email has been sent to <strong>{formData.email}</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (processingOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Toaster richColors position="top-center" />
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 border-4 border-[#1d4e89] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Processing Your Order...</h2>
          <p className="text-gray-600">Please wait while we confirm your payment and prepare your order.</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster richColors position="top-center" />
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Your cart is empty</p>
            <Link href="/shop" className="text-blue-600 hover:text-blue-700">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster richColors position="top-center" />
      <Navigation />

      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <Link href="/shop" className="flex items-center gap-2 text-gray-700 hover:text-gray-900 text-sm sm:text-base">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            Back to shop
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <h1 className="text-gray-900 mb-6 sm:mb-8 text-2xl sm:text-3xl">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="bg-white rounded-lg p-4 sm:p-6">
              <h2 className="text-gray-900 mb-4 sm:mb-6 text-lg sm:text-xl">Your Items</h2>
              <div className="space-y-4">
                {items.map((item, index) => {
                  const lensOption = lensOptions.find((lens) => lens.id === item.lensOption);
                  const itemKey = `${item.id}-${item.lensOption ?? 'standard'}-${index}`;
                  return (
                    <div key={itemKey} className="pb-4 border-b last:border-b-0">
                      <div className="flex gap-3 sm:gap-4">
                        <Image
                          src={item.image}
                          alt={item.name}
                          className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-gray-900 mb-1 text-sm sm:text-base">{item.name}</h3>
                          {lensOption && (
                            <p className="text-xs sm:text-sm text-gray-500 mb-2">
                              Lens: {lensOption.label}
                            </p>
                          )}
                          {item.lensOption === 'customized' && item.customizedLens && (
                            <div className="text-xs text-gray-500 mb-2">
                              <p>Power: {item.customizedLens.power}</p>
                              <p>
                                Coating:{' '}
                                {lensCoatings.find((coating) => coating.id === item.customizedLens?.coating)?.label}
                              </p>
                            </div>
                          )}
                          <p className="text-gray-600 mb-2 text-sm sm:text-base">₦{item.price.toLocaleString()}</p>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="px-2 sm:px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                            >
                              −
                            </button>
                            <span className="text-gray-900 text-sm sm:text-base">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="px-2 sm:px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-between shrink-0">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                          <span className="text-gray-900 text-sm sm:text-base font-semibold">
                            ₦{(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 sm:p-6">
              <h2 className="text-gray-900 mb-4 sm:mb-6 text-lg sm:text-xl">Delivery Information</h2>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2 text-sm sm:text-base">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2 text-sm sm:text-base">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2 text-sm sm:text-base">Phone</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 mb-2 text-sm sm:text-base">Address</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2 text-sm sm:text-base">City</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(event) => setFormData((prev) => ({ ...prev, city: event.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2 text-sm sm:text-base">ZIP Code</label>
                    <input
                      type="text"
                      required
                      value={formData.zipCode}
                      onChange={(event) => setFormData((prev) => ({ ...prev, zipCode: event.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg p-4 sm:p-6 lg:sticky lg:top-4">
              <h2 className="text-gray-900 mb-4 sm:mb-6 text-lg sm:text-xl">Order Summary</h2>
              <div className="space-y-2 sm:space-y-3 mb-4 pb-4 border-b">
                <div className="flex justify-between text-gray-700 text-sm sm:text-base">
                  <span>Items ({items.reduce((sum, item) => sum + item.quantity, 0)})</span>
                  <span>₦{totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-700 text-sm sm:text-base">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
              </div>
              <div className="flex justify-between mb-4 sm:mb-6">
                <span className="text-gray-900 font-bold text-base sm:text-lg">Total</span>
                <span className="text-gray-900 font-bold text-lg sm:text-xl">₦{grandTotal.toLocaleString()}</span>
              </div>
              <Button
                onClick={handleProceedToPayment}
                className="w-full bg-[#1d4e89] text-white py-3 rounded-lg hover:bg-[#15396b] transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                Proceed to Payment
              </Button>
              <p className="text-xs text-gray-500 text-center mt-3">
                Secured by Paystack
              </p>
            </div>
          </div>
        </div>
      </main>

     

      <PaystackModal
        isOpen={showPaystackModal}
        onClose={() => setShowPaystackModal(false)}
        amount={grandTotal}
        email={formData.email}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </div>
  );
}
