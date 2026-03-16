import { useState, useEffect } from 'react';
import { transactionService } from '../services/transactionService';
import { userService } from '../services/userService';
import { accountService } from '../services/accountService';
import { categoryService } from '../services/catServices';

export default function TransactionForm({ onTransactionAdded, onClose }) {
  const [type, setType] = useState('EXPENSE');
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    user_id: '',
    amount: '',
    category_id: '',
    from_account_id: '',
    to_account_id: '',
    note: '',
    date: new Date().toISOString().split('T')[0]
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
      
      // Default to first user if available
      if (userData.length > 0) {
        setFormData(prev => ({ ...prev, user_id: userData[0].id }));
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await transactionService.create({ 
      ...formData,
      user_id: parseInt(formData.user_id),
      to_account_id: (type === 'INCOME' || type === 'TRANSFER') && formData.to_account_id 
      ? parseInt(formData.to_account_id) 
      : null,
      from_account_id: (type === 'TRANSFER' || type === 'EXPENSE') && formData.from_account_id 
      ? parseInt(formData.from_account_id) 
      : null,
      category_id: type !== 'INCOME' && formData.category_id
      ? parseInt(formData.category_id) 
      : null,
      type
    });
    onTransactionAdded(); // Refresh the list in the parent component
    onClose(); // Close the modal
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">New Transaction</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Segmented Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
          {['INCOME', 'EXPENSE', 'TRANSFER'].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                type === t ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Field */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 ml-1 uppercase">Logged By</label>
            <select 
              className="w-full p-3 border rounded-xl bg-gray-50"
              value={formData.user_id}
              onChange={(e) => setFormData({...formData, user_id: e.target.value})}
              required
            >
              <option value="">Select User</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 ml-1">Date</label>
            <input 
              type="date" 
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              required 
            />
          </div>
          <input 
            type="number" 
            placeholder="Amount" 
            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setFormData({...formData, amount: e.target.value})}
            required 
          />

          {/* Conditional Dropdowns based on Type */}
          {(type === 'EXPENSE' || type === 'TRANSFER') && (
            <select 
              className="w-full p-3 border rounded-xl"
              onChange={(e) => setFormData({...formData, from_account_id: e.target.value})}
            >
              <option value="">From Account</option>
              {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
          )}

          {(type === 'INCOME' || type === 'TRANSFER') && (
            <select 
              className="w-full p-3 border rounded-xl"
              onChange={(e) => setFormData({...formData, to_account_id: e.target.value})}
            >
              <option value="">To Account</option>
              {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
          )}

          {(type === 'EXPENSE' || type === 'TRANSFER') && (
            <select 
              className="w-full p-3 border rounded-xl"
              onChange={(e) => setFormData({...formData, category_id: e.target.value})}
            >
              <option value="">Category</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          )}

          <input 
            type="text" 
            placeholder="Note (e.g. Dinner with wife)" 
            className="w-full p-3 border rounded-xl"
            onChange={(e) => setFormData({...formData, note: e.target.value})}
          />

          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
            Save Transaction
          </button>
        </form>
      </div>
    </div>
  );
}