import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, HeartPulse, Sparkles, AlertTriangle, Trash2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { healthCareServices } from '../services/healthCareServices';
const movementOptions = [
  'Kick',
  'Punch',
  'Roll',
  'Flutter',
  'Stretch',
  'Hiccup',
  'Wave',
];

const initialForm = {
  date: new Date().toISOString().slice(0, 10),
  time: new Date().toTimeString().slice(0, 5),
  mealSnack: 'no',
  movementCount: '0',
  movementTypes: [],
  otherMovement: '',
  notes: '',
};

function formatLabel(value) {
  if (value === 'yes') return 'Yes';
  if (value === 'no') return 'No';
  return 'Not sure';
}

function formatChartDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function BabyMovements() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const data = await healthCareServices.getBabyMovementEntries();
        const normalized = (Array.isArray(data) ? data : []).map((entry) => ({
          id: entry.id,
          date: entry.entry_date,
          time: entry.entry_time,
          mealSnack: entry.meal_or_snack,
          movementCount: entry.movement_count ?? '0',
          movementTypes: entry.movement_types || [],
          otherMovement: entry.other_movement || '',
          notes: entry.notes || '',
        }));
        setEntries(normalized);
      } catch (error) {
        console.error('Failed to load baby movement entries', error);
      }
    };

    loadEntries();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleMovementToggle = (movement) => {
    setForm((current) => {
      const nextTypes = current.movementTypes.includes(movement)
        ? current.movementTypes.filter((type) => type !== movement)
        : [...current.movementTypes, movement];

      return { ...current, movementTypes: nextTypes };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const payload = {
        entry_date: form.date,
        entry_time: form.time,
        meal_or_snack: form.mealSnack,
        movement_count: Number(form.movementCount || 0),
        movement_types: form.movementTypes,
        other_movement: form.otherMovement.trim() || null,
        notes: form.notes.trim() || null,
      };

      const createdEntry = await healthCareServices.addBabyMovementEntry(payload);
      const normalizedEntry = {
        id: createdEntry.id,
        date: createdEntry.entry_date,
        time: createdEntry.entry_time,
        mealSnack: createdEntry.meal_or_snack,
        movementCount: createdEntry.movement_count ?? '0',
        movementTypes: createdEntry.movement_types || [],
        otherMovement: createdEntry.other_movement || '',
        notes: createdEntry.notes || '',
      };

      setEntries((current) => [normalizedEntry, ...current].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)));
      setForm({ ...initialForm, date: form.date });
    } catch (error) {
      console.error('Failed to save baby movement entry', error);
      alert('Unable to save the movement entry right now.');
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('Delete this movement entry?')) return;

    setDeletingId(id);
    try {
      await healthCareServices.deleteBabyMovementEntry(id);
      setEntries((current) => current.filter((entry) => entry.id !== id));
    } catch (error) {
      console.error('Failed to delete baby movement entry', error);
      alert('Unable to delete the movement entry right now.');
    } finally {
      setDeletingId(null);
    }
  };

  const groupedEntries = useMemo(() => {
    const groups = entries.reduce((acc, entry) => {
      if (!acc[entry.date]) {
        acc[entry.date] = {
          date: entry.date,
          totalCount: 0,
          sessions: [],
        };
      }

      const count = Number(entry.movementCount ?? 0);
      acc[entry.date].totalCount += Number.isFinite(count) ? count : 0;
      acc[entry.date].sessions.push(entry);
      return acc;
    }, {});

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [entries]);

  const hourlyChartData = useMemo(() => {
    const totals = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));

    entries.forEach((entry) => {
      const hour = Number(entry.time.slice(0, 2));
      const count = Number(entry.movementCount ?? 0);
      if (Number.isFinite(count)) {
        totals[hour].count += count;
      }
    });

    return totals;
  }, [entries]);

  const dailyChartData = useMemo(() => {
    const totals = entries.reduce((acc, entry) => {
      const date = entry.date;
      const count = Number(entry.movementCount ?? 0);
      if (!acc[date]) {
        acc[date] = { date, count: 0 };
      }
      if (Number.isFinite(count)) {
        acc[date].count += count;
      }
      return acc;
    }, {});

    return Object.values(totals).sort((a, b) => a.date.localeCompare(b.date));
  }, [entries]);

  const sessionChartData = useMemo(() => {
    const sessionMap = new Map();

    entries.forEach((entry) => {
      const hour = Number(entry.time.slice(0, 2));
      const count = Number(entry.movementCount ?? 0);
      if (!Number.isFinite(count)) return;

      let sessionKey = 'night';
      if (hour >= 8 && hour < 12) sessionKey = 'morning';
      else if (hour >= 12 && hour < 16) sessionKey = 'afternoon';
      else if (hour >= 16 && hour < 20) sessionKey = 'evening';

      const date = entry.date;
      if (!sessionMap.has(date)) {
        sessionMap.set(date, { date, morning: 0, afternoon: 0, evening: 0, night: 0 });
      }

      const dayData = sessionMap.get(date);
      dayData[sessionKey] += count;
    });

    return Array.from(sessionMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [entries]);

  const analytics = useMemo(() => {
    const totalEntries = entries.length;
    const daysWithEntries = new Set(entries.map((entry) => entry.date)).size;
    const averagePerDay = daysWithEntries > 0 ? (totalEntries / daysWithEntries).toFixed(1) : '0.0';

    const peakHour = hourlyChartData.reduce((best, current, hour) => (current.count > hourlyChartData[best].count ? hour : best), 0);
    const peakHourLabel = `${String(peakHour).padStart(2, '0')}:00`;

    const movementCounts = entries.reduce((acc, entry) => {
      entry.movementTypes.forEach((type) => {
        acc[type] = (acc[type] || 0) + 1;
      });
      return acc;
    }, {});

    const mostCommonMovement = Object.entries(movementCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No data yet';

    const mealSnackEntries = entries.filter((entry) => entry.mealSnack === 'yes').length;
    const mealSnackShare = totalEntries > 0 ? Math.round((mealSnackEntries / totalEntries) * 100) : 0;

    return {
      totalEntries,
      averagePerDay,
      peakHourLabel,
      mostCommonMovement,
      mealSnackEntries,
      mealSnackShare,
    };
  }, [entries, hourlyChartData]);

  const maxHourValue = Math.max(1, ...hourlyChartData.map((item) => item.count));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-pink-50 px-3 py-1 text-sm font-medium text-pink-700">
          <HeartPulse size={16} />
          Pregnancy movement tracker
        </div>
        <h2 className="text-xl font-semibold text-slate-800">Track baby movement patterns and spot trends early</h2>
        {/* <p className="text-sm text-slate-600">
          Record movement timing, whether a snack or meal came before the activity, and any notes that may be useful for your clinician.
        </p> */}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span className="flex items-center gap-2"><CalendarDays size={15} /> Date</span>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                required
                className="w-full rounded-2xl border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span className="flex items-center gap-2"><Clock3 size={15} /> Time</span>
              <input
                type="time"
                name="time"
                value={form.time}
                onChange={handleChange}
                required
                className="w-full rounded-2xl border border-slate-200 px-3 py-2"
              />
            </label>
          </div>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Was a meal or snack eaten recently?</span>
            <select
              name="mealSnack"
              value={form.mealSnack}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="not-sure">Not sure</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Movement count for this session</span>
            <input
              type="number"
              min="0"
              name="movementCount"
              value={form.movementCount}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2"
            />
          </label>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Movement type</p>
            <div className="flex flex-wrap gap-2">
              {movementOptions.map((option) => {
                const checked = form.movementTypes.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleMovementToggle(option)}
                    className={`rounded-full border px-3 py-2 text-sm transition ${checked ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                  >
                    {option}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => handleMovementToggle('Other')}
                className={`rounded-full border px-3 py-2 text-sm transition ${form.movementTypes.includes('Other') ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                Other
              </button>
            </div>
            {form.movementTypes.includes('Other') && (
              <input
                type="text"
                name="otherMovement"
                value={form.otherMovement}
                onChange={handleChange}
                placeholder="Describe the movement"
                className="w-full rounded-2xl border border-slate-200 px-3 py-2"
              />
            )}
          </div>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Notes</span>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Add anything important such as reduced movement or activity after a meal"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2"
            />
          </label>

          <button type="submit" className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Save movement entry
          </button>
        </form>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Sparkles size={16} className="text-amber-500" />
              Quick insights
            </div>
            <div className="mt-4 grid gap-3 grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Average per day</p>
                <p className="mt-1 text-2xl font-semibold text-slate-800">{analytics.averagePerDay}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Most active hour</p>
                <p className="mt-1 text-2xl font-semibold text-slate-800">{analytics.peakHourLabel}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Most common movement</p>
                <p className="mt-1 text-xl font-semibold text-slate-800">{analytics.mostCommonMovement}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Meal/snack entries</p>
                <p className="mt-1 text-2xl font-semibold text-slate-800">{analytics.mealSnackShare}%</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Activity by hour</h3>
                {/* <p className="text-xs text-slate-500">A simple pattern view to spot when movement is more frequent.</p> */}
              </div>
              <div className="rounded-full bg-pink-50 px-3 py-1 text-xs font-medium text-pink-700">{analytics.totalEntries} entries</div>
            </div>
            <div className="mt-4 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyChartData} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="hour"
                    type="number"
                    domain={[0, 24]}
                    ticks={[0, 3, 6, 9, 12, 15, 18, 21, 24]}
                    tickFormatter={(value) => value.toString()}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    width={28}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(244, 114, 182, 0.12)' }}
                    formatter={(value) => [`${value} total`, 'Count']}
                    labelFormatter={(hour) => `Hour ${hour}`}
                  />
                  <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6">
              <div className="mb-2">
                <h4 className="text-sm font-semibold text-slate-700">Daily count trend</h4>
                <p className="text-xs text-slate-500">Total movement count by date.</p>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyChartData} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={formatChartDate}
                      minTickGap={16}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      width={28}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}`, 'Count']}
                      labelFormatter={(label) => `Date ${label}`}
                    />
                    <Line type="monotone" dataKey="count" stroke="#0f766e" strokeWidth={2} dot={{ r: 3, fill: '#0f766e' }} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2">
                <h4 className="text-sm font-semibold text-slate-700">Session trend</h4>
                {/* <p className="text-xs text-slate-500">Morning, afternoon, evening, and night totals by date.</p> */}
              </div>
              <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Morning (8-12)</div>
                <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Afternoon (12-4)</div>
                <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-violet-500" />Evening (4-8)</div>
                <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-pink-500" />Night (8-12)</div>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sessionChartData} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={formatChartDate}
                      minTickGap={16}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      width={28}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}`, 'Count']}
                      labelFormatter={(label) => `Date ${label}`}
                    />
                    <Line type="monotone" dataKey="morning" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="afternoon" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="evening" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="night" stroke="#ec4899" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <AlertTriangle size={16} className="text-amber-500" />
          Recent entries by day
        </div>
        <div className="mt-4 overflow-x-auto" style={{ maxWidth: '69vw' }}>
          {entries.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No entries yet. Start by logging a movement.</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-2 py-1.5 font-semibold">Day</th>
                  <th className="px-2 py-1.5 font-semibold">Time</th>
                  <th className="px-2 py-1.5 font-semibold">Count</th>
                  <th className="px-2 py-1.5 font-semibold">Meal/Snack</th>
                  <th className="px-2 py-1.5 font-semibold">Movement Type</th>
                  <th className="px-2 py-1.5 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedEntries.map((group) => (
                  <>
                    <tr key={`${group.date}-summary`} className="bg-slate-50">
                      <td className="px-2 py-2 font-semibold text-slate-800">{group.date}</td>
                      <td colSpan="5" className="px-2 py-2">
                        <span className="inline-flex rounded-full bg-pink-50 px-2 py-0.5 text-[11px] font-semibold text-pink-700">
                          Total count: {group.totalCount}
                        </span>
                      </td>
                    </tr>
                    {group.sessions.map((entry) => (
                      <tr key={entry.id} className="align-top">
                        <td className="px-2 py-2 text-slate-400">•</td>
                        <td className="px-2 py-2 text-slate-700">{entry.time}</td>
                        <td className="px-2 py-2 font-semibold text-pink-700">{entry.movementCount ?? 0}</td>
                        <td className="px-2 py-2 text-slate-700">{formatLabel(entry.mealSnack)}</td>
                        <td className="px-2 py-2 text-slate-700">
                          {entry.movementTypes.length > 0 ? entry.movementTypes.join(', ') : '—'}
                          {entry.otherMovement ? ` • ${entry.otherMovement}` : ''}
                        </td>
                        <td className="px-2 py-2 text-slate-600">
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 flex-1">{entry.notes || '—'}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(entry.id)}
                              disabled={deletingId === entry.id}
                              className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label="Delete entry"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
