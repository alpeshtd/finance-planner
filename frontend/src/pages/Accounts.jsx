import { useEffect, useState } from 'react';
import { accountService } from '../services/accountService';
import AccountForm from '../components/AccountForm';
import { Pencil, Trash2 } from 'lucide-react';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  const loadData = async () => {
    const data = await accountService.getAll();
    setAccounts(data);
  };

  const handleDelete = async (accountId, accountName) => {
    if (window.confirm(`Are you sure you want to delete "${accountName}"? This action cannot be undone.`)) {
      try {
        await accountService.delete(accountId);
        loadData();
      } catch (err) {
        console.error('Failed to delete account', err);
        alert('Failed to delete account');
      }
    }
  };

  useEffect(() => { loadData(); }, []);

  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Net Worth Summary Card */}
      <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-lg shadow-blue-200">
        <p className="opacity-80 text-sm font-medium uppercase tracking-wider">Total Available Balance</p>
        <h2 className="text-4xl font-bold mt-1">₹{totalBalance.toLocaleString('en-IN')}</h2>
      </div>

      <div className="flex justify-between items-center px-2">
        <h3 className="text-xl font-bold text-gray-800">Your Accounts</h3>
        <button 
          onClick={() => { setEditingAccount(null); setShowForm(true); }}
          className="text-blue-600 font-bold text-sm hover:underline"
        >
          + Add New
        </button>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center group">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">{acc.account_type}</p>
              <h4 className="font-bold text-gray-800">{acc.name}</h4>
              <p className="text-sm text-gray-500">User: {acc.user_id} | {acc.purpose || 'No purpose defined'}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">₹{parseFloat(acc.balance).toLocaleString('en-IN')}</p>
              <div className="flex gap-2 justify-end mt-2">
                <button 
                  onClick={() => { setEditingAccount(acc); setShowForm(true); }}
                  className="text-blue-500 hover:text-blue-700 transition-colors"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button 
                  onClick={() => handleDelete(acc.id, acc.name)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <AccountForm 
          onClose={() => setShowForm(false)} 
          onAccountAdded={loadData} 
          editingAccount={editingAccount}
        />
      )}
    </div>
  );
}