'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DollarSign, ShoppingBag, LogOut, Loader, ArrowLeft, Search } from 'lucide-react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase/config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { formatFirestoreTimestamp } from '@/lib/utils';
import { Transaction } from '@/types/transaction';

export default function TransactionsPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthenticated(true);
        setUserEmail(user.email || '');
        setLoading(false);
      } else {
        setLoading(false);
        router.push('/admin/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
  
    const fetchTransactions = async () => {
      try {
        // Fetch only delivered orders (completed transactions)
        const transactionsQuery = query(
          collection(db, 'transactions'),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(transactionsQuery);
        const transactionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[];
        
        setTransactions(transactionsData);
        const revenue = transactionsData.reduce((sum, t) => sum + t.amount, 0);
        setTotalRevenue(revenue);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    };
    if (authenticated) {
      fetchTransactions();
    }
  }, [authenticated]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

   if (loading) {
     return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-b from-white to-gray-50">
         <Loader className="w-12 h-12 animate-spin text-[#1d4e89] mb-4" />
         <p className="text-gray-600 font-medium">Loading Product...</p>
       </div>
     );
   }

  if (!authenticated) {
    return null;
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTransactions = normalizedSearch
    ? transactions.filter((transaction) => {
        const haystack = [
          transaction.orderId,
          transaction.customerName,
          transaction.customerEmail,
          transaction.paymentReference,
          transaction.status,
          transaction.amount?.toString(),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      })
    : transactions;

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b p-6 flex items-center justify-between">
        <div>
          <Link href="/admin/dashboard" className="text-2xl font-bold text-blue-600">
            Nusy Wears Admin
          </Link>
          <p className="text-sm text-gray-600">Signed in as {userEmail}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation Header */}
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="h-8 border-l border-gray-200" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            <p className="text-sm text-gray-600 mt-1">Monitor all payment transactions and revenue</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-2xl font-semibold text-gray-900">₦{totalRevenue.toLocaleString()}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed Orders</p>
                  <p className="text-2xl font-semibold text-gray-900">{transactions.length}</p>
                </div>
                <ShoppingBag className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Order Value</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    ₦{transactions.length > 0 ? Math.round(totalRevenue / transactions.length).toLocaleString() : '0'}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order ID, customer, status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Transaction History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr className="hover:bg-gray-50">
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Reference</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>

                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions.map(transaction => (
                    <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <p className="text-sm font-semibold text-[#1d4e89]">{transaction.orderId}</p>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{transaction.customerName}</p>
                          <p className="text-xs text-gray-500">{transaction.customerEmail}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm text-gray-700">
                          {formatFirestoreTimestamp(transaction.createdAt, 'en-NG')}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm font-bold text-[#1d4e89] text-right">
                          ₦{transaction.amount.toLocaleString()}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm font-medium text-gray-700 text-right">
                          {transaction.paymentReference}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                          transaction.status === 'completed' 
                            ? 'bg-green-100 text-green-700' 
                            : transaction.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTransactions.length === 0 && (
                <div className="text-center py-16">
                  <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No transactions found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
