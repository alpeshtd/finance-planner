import { Calendar } from 'lucide-react';

export default function DateFilter({ onFilterChange }) {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const formatDate = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const getLastMonthsRange = (months) => {
    const end = new Date(today.getFullYear(), today.getMonth(), 0); // last day of current month
    const start = new Date(today.getFullYear(), today.getMonth() - months, 1); // months back, first day
    return { start: formatDate(start), end: formatDate(end) };
  }; 

  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const options = [
    { label: 'Current Month', value: { start: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)), end: formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)) } },
    { label: 'Last Month', value: { start: formatDate(new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1)), end: formatDate(new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0)) } },
    { label: 'Last 3 Months', value: getLastMonthsRange(3) },
    { label: 'Last 6 Months', value: getLastMonthsRange(6) },
    { label: `Full Year ${currentYear}`, value: { start: `${currentYear}-01-01`, end: `${currentYear}-12-31` } },
  ];

  return (
    <div className="flex items-center gap-2 bg-white p-2 px-4 rounded-2xl border border-gray-100 shadow-sm">
      <Calendar size={16} className="text-blue-500" />
      <select 
        onChange={(e) => onFilterChange(JSON.parse(e.target.value))}
        className="text-[10px] font-black uppercase tracking-widest bg-transparent outline-none cursor-pointer"
      >
        {options.map((opt, i) => (
          <option key={i} value={JSON.stringify(opt.value)}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}