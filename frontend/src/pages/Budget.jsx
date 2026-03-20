import React, { useEffect, useState } from 'react';
import { budgetService } from '../services/budgetService';
import { Target, Wallet, TrendingUp, ChevronRight, ArrowUpRight, HandCoins, Split } from 'lucide-react';
import DateFilter from '../components/DateFilter';

function CategoryRow({ category, level = 0 }) {
    const hasChildren = category.sub_categories && category.sub_categories.length > 0;

    return (
        <>
            <tr className="hover:bg-gray-50 transition-colors border-b border-gray-50">
                <td className="px-3 py-2">
                    <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
                        {level > 0 && <ChevronRight size={12} className="text-gray-300" />}
                        <span className={`text-sm ${level === 0 ? 'font-black text-gray-900' : 'font-bold text-gray-600'}`}>
                            {category.name} ({category.percentage}%)
                        </span>
                    </div>
                </td>
                <td className="px-3 py-2 text-[10px] font-black text-gray-400">
                    {category.percentage}%
                </td>
                <td className="px-3 py-2 text-right text-sm font-medium text-gray-400 font-mono">
                    ₹{category.target_amount.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">
                    <span className="text-sm font-black text-gray-900 font-mono">
                        ₹{category.covered_amount.toLocaleString()}
                    </span>
                </td>
            </tr>
            {/* Recursive Render: If this category has children, render them below */}
            {hasChildren && category.sub_categories.map(child => (
                <CategoryRow key={child.id} category={child} level={level + 1} />
            ))}
        </>
    );
}

export default function Budget() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });

    useEffect(() => {
        // Fetching the fully computed engine data from Python
        budgetService.getMonthlySummary(filters).then(res => {
            setData(res);
            setLoading(false);
        });
    }, [filters]);

    if (loading) return <div className="p-20 text-center font-black animate-pulse uppercase tracking-widest text-gray-400">Syncing with Bank Records...</div>;

    const investmentBucket = data.buckets.find(b => b.name === 'Investments');

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-24">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-black italic">Control Room</h1>
                <DateFilter onFilterChange={(newFilter) => setFilters(newFilter)} />
            </div>

            {/* --- HEADER: AUTOMATED INCOME --- */}
            <header className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Allocation Command</h1>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Detected from Savings Accounts</p>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-black text-gray-400 block mb-1 uppercase">Computed Monthly Income</span>
                    <span className="text-2xl font-black text-emerald-600">₹{data.monthly_income.toLocaleString()}</span>
                </div>
            </header>

            <div className='bg-white p-4 rounded-[1rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow'>
                <div className="flex justify-between items-center">
                    <div className='flex items-center gap-3'>
                        <HandCoins size={20} className="text-yellow-500" />
                        <h2 className='text-lg font-bold'>Expenses</h2>
                    </div>
                    <span className="text-lg font-bold text-gray-800">₹{data.monthly_expense.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                    <div className='flex items-center gap-3'>
                        <Split size={20} className="text-blue-500" />
                        <h2 className='text-lg font-bold'>Transfers</h2>
                    </div>
                    <span className="text-lg font-bold text-gray-800">₹{data.monthly_transfer.toLocaleString()}</span>
                </div>
            </div>

            {/* --- GAP ANALYSIS: THE INVESTMENT VELOCITY --- */}
            <div className="bg-gray-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-2">Wealth Velocity</p>
                    <h2 className="text-4xl font-bold italic">
                        {investmentBucket?.covered_amount < investmentBucket?.target_amount
                            ? `Transfer ₹${(investmentBucket.target_amount - investmentBucket.covered_amount).toLocaleString()} to reach target`
                            : "Investment Strategy 100% Covered 🚀"}
                    </h2>
                </div>
                <ArrowUpRight size={140} className="absolute -right-6 -bottom-6 text-white/5 rotate-12" />
            </div>

            {/* --- ROOT CARDS: DYNAMIC PERCENTAGES --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {data.buckets.map(bucket => (
                    <div key={bucket.name} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-gray-50 rounded-2xl text-blue-600">
                                <Wallet size={20} />
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className="text-[10px] font-black px-3 py-1 bg-gray-100 rounded-full text-gray-500 uppercase">
                                    {bucket.target_amount > 0 ? ((bucket.covered_amount / bucket.target_amount) * 100).toFixed(1) : 0}% Covered
                                </span>
                            </div>
                        </div>

                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{bucket.name}</p>
                        <p className="text-3xl font-black text-gray-900 mt-1 italic">₹{bucket.covered_amount.toLocaleString()}</p>

                        <div className="mt-6 space-y-3">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-gray-400">
                                <span>Target ({bucket.percentage}%)</span>
                                <span className="text-gray-900 font-black">₹{bucket.target_amount.toLocaleString()}</span>
                            </div>

                            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                                <div
                                    className={`h-full transition-all duration-1000 ${bucket.covered_amount >= bucket.target_amount ? 'bg-emerald-500' : 'bg-blue-600'
                                        }`}
                                    style={{ width: `${Math.min((bucket.covered_amount / bucket.target_amount) * 100, 100)}%` }}
                                />
                            </div>

                            {/* Dynamic Status Text */}
                            <div className="flex justify-between items-center pt-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                    {bucket.covered_amount >= bucket.target_amount ? (
                                        <span className="text-emerald-600">Goal Met</span>
                                    ) : (
                                        <span>Remaining ₹{(bucket.target_amount - bucket.covered_amount).toLocaleString()}</span>
                                    )}
                                </p>
                                {bucket.covered_amount > bucket.target_amount && (
                                    <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">
                                        +₹{(bucket.covered_amount - bucket.target_amount).toLocaleString()} Over
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- DRILL DOWN SECTION --- */}
            <div className="space-y-6">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Channel Breakdown</h3>
                <div className="space-y-8">
                    {data.buckets.map(rootBucket => (
                        <div key={rootBucket.id} className="bg-white rounded-[1rem] border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-3 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center px-3">
                                <span className="font-black text-gray-800 uppercase text-xs tracking-widest">
                                    {rootBucket.name} Strategy
                                </span>
                            </div>
                            <div style={{ maxWidth: '90vw', overflow: 'auto' }}>
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-black text-gray-400 uppercase border-b border-gray-50">
                                            <th className="px-3 py-2">Category Tree</th>
                                            <th className="px-3 py-2">Target %</th>
                                            <th className="px-3 py-2 text-right">Target Amount</th>
                                            <th className="px-3 py-2 text-right">Covered</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Start the recursion with the root bucket */}
                                        <CategoryRow category={rootBucket} />
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}