import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, HeartPulse, Sparkles, AlertTriangle } from 'lucide-react';
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

export default function BabyMovements() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(initialForm);

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

  const analytics = useMemo(() => {
    const totalEntries = entries.length;
    const daysWithEntries = new Set(entries.map((entry) => entry.date)).size;
    const averagePerDay = daysWithEntries > 0 ? (totalEntries / daysWithEntries).toFixed(1) : '0.0';

    const hourCounts = Array.from({ length: 24 }, () => 0);
    entries.forEach((entry) => {
      const hour = Number(entry.time.slice(0, 2));
      hourCounts[hour] += 1;
    });

    const peakHour = hourCounts.reduce((best, count, hour) => (count > hourCounts[best] ? hour : best), 0);
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
  }, [entries]);

  const hourValues = Array.from({ length: 24 }, (_, hour) => entries.filter((entry) => Number(entry.time.slice(0, 2)) === hour).length);
  const maxHourValue = Math.max(1, ...hourValues);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-pink-50 px-3 py-1 text-sm font-medium text-pink-700">
          <HeartPulse size={16} />
          Pregnancy movement tracker
        </div>
        <h2 className="text-xl font-semibold text-slate-800">Track baby movement patterns and spot trends early</h2>
        <p className="text-sm text-slate-600">
          Record movement timing, whether a snack or meal came before the activity, and any notes that may be useful for your clinician.
        </p>
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
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                <p className="text-xs text-slate-500">A simple pattern view to spot when movement is more frequent.</p>
              </div>
              <div className="rounded-full bg-pink-50 px-3 py-1 text-xs font-medium text-pink-700">{analytics.totalEntries} entries</div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <div className="flex h-40 min-w-[150px] items-end gap-[1px]">
                {Array.from({ length: 24 }, (_, hour) => {
                  const value = hourValues[hour];
                  const height = value === 0 ? 8 : Math.max(16, Math.round((value / maxHourValue) * 100));
                  return (
                    <div key={hour} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                      <div className="w-full rounded-t-full bg-gradient-to-t from-pink-500 to-amber-300" style={{ height: `${height}%` }} />
                      <span className="text-[10px] text-slate-400">{hour}</span>
                    </div>
                  );
                })}
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
                        <td className="px-2 py-2 text-slate-600">{entry.notes || '—'}</td>
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
