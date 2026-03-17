import { useEffect, useState } from 'react';
import CategoryForm from '../components/CategoryForm';
import { categoryService } from '../services/catServices';
import { Pencil } from 'lucide-react';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handleEditClick = (category) => {
    setSelectedCategory(category);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedCategory(null); // Clear the selection
  };

  const loadData = async () => {
    const data = await categoryService.getAll();
    setCategories(data);
  };

  useEffect(() => { loadData(); }, []);

  // Filter to show only top-level categories in the main list
  const parentCategories = categories.filter(c => !c.parent_id);

  // A small sub-component to handle recursion
    const CategoryItem = ({ category, allCategories, onEdit, onDelete, depth = 0 }) => {
  const children = allCategories.filter(c => c.parent_id === category.id);

  return (
    <div className={`flex flex-col ${depth > 0 ? 'ml-4 mt-2 border-l-2 border-gray-100 pl-3' : ''}`}>
      {/* Container for the Category Row */}
      <div className="flex items-center justify-between group py-1.5 hover:bg-gray-50 rounded-md px-1 transition-colors">
        
        {/* Left Side: Name and Indentation logic handled by flex-1 */}
        <div className="flex-1 flex items-center gap-2 overflow-hidden">
          <span className={`truncate ${depth === 0 ? 'font-bold text-blue-900' : 'text-gray-600 text-sm'}`}>
            {category.name}
          </span>
          
          {/* Action Buttons (Hidden until hover) */}
          <div className="flex items-center gap-2 transition-opacity">
            <button onClick={() => onEdit(category)} className="text-[10px] text-blue-500 font-bold hover:underline"><Pencil size={14} /></button>
          </div>
        </div>

        {/* Right Side: Aligned Percentage Column */}
        <div className="w-16 text-right shrink-0">
          {category.percentage ? (
            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
              depth === 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {category.percentage}%
            </span>
          ) : (
            <span className="text-gray-300 text-[10px]">—</span>
          )}
        </div>
      </div>

      {/* Children Recursion */}
      {children.length > 0 && (
        <div className="flex flex-col">
          {children.map(child => (
            <CategoryItem 
              key={child.id} 
              category={child} 
              allCategories={allCategories} 
              onEdit={onEdit}
              onDelete={onDelete}
              depth={depth + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Budget Categories</h1>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold"
        >
          + Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {parentCategories.map(parent => (
    <div key={parent.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
      {/* We only start the tree from the top-level parents */}
      <CategoryItem 
        category={parent} 
        allCategories={categories} 
        onEdit={handleEditClick} // Pass the edit handler down to the item
      />
    </div>
  ))}
</div>

      {showForm && (
  <CategoryForm 
    editingCategory={selectedCategory} 
    onClose={handleCloseForm} 
    onCategoryAdded={loadData} 
  />
)}
    </div>
  );
}