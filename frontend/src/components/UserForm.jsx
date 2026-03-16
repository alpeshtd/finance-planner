import { useState } from 'react';
import { userService } from '../services/userService';

export default function UserForm({ onUserAdded, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await userService.create(formData);
      onUserAdded();
      onClose();
    } catch (error) {
      alert(error.response?.data?.detail || "Error creating user");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold mb-6">Add New User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            placeholder="Name" 
            className="w-full p-3 border rounded-xl"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required 
          />
          <input 
            type="email"
            placeholder="Email Address" 
            className="w-full p-3 border rounded-xl"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required 
          />
          <input 
            type="password"
            placeholder="Password" 
            className="w-full p-3 border rounded-xl"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required 
          />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold">Cancel</button>
            <button type="submit" className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold">Create User</button>
          </div>
        </form>
      </div>
    </div>
  );
}