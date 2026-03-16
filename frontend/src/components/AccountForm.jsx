import { useState, useEffect } from 'react';
import { accountService } from '../services/accountService';
import { metadataService } from '../services/metadataService';
import { userService } from '../services/userService';

export default function AccountForm({ onAccountAdded, onClose, editingAccount = null }) {
  const [enums, setEnums] = useState({ account_types: [], account_purposes: [] });
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    name: editingAccount?.name || '',
    account_type: editingAccount?.account_type || '', 
    balance: editingAccount?.balance || 0,
    purpose: editingAccount?.purpose || '',
    user_id: editingAccount?.user_id || ''
  });

  useEffect(() => {
    // Fetch both Enums and Users in parallel
    Promise.all([
      metadataService.getEnums(),
      userService.getAll()
    ]).then(([enumData, userData]) => {
      setEnums(enumData);
      setUsers(userData);

      // Set defaults for a new account
      if (!editingAccount) {
        setFormData(prev => ({
          ...prev,
          account_type: enumData.account_types[0],
          purpose: enumData.account_purposes[0],
          user_id: userData[0]?.id || '' // Default to the first user found
        }));
      }
    });
  }, [editingAccount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { 
    ...formData, 
    // user_id: 1 // This matches what your FastAPI model expects
  };

  try {
    if (editingAccount) {
      await accountService.update(editingAccount.id, payload);
    } else {
      await accountService.create(payload);
    }
    onAccountAdded();
    onClose();
  } catch (error) {
    console.error("Submission failed:", error.response?.data);
  }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold mb-6">{editingAccount ? 'Edit Account' : 'New Account'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 ml-1">Account Owner</label>
            <select 
              className="w-full p-3 border rounded-xl bg-blue-50 focus:ring-2 focus:ring-blue-500"
              value={formData.user_id}
              onChange={(e) => setFormData({...formData, user_id: e.target.value})}
              required
            >
              <option value="">Select User</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} (ID: {user.id})
                </option>
              ))}
            </select>
          </div>
          <input 
            placeholder="Account Name (e.g. HDFC Salary)" 
            className="w-full p-3 border rounded-xl"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required 
          />
          
          <select 
        className="w-full p-3 border rounded-xl"
        value={formData.account_type}
        onChange={(e) => setFormData({...formData, account_type: e.target.value})}
      >
        {enums.account_types.map(type => (
          <option key={type} value={type}>{type.replace('_', ' ')}</option>
        ))}
      </select> 

          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-400">₹</span>
            <input 
              type="number"
              placeholder="Current Balance" 
              className="w-full p-3 pl-8 border rounded-xl"
              value={formData.balance}
              onChange={(e) => setFormData({...formData, balance: e.target.value})}
              required 
            />
          </div>

          <select 
        className="w-full p-3 border rounded-xl"
        value={formData.purpose}
        onChange={(e) => setFormData({...formData, purpose: e.target.value})}
      >
        {enums.account_purposes.map(purpose => (
          <option key={purpose} value={purpose}>{purpose}</option>
        ))}
      </select>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold">Cancel</button>
            <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}