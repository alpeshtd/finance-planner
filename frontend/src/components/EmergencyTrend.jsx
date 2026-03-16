import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function EmergencyTrend({ data }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-64">
      <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Safety Net Growth (6 Months)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
          <YAxis hide />
          <Tooltip 
            contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
          />
          <Line 
            type="monotone" 
            dataKey="balance" 
            stroke="#2563eb" 
            strokeWidth={4} 
            dot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} 
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}