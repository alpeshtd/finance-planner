import { useEffect, useState } from 'react';
import { accountService } from '../services/accountService';
import { transactionService } from '../services/transactionService';
import { categoryService } from '../services/categoryService';
import { 
  Target, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ChevronRight, 
  AlertCircle 
} from 'lucide-react';

export default function Budget() {
  const [income, setIncome] = useState(100000); // This could eventually come from a 'User' setting
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      categoryService.getAll(),
      transactionService.getAll()
    ]).then(([catData, txData]) => {
      setCategories(catData);
      setTransactions(txData);
      setLoading(false);
    });
  }, []);

  // Helper: Find all descendant IDs for a given category ID
  const getChildIds = (parentId) => {
    let ids = [parentId];
    categories.filter(c => c.parent_id === parentId).forEach(child => {
      ids = [...ids, ...getChildIds(child.id)];
    });
    return ids;
  };

  // Calculate totals for a root category (e.g., 'Needs')
  const getBucketTotal = (rootName) => {
    const root = categories.find(c => c.name.toLowerCase() === rootName.toLowerCase() && !c.parent_id);
    if (!root) return 0;
    
    const allRelatedIds = getChildIds(root.id);
    return transactions
      .filter(tx => allRelatedIds.includes(tx.category_id))
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
  };

  const totals = {
    needs: getBucketTotal('Needs'),
    wants: getBucketTotal('Wants'),
    investments: getBucketTotal('Investments')
  };

  const goals = {
    needs: income * 0.5,
    wants: income * 0.3,
    investments: income * 0.2
  };

  if (loading) return <div className="p-10 text-center font-bold">Waking up the Engine...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-8 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Control Room</h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Allocation Strategy: 50/30/20</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-right">
          <span className="text-[10px] font-black text-gray-400 uppercase">Est. Monthly Income</span>
          <p className="text-xl font-black text-emerald-600">₹{income.toLocaleString()}</p>
        </div>
      </div>

      {/* 1. Gap Analysis: The Actionable Insight */}
      <div className="bg-gray-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Investment Velocity</p>
          <h2 className="text-3xl font-bold">
            {totals.investments < goals.investments 
              ? `You need ₹${(goals.investments - totals.investments).toLocaleString()} more` 
              : "Wealth Goal Smashed! 🚀"}
          </h2>
          <p className="text-gray-400 text-sm mt-2 max-w-md">
            To hit your 20% target, ensure your transfers to the <strong>Liquid Fund</strong> are completed before month-end.
          </p>
        </div>
        <ArrowUpRight size={120} className="absolute -right-4 -bottom-4 text-white/5 rotate-12" />
      </div>

      {/* 2. Primary Bucket Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <BudgetCard 
          title="Needs" 
          spent={totals.needs} 
          limit={goals.needs} 
          icon={<Wallet className="text-blue-500" />} 
          color="blue" 
        />
        <BudgetCard 
          title="Wants" 
          spent={totals.wants} 
          limit={goals.wants} 
          icon={<TrendingDown className="text-orange-500" />} 
          color="orange" 
        />
        <BudgetCard 
          title="Investments" 
          spent={totals.investments} 
          limit={goals.investments} 
          icon={<Target className="text-emerald-500" />} 
          color="emerald" 
        />
      </div>

      {/* 3. Detailed Drill-down (Needs/Wants/Investments) */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest ml-2">Breakdown by Root</h3>
        {['Needs', 'Wants', 'Investments'].map(rootName => (
          <DrillDownSection 
            key={rootName}
            rootName={rootName}
            categories={categories}
            transactions={transactions}
            limit={goals[rootName.toLowerCase()]}
          />
        ))}
      </div>
    </div>
  );
}

// Card Component
function BudgetCard({ title, spent, limit, icon, color }) {
  const percent = ((spent / limit) * 100).toFixed(0);
  const isOver = spent > limit;
  const colorMap = {
    blue: 'bg-blue-600',
    orange: 'bg-orange-500',
    emerald: 'bg-emerald-500'
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-6">
        <div className="p-4 bg-gray-50 rounded-2xl">{icon}</div>
        <span className={`text-xs font-black px-3 py-1 rounded-full ${isOver ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
          {percent}%
        </span>
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-gray-900">₹{spent.toLocaleString()}</p>
        <p className="text-[10px] text-gray-400 mt-1 font-bold">REMAINING: ₹{Math.max(0, limit - spent).toLocaleString()}</p>
      </div>
      <div className="w-full bg-gray-100 h-2.5 rounded-full mt-4 overflow-hidden">
        <div className={`h-full ${colorMap[color]} transition-all duration-1000`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
      </div>
    </div>
  );
}

// Drill-down Section
function DrillDownSection({ rootName, categories, transactions, limit }) {
  const root = categories.find(c => c.name.toLowerCase() === rootName.toLowerCase() && !c.parent_id);
  if (!root) return null;

  // Find direct children of the root (e.g., Rent, Food, etc.)
  const directChildren = categories.filter(c => c.parent_id === root.id);

  return (
    <div className="bg-white rounded-3xl border border-gray-50 shadow-sm overflow-hidden">
      <div className="p-5 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
        <span className="font-black text-gray-700">{rootName} Details</span>
        <span className="text-xs font-bold text-gray-400 italic">Target: ₹{limit.toLocaleString()}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {directChildren.map(child => {
          const childTotal = transactions
            .filter(tx => tx.category_id === child.id)
            .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
          
          return (
            <div key={child.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <ChevronRight size={14} className="text-gray-300" />
                <span className="text-sm font-bold text-gray-600">{child.name}</span>
              </div>
              <span className="text-sm font-black text-gray-800">₹{childTotal.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}