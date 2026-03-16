import { useState, useEffect } from 'react';
import { categoryService } from '../services/catServices';

export default function CategoryForm({ onCategoryAdded, onClose, editingCategory = null }) {
    // 1. Define the state for categories
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: editingCategory?.name || '',
    parent_id: editingCategory?.parent_id || '',
    percentage: editingCategory?.percentage || ''
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoryService.getAll();
        setCategories(data); // This defines 'categories' for your JSX
      } catch (error) {
        console.error("Error loading categories for dropdown:", error);
      }
    };
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { 
      ...formData, 
      parent_id: formData.parent_id === "" ? null : parseInt(formData.parent_id) 
    };
    
    if (editingCategory) {
      await categoryService.update(editingCategory.id, payload);
    } else {
      await categoryService.create(payload);
    }
    
    onCategoryAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold mb-6">
          {editingCategory ? 'Edit Category' : 'Add New Category'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text" 
            placeholder="Category Name" 
            className="w-full p-3 border rounded-xl"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required 
          />

          <select 
            className="w-full p-3 border rounded-xl bg-gray-50"
            value={formData.parent_id}
            onChange={(e) => setFormData({...formData, parent_id: e.target.value})}
          >
            <option value="">No Parent (Main Category)</option>
            {/* 3. Now 'categories' is defined and can be mapped */}
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <input 
            type="number" 
            placeholder="Target %" 
            className="w-full p-3 border rounded-xl"
            value={formData.percentage}
            onChange={(e) => setFormData({...formData, percentage: e.target.value})}
          />

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold">Cancel</button>
            <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">
              {editingCategory ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}