import { Zap, AlertTriangle, Target, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { MilestoneCard } from '../components/MilestoneCard';
import { useSelectedUser } from '../contexts/SelectedUserContext.jsx';

export default function Dashboard() {
  const [insights, setInsights] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const { selectedUserId } = useSelectedUser();

  useEffect(() => {
    api.get('/dashboard/insights', { params: { user_id: selectedUserId } }).then(res => setInsights(res.data));
    api.get('/milestones/status').then(res => setMilestones(res.data));
  }, [selectedUserId]);

  if (!insights) return <div className="p-10 text-center font-black animate-pulse text-gray-400 uppercase tracking-widest">Scanning Wealth Engine...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8">

      {/* Dynamic Header with Vibe Check */}
      <header className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">System Status</p>
          <h1 className="text-2xl font-black italic text-gray-900 tracking-tighter">Command Center</h1>
        </div>
        <div className="text-right">
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${insights.vibe_score === 'Good' ? 'border-emerald-500 text-emerald-600' : 'border-orange-500 text-orange-600'
            }`}>
            Budget Vibe: {insights.vibe_score}
          </span>
        </div>
      </header>

      {/* Grid of "Smart Cards" */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Insight 1: Daily Burn */}
        <div className="relative group overflow-hidden bg-white p-4 rounded-[1rem] border border-gray-100 shadow-sm hover:border-blue-200 transition-all">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Zap size={80} className="text-blue-600" />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Daily Burn Rate</p>
          <h2 className="text-4xl font-black mt-2 text-gray-900 font-mono">₹{insights.daily_burn.toLocaleString()}</h2>
          <p className="text-xs font-bold text-gray-400 mt-4 flex items-center gap-1">
            <TrendingUp size={12} /> Adjusted for {new Date().getDate()} days
          </p>
        </div>

        {/* Insight 2: The "Leak" Detector */}
        <div className="bg-red-50 p-4 rounded-[1rem] border border-red-100 relative overflow-hidden">
          <div className="absolute -bottom-4 -right-4 opacity-10">
            <AlertTriangle size={120} className="text-red-600" />
          </div>
          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Primary Leak</p>
          <h2 className="text-3xl font-black mt-2 text-red-900 uppercase tracking-tighter">{insights.top_leak}</h2>
          <p className="text-sm font-bold text-red-600 mt-2">₹{insights.top_leak_amt.toLocaleString()} spent this month</p>
        </div>

        {milestones.length > 0 && (
          <section className="space-y-4">
            <div className="flex justify-between items-end">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Strategic Priority</h3>
              {/* <Link to="/milestones" className="text-[10px] font-black text-blue-600 uppercase hover:underline">View All Goals</Link> */}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {milestones.map(m => <MilestoneCard key={m.id} m={m} />)}
            </div>
          </section>
        )}

        {/* Insight 3: Strategy Adherence */}
        <div className="bg-gray-900 p-4 rounded-[1rem] shadow-2xl text-white">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Investment Velocity</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h2 className="text-5xl font-black font-mono">{insights.investment_ratio}%</h2>
            <span className="text-xs font-bold opacity-50">of expenses</span>
          </div>
          <div className="mt-6 w-full bg-white/10 h-1.5 rounded-full">
            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${insights.investment_ratio}%` }} />
          </div>
        </div>
      </div>

      {/* Proactive Advisor Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 rounded-[1rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl shadow-blue-100">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
            <Target className="text-white" size={32} />
          </div>
          <div>
            <h3 className="text-lg font-black italic">Advisor Suggestion</h3>
            <p className="text-sm opacity-90 font-medium max-w-md leading-relaxed">{insights.suggestion}</p>
          </div>
        </div>
        <button className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-lg">
          Optimize Strategy
        </button>
      </div>

    </div>
  );
}