import React, { useState, useEffect } from 'react';
import MilestoneForm from '../components/MilestoneForm';
import { MilestoneCard } from '../components/MilestoneCard';
import { Plus, Target } from 'lucide-react';
import api from '../services/api';

export default function Milestones() {
    const [milestones, setMilestones] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const fetchData = async () => {
        const [mRes, cRes] = await Promise.all([
            api.get('/milestones/status'),
            api.get('/categories/')
        ]);
        setMilestones(mRes.data);
        setCategories(cRes.data);
        setIsFormOpen(false); // Close form after successful add
    };

    useEffect(() => { fetchData(); }, []);

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* Consistent Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter text-gray-900">Strategic Goals</h1>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Target: 10 Lac & Loan Prepayments</p>
                </div>
                <button
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
                >
                    {isFormOpen ? 'Close' : <><Plus size={14} /> Add Milestone</>}
                </button>
            </div>

            {/* Conditional Form Area */}
            {isFormOpen && (
                <div className="animate-in slide-in-from-top-4 duration-300">
                    <div className="p-6 mb-2 bg-blue-50 rounded-[2rem] border border-blue-100">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase mb-2">Planning Tip</h4>
                        <p className="text-xs text-blue-800 leading-relaxed font-medium">
                            Link milestones to specific categories like "Investments" to automate progress tracking.
                        </p>
                    </div>
                    <MilestoneForm categories={categories} onAdd={fetchData} />
                </div>
            )}

            {/* Data List */}
            <div className="grid grid-cols-1 gap-6">
                {milestones.length > 0 ? (
                    milestones.map(m => <MilestoneCard key={m.id} m={m} isFullWidth />)
                ) : (
                    <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                        <Target className="mx-auto text-gray-300 mb-4" size={48} />
                        <p className="text-sm font-bold text-gray-400 uppercase">No active strategic goals found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}