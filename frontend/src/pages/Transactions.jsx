import { use, useEffect, useState } from 'react';
import { transactionService } from '../services/transactionService';
import TransactionForm from '../components/TransactionForm'; // Import your new form
import DateFilter from '../components/DateFilter';
import { FileTerminal, SlidersHorizontal, Trash2, Info, X } from 'lucide-react';
import { userService } from '../services/userService';
import { accountService } from '../services/accountService';
import { categoryService } from '../services/catServices';
import TransactionFilters from '../components/TransactionFilters';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useSelectedUser } from '../contexts/SelectedUserContext.jsx';

const TransactionCss = {
  "EXPENSE": "text-red-500",
  "INCOME": "text-green-600",
  "TRANSFER": "text-blue-500"
}

const formatDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [params] = useSearchParams();
  const paramCategory_id = params.get('category_id');
  const paramStart = params.get('start');
  const paramEnd = params.get('end');
  const { selectedUserId } = useSelectedUser();

  const [filters, setFilters] = useState({
    // month: new Date().getMonth() + 1,
    // year: new Date().getFullYear(),
    start: paramStart ||  formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    end: paramEnd || formatDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)),
    category_id: paramCategory_id || "",
    account_id: "",
    user_id: selectedUserId ? String(selectedUserId) : ""
  });

  useEffect(() => {
    // Fetch all required data for the dropdowns
    Promise.all([
      userService.getAll(),
      accountService.getAll(),
      categoryService.getAll()
    ]).then(([userData, accountData, catData]) => {
      setUsers(userData);
      setAccounts(accountData);
      setCategories(catData);
    });
  }, []);

  // Function to fetch data - we'll call this on mount AND after a new transaction is added
  const loadData = async () => {
    try {
      const data = await transactionService.getAll({ ...filters }); // User ID 1
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

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      user_id: selectedUserId ? String(selectedUserId) : ""
    }));
  }, [selectedUserId]);

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

  const handleShowDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  const handleCloseDetails = () => {
    setSelectedTransaction(null);
    setShowDetailModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <DateFilter onFilterChange={(newFilter) => setFilters(newFilter)} />
        <SlidersHorizontal size={18} color="gray" className="cursor-pointer" onClick={() => setShowFilters(true)} />
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
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate" style={{ maxWidth: '20ch' }}>{t.note || 'Untitled Transaction'}</span>
                    <button
                      onClick={() => handleShowDetails(t)}
                      className="rounded-full border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600 transition"
                      aria-label="View transaction details"
                    >
                      <Info size={12} />
                    </button>
                  </div>
                  <span className="text-xs text-gray-400">{t.date} • {users.find(u => u.id === t.user_id)?.name || 'Unknown'} • {categories.find(c => c.id === t.category_id)?.name || (t.type === 'INCOME' ? '' : 'Unknown')}</span>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className={`font-bold ${TransactionCss[t.type]}`}>
                    {t.type === 'EXPENSE' ? '-' : '+'} ₹{t.amount.toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleDeleteClick(t)}
                    className="text-xs text-blue-400 font-bold"
                  >
                    <Trash2 size={14} color="salmon" />
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
      {showDetailModal && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-xl overflow-y-auto max-h-[80vh]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Transaction details</h3>
                <p className="text-xs text-slate-500">Quick overview of this transaction.</p>
              </div>
              <button
                type="button"
                onClick={handleCloseDetails}
                className="rounded-full border border-slate-200 bg-slate-50 p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                aria-label="Close details"
              >
                <X size={13} />
              </button>
            </div>
            <div className="mt-5 grid gap-3 grid-cols-2 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Date</p>
                <p className="text-xs text-slate-900">{selectedTransaction.date}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Amount</p>
                <p className="text-xs text-slate-900">{selectedTransaction.type === 'EXPENSE' ? '-' : '+'} ₹{selectedTransaction.amount.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Type</p>
                <p className="text-xs text-slate-900">{selectedTransaction.type}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Category</p>
                <p className="text-xs text-slate-900">{categories.find((c) => c.id === selectedTransaction.category_id)?.name || 'Unknown'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Account</p>
                <p className="text-xs text-slate-900">{accounts.find((a) => a.id === selectedTransaction.account_id)?.name || 'Unknown'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">User</p>
                <p className="text-xs text-slate-900">{users.find((u) => u.id === selectedTransaction.user_id)?.name || 'Unknown'}</p>
              </div>
              <div className="sm:col-span-3 space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Note</p>
                <p className="text-xs text-slate-900">{selectedTransaction.note || 'No note provided'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {showFilters && (
        <TransactionFilters
          categories={categories}
          accounts={accounts}
          users={users}
          filters={filters}
          onApplyFilters={(newFilters) => {
            setFilters({ ...filters, ...newFilters });
            setShowFilters(false);
          }}
        />
      )}
    </div>
  );
}