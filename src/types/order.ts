export interface Order {
  id: string;
  orderId: string;
  customer: {
    name: string;
    email: string;
    address: string;
    zipCode: string;
    phone: string;
  };
  deliveryStatus: string;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  paymentReference: string;
  shippingFee: number;
  createdAt: Date;
  items: Item[];
}

export interface customizedOrder {
  id: string;
  orderId: string;
  adminNotes?: string | null;
  checkoutLink?: string;
  customerInfo: {
    name: string;
    email?: string;
    phone: string;
    address: string;
    zipCode?: string;
  };
  estimatedLensPrice: number;
  finalLensPrice?: number;
  framePrice: number;
  lensCoating: string;
  lensCoatingId: string;
  lensType: string;
  prescriptionData?: {
    additionalNotes?: string;
    leftEye?: {
      axis?: string;
      cylinder?: string;
      sphere?: string;
    };
    rightEye?: {
      axis?: string;
      cylinder?: string;
      sphere?: string;
    };
    pd?: string;
    prescriptionFile?: string;
  } | null;
  productId: string;
  productImage: string;
  productName: string;

  quotedAt?: Date;
  paidAt?: Date;
  paymentStatus:
    | 'pending-quote'
    | 'quoted'
    | 'confirmed'
    | 'paid';
  submittedAt: Date;
  totalPrice: number;
  deliveryStatus?: 
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'completed'
    | 'cancelled';
  paymentMethod?: string;
  paymentReference?: string;
}

export interface Item {
  id: string;
  image: string;
  name: string;
  price: number;
  quantity: number;
  lensOption?: string;
}