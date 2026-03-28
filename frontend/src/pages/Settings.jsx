import { useEffect, useState } from 'react';
import { userService } from '../services/userService';
import { useSelectedUser } from '../contexts/SelectedUserContext';

export default function Settings() {
  const [users, setUsers] = useState([]);
  const { selectedUserId, setSelectedUserId, clearSelectedUser } = useSelectedUser();

  useEffect(() => {
    userService.getAll().then((data) => setUsers(data));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Settings</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Default user filter</label>
            <select
              value={selectedUserId || ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedUserId(value ? parseInt(value, 10) : null);
              }}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
            >
              <option value="">Show data for all users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>

          {selectedUserId && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={clearSelectedUser}
                className="rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Clear user filter
              </button>
              <span className="text-sm text-gray-500">Data will now show across all users.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
