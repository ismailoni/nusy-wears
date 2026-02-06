export interface Transaction {
    id: string;
    amount: number;
    orderId: string;
    status: string;
    paymentMethod: string;
    paymentReference: string;
    createdAt: string;
    type: string
    customerName: string;
    customerEmail: string;
}