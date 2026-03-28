import { useEffect, useState } from 'react';
import { userService } from '../services/userService';
import UserForm from '../components/UserForm';
import { Pen, Pencil, Trash2 } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const loadUsers = async () => {
    editingUser && setEditingUser(null);
    const data = await userService.getAll();
    setUsers(data);
  };

  useEffect(() => { loadUsers(); }, []);

  const editUserHandler = (user) => {
    setShowForm(true);
    setEditingUser(user);
  }

  const onCloseForm = () => {
    setShowForm(false);
    setEditingUser(null);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center px-2">
        <h1 className="text-2xl font-bold text-gray-800">Wealth Engine Users</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-green-700 transition-colors"
        >
          + Add User
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(user => (
          <div key={user.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>

              <div className="overflow-hidden">
                <h4 className="font-bold text-gray-800 truncate">{user.name}</h4>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">ID: {user.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Pencil size={16} color="gray" className="cursor-pointer" onClick={() => editUserHandler(user)} />
              <Trash2 size={16} color="red" className="cursor-pointer ml-2" onClick={() => alert('Delete user functionality coming soon!')} />
            </div>
          </div>
        ))}
      </div>

      {showForm && <UserForm onClose={onCloseForm} onUserAdded={loadUsers} user={editingUser} />}
    </div>
  );
}