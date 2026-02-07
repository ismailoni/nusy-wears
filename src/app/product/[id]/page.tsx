'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Check, ChevronDown, Info, Upload, FileText, Eye, MessageCircle, Loader } from 'lucide-react';
import { doc, getDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { toast } from 'sonner';
import { Product, lensOptions, lensCoatings } from '@/types/products';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useCart } from '@/context/CartContext';
import Navigation from '@/components/NavBar';
import Image from 'next/image';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const id = params.id as string;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [selectedLens, setSelectedLens] = useState<string>('standard');
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);
  const [showSpecs, setShowSpecs] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Customized lens data
  const [lensCoating, setLensCoating] = useState<string>('plain');
  
  // Customer contact info
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
  // Prescription data
  const [prescriptionData, setPrescriptionData] = useState({
    rightEye: { sphere: '', cylinder: '', axis: '' },
    leftEye: { sphere: '', cylinder: '', axis: '' },
    pd: '',
    additionalNotes: '',
    prescriptionFile: ''
  });

  const [hasPrescription, setHasPrescription] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
        } else {
          setProduct(null);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

   if (loading) {
     return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-b from-white to-gray-50">
         <Loader className="w-12 h-12 animate-spin text-[#1d4e89] mb-4" />
         <p className="text-gray-600 font-medium">Loading Product...</p>
       </div>
     );
   }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Product not found</p>
          <Link href="/shop" className="text-blue-600 hover:text-blue-700">
            Return to shop
          </Link>
        </div>
      </div>
    );
  }

  const selectedLensOption = lensOptions.find((l: { id: string; label: string; price: number }) => l.id === selectedLens);
  
  // Calculate lens price
  let lensPrice = selectedLensOption?.price || 0;
  
  // If customized is selected, calculate based on coating
  if (selectedLens === 'customized') {
    const basePowerPrice = 25000; // Base price for optical lens
    const selectedCoating = lensCoatings.find((c: { id: string; label: string; price: number }) => c.id === lensCoating);
    lensPrice = basePowerPrice + (selectedCoating?.price || 0);
  }
  
  const totalPrice = product.price + lensPrice;
  const productImages = product.images?.length ? product.images : [product.image];

  const handleOpenPrescriptionDialog = () => {
    setShowPrescriptionDialog(true);
  };

  const handleSavePrescription = () => {
    setHasPrescription(true);
    setShowPrescriptionDialog(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPrescriptionData(prev => ({
          ...prev,
          prescriptionFile: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: totalPrice,
      image: product.image,
      lensOption: selectedLens
    });
    
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleLensChange = (value: string) => {
    setSelectedLens(value);
    
    // Reset customized options when changing away from customized
    if (value !== 'customized') {
      setLensCoating('plain');
      setHasPrescription(false);
      setPrescriptionData({
        rightEye: { sphere: '', cylinder: '', axis: '' },
        leftEye: { sphere: '', cylinder: '', axis: '' },
        pd: '',
        additionalNotes: '',
        prescriptionFile: ''
      });
    }
  };

  const handleWhatsAppContinue = () => {
    setShowContactDialog(true);
  };

  const handleSubmitOrder = async () => {
    if (!customerInfo.name || !customerInfo.phone) {
      toast.error('Missing Information', {
        description: 'Please enter your name and phone number',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedCoatingName = lensCoatings.find((c: { id: string; label: string; price: number }) => c.id === lensCoating)?.label || lensCoating;
      
      // Create customized order in Firestore
      const orderData = {
        orderId: `ORD-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        framePrice: product.price,
        estimatedLensPrice: lensPrice,
        lensType: 'Customized Optical Lens',
        lensCoating: selectedCoatingName,
        lensCoatingId: lensCoating,
        prescriptionData: hasPrescription ? {
          rightEye: prescriptionData.rightEye,
          leftEye: prescriptionData.leftEye,
          pd: prescriptionData.pd,
          additionalNotes: prescriptionData.additionalNotes,
          prescriptionFile: prescriptionData.prescriptionFile,
        } : null,
        customerInfo: {
          name: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone,
        },
        paymentStatus: 'pending-quote',
        deliveryStatus: 'processing',
        submittedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'customizedOrders'), orderData);
      
      // Build WhatsApp message
      let message = `Hello! I'd like to order customized lenses:\n\n`;
      message += `🕶️ *${product.name}*\n`;
      message += `📋 Order ID: ${docRef.id}\n`;
      message += `👤 Name: ${customerInfo.name}\n`;
      message += `📞 Phone: ${customerInfo.phone}\n`;
      if (customerInfo.email) message += `📧 Email: ${customerInfo.email}\n`;
      message += `\n💰 Frame Price: ₦${product.price.toLocaleString()}\n`;
      message += `👓 Lens: Customized Optical Lens (Est. ₦${lensPrice.toLocaleString()})\n`;
      message += `🎨 Coating: ${selectedCoatingName}\n\n`;
      
      if (hasPrescription) {
        message += `📋 *Prescription Details:*\n`;
        if (prescriptionData.rightEye.sphere) {
          message += `Right Eye: SPH ${prescriptionData.rightEye.sphere}`;
          if (prescriptionData.rightEye.cylinder) message += `, CYL ${prescriptionData.rightEye.cylinder}`;
          if (prescriptionData.rightEye.axis) message += `, AXIS ${prescriptionData.rightEye.axis}`;
          message += `\n`;
        }
        if (prescriptionData.leftEye.sphere) {
          message += `Left Eye: SPH ${prescriptionData.leftEye.sphere}`;
          if (prescriptionData.leftEye.cylinder) message += `, CYL ${prescriptionData.leftEye.cylinder}`;
          if (prescriptionData.leftEye.axis) message += `, AXIS ${prescriptionData.leftEye.axis}`;
          message += `\n`;
        }
        if (prescriptionData.pd) {
          message += `PD: ${prescriptionData.pd}mm\n`;
        }
        if (prescriptionData.additionalNotes) {
          message += `Notes: ${prescriptionData.additionalNotes}\n`;
        }
        if (prescriptionData.prescriptionFile) {
          message += `📎 Prescription image uploaded\n`;
        }
        message += `\n`;
      }
      
      message += `Please review my order and send me the final quote. Thank you!`;
      
      // Encode message for URL
      const encodedMessage = encodeURIComponent(message);
      
      // NusyWears WhatsApp number
      const whatsappNumber = '2348082020919';
      
      toast.success('Order Created Successfully!', {
        description: 'Your customized order has been submitted. Redirecting to WhatsApp...',
      });
      
      // Close dialog
      setShowContactDialog(false);
      
      // Small delay before opening WhatsApp
      setTimeout(() => {
        window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
      }, 1000);
      
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error('Order Submission Failed', {
        description: 'Failed to create order. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/shop" className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" />
          Back to shop
        </Link>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Media */}
          <div className="space-y-4">
            {/* Product Images */}
            <div className="bg-white rounded-2xl p-6 lg:p-8">
              <Carousel className="w-full" opts={{ align: 'start' }}>
                <CarouselContent>
                  {productImages.map((imageUrl, index) => (
                    <CarouselItem key={`${imageUrl}-${index}`}>
                      <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                        <Image
                          src={imageUrl}
                          alt={`${product.name} - ${index + 1}`}
                          className="w-full h-full object-cover"
                          width={600}
                          height={600}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {productImages.length > 1 && (
                  <>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </>
                )}
              </Carousel>
            </div>
            
            {/* Video section */}
            {product.video && (
              <div className="bg-white rounded-2xl p-6 lg:p-8">
                <div className="bg-gray-900 rounded-xl aspect-video overflow-hidden">
                  <video
                    src={product.video}
                    controls
                    className="w-full h-full object-cover"
                    poster={product.image}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            )}

            {/* Collapsible Specifications - Desktop */}
            <div className="hidden lg:block bg-white rounded-2xl p-6">
              <button 
                onClick={() => setShowSpecs(!showSpecs)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-gray-900 font-semibold">Product Specifications</h3>
                <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showSpecs ? 'rotate-180' : ''}`} />
              </button>
              {showSpecs && (
                <div className="mt-4 space-y-3 pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Material</span>
                    <span className="text-gray-900 font-medium">{product.material}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Color</span>
                    <span className="text-gray-900 font-medium">{product.color}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category</span>
                    <span className="text-gray-900 font-medium">{product.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Availability</span>
                    <span className="text-green-600 font-medium">{product.stock} in stock</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Product Info */}
          <div className="space-y-6">
            {/* Product Header */}
            <div className="bg-white rounded-2xl p-6 lg:p-8">
              <span className="inline-block px-3 py-1 bg-blue-100 text-[#1d4e89] rounded-full text-sm font-medium mb-3">
                {product.category}
              </span>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">{product.name}</h1>
              <p className="text-gray-600 mb-4">{product.description}</p>
              
              {/* Default Lens Info */}
              {product.defaultLensType && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-green-800">
                    <span className="font-semibold">✓ Includes: </span>
                    Basic {product.defaultLensType === 'blue-light' ? 'Blue Light Protection' : 'Photochromic'} coating at no extra cost
                  </p>
                </div>
              )}
              
              {/* Price Display */}
              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-100">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-[#1d4e89]">₦{totalPrice.toLocaleString()}</span>
                  {lensPrice > 0 && (
                    <span className="text-sm text-gray-600">(Frame + Lens)</span>
                  )}
                </div>
                {lensPrice > 0 && (
                  <div className="text-sm text-gray-600">
                    Frame: ₦{product.price.toLocaleString()} + Lens: ₦{lensPrice.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Mobile Specs */}
              <div className="lg:hidden mt-4 pt-4 border-t grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Material</span>
                  <p className="text-gray-900 font-medium">{product.material}</p>
                </div>
                <div>
                  <span className="text-gray-500">Color</span>
                  <p className="text-gray-900 font-medium">{product.color}</p>
                </div>
                <div>
                  <span className="text-gray-500">Category</span>
                  <p className="text-gray-900 font-medium">{product.category}</p>
                </div>
                <div>
                  <span className="text-gray-500">Stock</span>
                  <p className="text-green-600 font-medium">{product.stock} available</p>
                </div>
              </div>
            </div>

            {/* Lens Selection */}
            <div className="bg-white rounded-2xl p-6 lg:p-8">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Lens Options</h3>
                <Info className="w-4 h-4 text-gray-400" />
              </div>

              {/* Lens Type Dropdown */}
              <div className="mb-4">
                <Label htmlFor="lens-type" className="text-sm text-gray-700 mb-2 block">
                  Select Lens Type
                </Label>
                <Select value={selectedLens} onValueChange={handleLensChange}>
                  <SelectTrigger id="lens-type" className="w-full h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {lensOptions.map((lens: { id: string; label: string; price: number }) => (
                      <SelectItem key={lens.id} value={lens.id}>
                        <div className="flex items-center justify-between w-full pr-4">
                          <span>{lens.label}</span>
                          <span className="text-[#1d4e89] font-semibold ml-4">
                            {lens.id === 'customized' ? 'From ₦25,000' : lens.price === 0 ? 'Included' : `+₦${lens.price.toLocaleString()}`}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Lens Description */}
                {selectedLensOption && selectedLensOption.price > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Selected lens: {selectedLensOption.label}</p>
                  </div>
                )}
              </div>

              {/* Customized Lens Options */}
              {selectedLens === 'customized' && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-[#1d4e89] font-medium mb-3">
                      💡 Customized lenses start at ₦25,000 (base price) + coating
                    </p>
                    
                    {/* Add Prescription Button */}
                    <button
                      onClick={handleOpenPrescriptionDialog}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-[#1d4e89] text-[#1d4e89] rounded-lg hover:bg-blue-50 transition-colors font-medium"
                    >
                      {hasPrescription ? (
                        <>
                          <Check className="w-5 h-5" />
                          Prescription Added - Click to Edit
                        </>
                      ) : (
                        <>
                          <FileText className="w-5 h-5" />
                          Add Your Prescription Details
                        </>
                      )}
                    </button>
                  </div>

                  {/* Show prescription summary if added */}
                  {hasPrescription && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-900 mb-1">Prescription Details Saved</p>
                          <div className="text-xs text-green-700 space-y-1">
                            {prescriptionData.rightEye.sphere && (
                              <p>Right Eye: SPH {prescriptionData.rightEye.sphere}</p>
                            )}
                            {prescriptionData.leftEye.sphere && (
                              <p>Left Eye: SPH {prescriptionData.leftEye.sphere}</p>
                            )}
                            {prescriptionData.pd && (
                              <p>PD: {prescriptionData.pd}mm</p>
                            )}
                          </div>
                          <button
                            onClick={handleOpenPrescriptionDialog}
                            className="text-xs text-[#1d4e89] hover:underline mt-2 flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            View/Edit Details
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lens Coating */}
                  <div>
                    <Label htmlFor="lens-coating" className="text-sm text-gray-700 mb-2 block">
                      Select Lens Coating / Treatment
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {lensCoatings.map((coating: { id: string; label: string; price: number }) => (
                        <label
                          key={coating.id}
                          className={`flex flex-col p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            lensCoating === coating.id
                              ? 'border-[#1d4e89] bg-blue-50 shadow-sm'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="coating"
                            value={coating.id}
                            checked={lensCoating === coating.id}
                            onChange={(e) => setLensCoating(e.target.value)}
                            className="sr-only"
                          />
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">{coating.label}</span>
                            {lensCoating === coating.id && (
                              <Check className="w-4 h-4 text-[#1d4e89]" />
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="bg-white rounded-2xl p-6 lg:p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What&apos;s Included</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700">Premium quality materials</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700">All-day comfort</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700">UV protection</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700">1-year warranty</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 sticky bottom-4 shadow-lg lg:shadow-none">
              {selectedLens === 'customized' ? (
                <button
                  onClick={handleWhatsAppContinue}
                  className="w-full bg-[#25d366] text-white py-3.5 px-4 sm:px-6 rounded-xl hover:bg-[#21c45d] transition-colors flex items-center justify-center gap-2 font-semibold shadow-md hover:shadow-lg text-sm sm:text-base"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="hidden sm:inline">Continue Order on WhatsApp</span>
                  <span className="sm:hidden">WhatsApp Order</span>
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 bg-[#1d4e89] text-white py-3.5 px-4 sm:px-6 rounded-xl hover:bg-[#15396b] transition-colors flex items-center justify-center gap-2 font-semibold shadow-md hover:shadow-lg text-sm sm:text-base"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {added ? 'Added!' : 'Add to Cart'}
                  </button>
                  <button
                    onClick={() => {
                      handleAddToCart();
                      router.push('/checkout');
                    }}
                    className="flex-1 bg-[#5a5a5a] text-white py-3.5 px-4 sm:px-6 rounded-xl hover:bg-[#4a4a4a] transition-colors font-semibold shadow-md hover:shadow-lg text-sm sm:text-base"
                  >
                    Buy Now
                  </button>
                </div>
              )}
              <p className="text-xs text-center text-gray-500 mt-3">
                {selectedLens === 'customized' 
                  ? 'Get a personalized quote via WhatsApp'
                  : 'Secure checkout • Authentic products guaranteed'}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Prescription Dialog */}
      <Dialog open={showPrescriptionDialog} onOpenChange={setShowPrescriptionDialog}>
        <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Your Prescription Details</DialogTitle>
            <DialogDescription>
              Enter your prescription information or upload a prescription image from your optometrist
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Right Eye */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Right Eye (OD)</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="rx-od-sphere">Sphere (SPH)</Label>
                  <Input
                    id="rx-od-sphere"
                    placeholder="+1.50"
                    value={prescriptionData.rightEye.sphere}
                    onChange={(e) => setPrescriptionData(prev => ({
                      ...prev,
                      rightEye: { ...prev.rightEye, sphere: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="rx-od-cylinder">Cylinder (CYL)</Label>
                  <Input
                    id="rx-od-cylinder"
                    placeholder="-0.50"
                    value={prescriptionData.rightEye.cylinder}
                    onChange={(e) => setPrescriptionData(prev => ({
                      ...prev,
                      rightEye: { ...prev.rightEye, cylinder: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="rx-od-axis">Axis</Label>
                  <Input
                    id="rx-od-axis"
                    placeholder="90"
                    value={prescriptionData.rightEye.axis}
                    onChange={(e) => setPrescriptionData(prev => ({
                      ...prev,
                      rightEye: { ...prev.rightEye, axis: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* Left Eye */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Left Eye (OS)</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="rx-os-sphere">Sphere (SPH)</Label>
                  <Input
                    id="rx-os-sphere"
                    placeholder="+1.50"
                    value={prescriptionData.leftEye.sphere}
                    onChange={(e) => setPrescriptionData(prev => ({
                      ...prev,
                      leftEye: { ...prev.leftEye, sphere: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="rx-os-cylinder">Cylinder (CYL)</Label>
                  <Input
                    id="rx-os-cylinder"
                    placeholder="-0.50"
                    value={prescriptionData.leftEye.cylinder}
                    onChange={(e) => setPrescriptionData(prev => ({
                      ...prev,
                      leftEye: { ...prev.leftEye, cylinder: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="rx-os-axis">Axis</Label>
                  <Input
                    id="rx-os-axis"
                    placeholder="90"
                    value={prescriptionData.leftEye.axis}
                    onChange={(e) => setPrescriptionData(prev => ({
                      ...prev,
                      leftEye: { ...prev.leftEye, axis: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* PD */}
            <div>
              <Label htmlFor="rx-pd">Pupillary Distance (PD)</Label>
              <Input
                id="rx-pd"
                placeholder="63"
                value={prescriptionData.pd}
                onChange={(e) => setPrescriptionData(prev => ({ ...prev, pd: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">Usually between 54-74mm</p>
            </div>

            {/* Upload Prescription */}
            <div>
              <Label>Or Upload Prescription Image</Label>
              <div className="mt-2">
                {prescriptionData.prescriptionFile && (
                  <div className="mb-3 relative">
                    <Image 
                      src={prescriptionData.prescriptionFile} 
                      alt="Prescription" 
                      className="w-full h-48 object-contain border rounded-lg"
                      width={400}
                      height={400}
                    />
                  </div>
                )}
                <label className="cursor-pointer">
                  <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                    <Upload className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-600">Upload Prescription Image</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <Label htmlFor="rx-notes">Additional Notes (Optional)</Label>
              <Textarea
                id="rx-notes"
                placeholder="Any special requirements or notes..."
                value={prescriptionData.additionalNotes}
                onChange={(e) => setPrescriptionData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPrescriptionDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSavePrescription}
                className="flex-1 bg-[#1d4e89] hover:bg-[#15396b]"
              >
                Save Prescription
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enter Your Contact Information</DialogTitle>
            <DialogDescription>
              Provide your contact details to proceed with the order
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                placeholder="John Doe"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="contact-email">Email (Optional)</Label>
              <Input
                id="contact-email"
                placeholder="john.doe@example.com"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                placeholder="08012345678"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowContactDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmitOrder}
                className="flex-1 bg-[#1d4e89] hover:bg-[#15396b]"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Continue to WhatsApp'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
