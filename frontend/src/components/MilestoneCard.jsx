import { Target, Trash2 } from 'lucide-react';

export function MilestoneCard({ m, onDelete }) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
        <Target size={100} />
      </div>

      <div className="flex justify-between items-start relative">
        <div>
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Active Strategy</span>
          <h3 className="text-2xl font-black text-gray-900 mt-1">{m.name}</h3>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => onDelete && onDelete(m.id, m.name)}
            className="text-red-500 hover:text-red-700 transition-colors"
            title="Delete milestone"
          >
            <Trash2 size={18} />
          </button>
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase">Gap</p>
            <p className="text-xl font-black text-red-500">₹{(m.target - m.current).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase">Required Monthly</p>
            <p className="text-2xl font-black text-gray-900 italic">₹{m.monthly_required.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full uppercase">
              {m.percent}% Done
            </p>
            <p className="mt-1 text-[10px] text-gray-500">Target ₹{m.target.toLocaleString()}</p>
          </div>
        </div>

        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
          <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${m.percent}%` }} />
        </div>
        
        <p className="text-[10px] font-bold text-gray-400 text-center uppercase tracking-tighter">
          {m.days_left} Days remaining until deadline
        </p>
      </div>
    </div>
  );
}