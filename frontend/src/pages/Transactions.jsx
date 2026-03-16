import { useEffect, useState } from 'react';
import { transactionService } from '../services/transactionService';
import TransactionForm from '../components/TransactionForm'; // Import your new form
import DateFilter from '../components/DateFilter';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ 
    month: new Date().getMonth() + 1, 
    year: new Date().getFullYear() 
  });

  // Function to fetch data - we'll call this on mount AND after a new transaction is added
  const loadData = async () => {
    try {
      const data = await transactionService.getAll({...filters}); // User ID 1
      setTransactions(data);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleDeleteClick = async (transaction) => {
    if (window.confirm(`Are you sure you want to delete this transaction: "${transaction.note}"?`)) {
      try {
        await transactionService.delete(transaction.id);
        loadData(); // Refresh the list after deletion
      } catch (error) {
        console.error("Failed to delete transaction:", error);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <DateFilter onFilterChange={(newFilter) => setFilters(newFilter)} />
      </div>
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Transactions</h1>
          <p className="text-gray-500 text-sm">Monitor your 50/30/20 cash flow</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2"
        >
          <span className="text-xl">+</span> Add Transaction
        </button>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading your ledger...</div>
        ) : transactions.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {transactions.map((t) => (
              <div key={t.id} className="p-4 hover:bg-gray-50 flex justify-between items-center transition-colors group">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{t.note || 'Untitled Transaction'}</span>
                  <span className="text-xs text-gray-400">{t.date} • {t.type}</span>
                </div>
                <div className="flex items-center gap-4">
                <span className={`font-bold ${t.type === 'EXPENSE' ? 'text-red-500' : 'text-green-600'}`}>
                  {t.type === 'EXPENSE' ? '-' : '+'} ₹{t.amount.toLocaleString()}
                </span>
                <button 
                  onClick={() => handleDeleteClick(t)}
                  className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 font-bold"
                >
                  Delete
                </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-400">
            No transactions found. Click "Add Transaction" to start.
          </div>
        )}
      </div>

      {/* 2. The Pop-up (Modal) */}
      {showForm && (
        <TransactionForm 
          onClose={() => setShowForm(false)} 
          onTransactionAdded={() => {
            loadData(); // Refresh the list automatically
            setShowForm(false);
          }} 
        />
      )}
    </div>
  );
}