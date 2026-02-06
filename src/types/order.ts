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

export interface Item {
  id: string;
  image: string;
  name: string;
  price: number;
  quantity: number;
  lensOption?: string;
  customizedLens?: boolean;
  prescription?: {
    rightEye: { 
        sphere: string, 
        cylinder: string, 
        axis: string
    },
    leftEye: {
        sphere: string, 
        cylinder: string,
        axis: string
    }, 
    pd: string,
    additionalNotes: string,
    prescriptionFile: string
    priscriptionPrice: number
  }   

}