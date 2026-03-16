import React, { useEffect, useState } from 'react';
import api from '../services/api'; // Use your existing api instance
import { ShieldCheck, TrendingUp, Landmark, CreditCard, Wallet, Loader2 } from 'lucide-react';

const PURPOSE_ICONS = {
  EMERGENCY: <ShieldCheck className="text-blue-500" size={24} />,
  INVESTMENT: <TrendingUp className="text-green-500" size={24} />,
};

const getRunwayGradient = (months) => {
  if (months < 2) return 'from-red-600 to-orange-600';
  if (months < 6) return 'from-blue-500 to-indigo-600';
  return 'from-emerald-500 to-teal-600';
};

export default function Emergency() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/emergency/status').then(res => {
      setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-black text-gray-800 italic">Safety Radar</h1>

      {/* Runway Card */}
      <div className={`bg-gradient-to-br ${getRunwayGradient(data.runway_months)} rounded-[2.5rem] p-10 text-white shadow-2xl`}>
        <p className="opacity-70 text-[10px] font-black uppercase tracking-[0.3em]">Financial Runway</p>
        <div className="flex items-baseline gap-3">
          <h2 className="text-7xl font-black">{data.runway_months}</h2>
          <span className="text-xl font-bold italic opacity-80">Months</span>
        </div>
        <p className="mt-6 text-sm font-medium opacity-90">
          Monthly Burn: <span className="font-black">₹{data.avg_monthly_expense.toLocaleString()}</span>
        </p>
      </div>

      {/* Progress Section */}
      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="flex justify-between items-end mb-4">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Goal: 6 Months</span>
            <span className="text-lg font-black text-gray-900">₹{data.total_emergency_cash.toLocaleString()}</span>
          </div>
          <span className="text-sm font-black text-blue-600 italic">Target: ₹{data.target_fund.toLocaleString()}</span>
        </div>
        <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden shadow-inner">
          <div 
            className="bg-blue-600 h-full transition-all duration-1000" 
            style={{ width: `${data.progress_percent}%` }}
          />
        </div>
      </div>

      {/* Safety Nets */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Verified Liquidity</h3>
        {data.safety_nets.map(acc => (
          <div key={acc.id} className="bg-white p-6 rounded-3xl flex justify-between items-center border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-gray-50 rounded-2xl">{PURPOSE_ICONS[acc.purpose] || <Wallet />}</div>
              <div>
                <p className="font-black text-gray-900">{acc.name}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{acc.account_type}</p>
              </div>
            </div>
            <span className="text-xl font-black text-gray-900 font-mono italic">
              ₹{acc.balance.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}