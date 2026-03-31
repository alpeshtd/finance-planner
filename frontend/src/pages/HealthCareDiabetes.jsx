import { useEffect, useMemo, useState } from 'react';
import { Clock, Download, Plus, CheckCircle, Syringe, Trash2 } from 'lucide-react';
import { generateDiabetesReportPdf } from '../utils/diabetesPdf';
import { healthCareServices } from '../services/healthCareServices';

const readingLabels = {
  fasting: 'Fasting',
  breakfast: 'Breakfast',
  afterLunch: 'After lunch',
  afterDinner: 'After dinner',
};

const insulinActions = [
  { value: 'none', label: 'No change' },
  { value: 'started', label: 'Started insulin' },
  { value: 'adjusted', label: 'Adjusted dose' },
  { value: 'stopped', label: 'Stopped insulin' },
];

const readingVariantClass = (value, type) => {
  const num = Number(value);
  if (!value || Number.isNaN(num)) return 'bg-slate-100 text-slate-700';
  if (type === 'fasting') {
    if (num < 90) return 'bg-emerald-100 text-emerald-700';
    if (num <= 110) return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
  }
  if (num < 120) return 'bg-emerald-100 text-emerald-700';
  if (num <= 140) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
};

const parseRecordDateTime = (record) => {
  const time = record.reading_time || '00:00';
  return new Date(`${record.record_date}T${time}`);
};

const applyInsulinFlow = (records) => {
  const ordered = [...records].sort((a, b) => {
    const aDate = parseRecordDateTime(a);
    const bDate = parseRecordDateTime(b);
    if (aDate < bDate) return -1;
    if (aDate > bDate) return 1;
    return a.id - b.id;
  });

  let currentState = { active: false, dosage: '', action: 'none' };
  const enriched = ordered.map((record) => {
    let active = currentState.active;
    let dosage = currentState.dosage;
    let action = currentState.action;

    if (record.insulin_action && record.insulin_action !== 'none') {
      if (record.insulin_action === 'started' || record.insulin_action === 'adjusted') {
        active = true;
        dosage = record.insulin_dosage || dosage;
        action = record.insulin_action;
      } else if (record.insulin_action === 'stopped') {
        active = false;
        dosage = '';
        action = record.insulin_action;
      }
    }

    currentState = { active, dosage, action };

    return {
      ...record,
      insulin_active: active,
      insulin_active_dosage: dosage,
      insulin_state_action: action,
    };
  });

  return enriched.sort((a, b) => {
    const aDate = parseRecordDateTime(a);
    const bDate = parseRecordDateTime(b);
    if (aDate < bDate) return 1;
    if (aDate > bDate) return -1;
    return b.id - a.id;
  });
};

const buildStats = (records, field) => {
  const values = records
    .map((record) => Number(record[field]))
    .filter((value) => Number.isFinite(value));

  if (!values.length) {
    return { average: '-', low: '-', high: '-' };
  }

  const sum = values.reduce((acc, value) => acc + value, 0);
  return {
    average: (sum / values.length).toFixed(1),
    low: Math.min(...values),
    high: Math.max(...values),
  };
};

export default function HealthCareDiabetes() {
  const [records, setRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10));
  const [readingType, setReadingType] = useState('fasting');
  const [readingValue, setReadingValue] = useState('');
  const [readingTime, setReadingTime] = useState('08:00');
  const [readingNotes, setReadingNotes] = useState('');
  const [insulinAction, setInsulinAction] = useState('none');
  const [insulinDosage, setInsulinDosage] = useState('');
  const [needleChanged, setNeedleChanged] = useState(false);
  const [period, setPeriod] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [patientFilter, setPatientFilter] = useState('');
  const [recordTypeFilter, setRecordTypeFilter] = useState('');

  const loadAllRecords = async () => {
    try {
      const data = await healthCareServices.getDiabetesRecords({ period: 'all' });
      setAllRecords(data);
    } catch (error) {
      console.error('Failed to load overall diabetes records:', error);
    }
  };

  const loadRecords = async () => {
    setLoading(true);
    try {
      const response = await healthCareServices.getDiabetesRecords({
        period,
        startDate: customStart || undefined,
        endDate: customEnd || undefined,
        patientName: patientFilter || undefined,
        readingType: recordTypeFilter || undefined,
      });
      setRecords(response);
    } catch (error) {
      console.error('Failed to load diabetes records:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllRecords();
    loadRecords();
  }, []);

  useEffect(() => {
    if (period !== 'custom' || (customStart && customEnd)) {
      loadRecords();
    }
  }, [period, customStart, customEnd, patientFilter, recordTypeFilter]);

  const resetForm = () => {
    setPatientName('');
    setRecordDate(new Date().toISOString().slice(0, 10));
    setReadingType('fasting');
    setReadingValue('');
    setReadingTime('08:00');
    setReadingNotes('');
    setInsulinAction('none');
    setInsulinDosage('');
    setNeedleChanged(false);
  };

  const handleAddRecord = async (event) => {
    event.preventDefault();

    if (!patientName.trim()) {
      alert('Please enter patient name.');
      return;
    }

    if (!readingValue.trim()) {
      alert('Please enter a reading value.');
      return;
    }

    try {
      await healthCareServices.addDiabetesRecord({
        patient_name: patientName.trim(),
        record_date: recordDate,
        reading_type: readingType,
        reading_value: Number(readingValue),
        reading_time: readingTime,
        notes: readingNotes.trim() || undefined,
        insulin_action: insulinAction === 'none' ? undefined : insulinAction,
        insulin_dosage: insulinDosage.trim() || undefined,
        needle_changed: needleChanged,
      });
      await loadAllRecords();
      await loadRecords();
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Could not save diabetes record:', error);
      alert(`Could not save the record. ${error.response?.data?.detail || error.message || ''}`);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('Delete this reading?')) {
      return;
    }
    try {
      await healthCareServices.deleteDiabetesRecord(recordId);
      await loadAllRecords();
      await loadRecords();
    } catch (error) {
      console.error('Could not delete the reading:', error);
      alert('Unable to delete reading. Please try again.');
    }
  };

  const handleDownloadPdf = () => {
    generateDiabetesReportPdf({
      records,
      period,
      customStart,
      customEnd,
      patientFilter,
      recordTypeFilter,
      selectedStats,
    });
  };

  const selectedStats = useMemo(() => ({
    fasting: buildStats(records.filter((record) => record.reading_type === 'fasting'), 'reading_value'),
    breakfast: buildStats(records.filter((record) => record.reading_type === 'breakfast'), 'reading_value'),
    afterLunch: buildStats(records.filter((record) => record.reading_type === 'afterLunch'), 'reading_value'),
    afterDinner: buildStats(records.filter((record) => record.reading_type === 'afterDinner'), 'reading_value'),
  }), [records]);

  const overallStats = useMemo(() => ({
    fasting: buildStats(allRecords.filter((record) => record.reading_type === 'fasting'), 'reading_value'),
    breakfast: buildStats(allRecords.filter((record) => record.reading_type === 'breakfast'), 'reading_value'),
    afterLunch: buildStats(allRecords.filter((record) => record.reading_type === 'afterLunch'), 'reading_value'),
    afterDinner: buildStats(allRecords.filter((record) => record.reading_type === 'afterDinner'), 'reading_value'),
  }), [allRecords]);

  const latestNeedleChange = useMemo(() => {
    const sorted = [...allRecords]
      .filter((record) => record.needle_changed)
      .sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
    return sorted[0] || null;
  }, [allRecords]);

  const readingsSinceNeedleChange = useMemo(() => {
    if (!latestNeedleChange) return allRecords.length;
    return allRecords.filter((record) => new Date(record.record_date) > new Date(latestNeedleChange.record_date)).length;
  }, [allRecords, latestNeedleChange]);

  const needleStatus = useMemo(() => {
    if (!allRecords.length) return { label: 'No readings yet', warning: false };
    if (!latestNeedleChange) {
      return { label: `Needle change not tracked yet. ${allRecords.length} readings recorded.`, warning: allRecords.length >= 8 };
    }
    const remaining = Math.max(0, 8 - readingsSinceNeedleChange);
    if (remaining === 0) {
      return { label: 'Needle change due now. Replace the needle.', warning: true };
    }
    return { label: `Since last needle change: ${readingsSinceNeedleChange}. ${remaining} reading(s) until next recommended change.`, warning: false };
  }, [allRecords.length, latestNeedleChange, readingsSinceNeedleChange]);

  const latestInsulin = useMemo(() => {
    const sorted = [...allRecords]
      .filter((record) => record.insulin_action && record.insulin_action !== 'none')
      .sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
    return sorted[0] || null;
  }, [allRecords]);

  const recordsWithInsulinState = useMemo(() => applyInsulinFlow(records), [records]);

  const groupedRecords = useMemo(() => {
    const groups = new Map();

    recordsWithInsulinState.forEach((record) => {
      const key = `${record.record_date}||${record.patient_name}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          record_date: record.record_date,
          patient_name: record.patient_name,
          entries: [],
        });
      }
      groups.get(key).entries.push(record);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        entries: group.entries.sort((a, b) => parseRecordDateTime(a) - parseRecordDateTime(b)),
      }))
      .sort((a, b) => {
        if (a.record_date > b.record_date) return -1;
        if (a.record_date < b.record_date) return 1;
        return a.patient_name.localeCompare(b.patient_name);
      });
  }, [recordsWithInsulinState]);

  const renderReadingCell = (record) => {
    if (!record) {
      return (
        <span className="inline-flex min-w-[90px] items-center justify-center rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
          —
        </span>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${readingVariantClass(record.reading_value, record.reading_type)}`}>
            <span>{record.reading_value}</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteRecord(record.id);
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
            aria-label="Delete reading"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1 text-[11px] text-slate-500">
          {record.reading_time ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm">
              <Clock size={12} />
              {record.reading_time}
            </span>
          ) : null}
          {(record.insulin_dosage || record.insulin_active) ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm">
              <Syringe size={12} />
              {record.insulin_dosage || `${record.insulin_active_dosage || 'active'}`}
            </span>
          ) : null}
          {record.needle_changed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
              <CheckCircle size={12} />
            </span>
          ) : null}
        </div>
      </div>
    );
  };

  const renderMealCell = (record) => (
    <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
      {record?.notes ? record.notes : '-'}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Diabetes Records</h2>
          <p className="text-gray-500 text-sm">Record one glucose reading at a time with meal notes, insulin changes and needle tracking.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setShowForm((prev) => !prev)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">
            <Plus size={16} />
            {showForm ? 'Hide entry' : 'Add reading'}
          </button>
          <button type="button" onClick={handleDownloadPdf} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            <Download size={16} />
            Download PDF
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAddRecord} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Patient</span>
              <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Patient name" required />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Date</span>
              <input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" required />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Reading type</span>
              <select value={readingType} onChange={(e) => setReadingType(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100">
                {Object.entries(readingLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Reading value</span>
              <input type="number" min="0" step="any" value={readingValue} onChange={(e) => setReadingValue(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="mg/dL" required />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Time</span>
              <input type="time" value={readingTime} onChange={(e) => setReadingTime(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <input type="checkbox" checked={needleChanged} onChange={(e) => setNeedleChanged(e.target.checked)} className="h-4 w-4 rounded border-slate-400 text-blue-600" />
              Mark needle changed
            </label>
          </div>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Notes</span>
            <textarea value={readingNotes} onChange={(e) => setReadingNotes(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" rows={3} placeholder="Meal notes, symptoms, carbs, medicine changes..." />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Insulin action</span>
              <select value={insulinAction} onChange={(e) => setInsulinAction(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100">
                {insulinActions.map((action) => <option key={action.value} value={action.value}>{action.label}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Insulin dosage / notes</span>
              <input type="text" value={insulinDosage} onChange={(e) => setInsulinDosage(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="e.g. 10 units, 5u before meal" />
            </label>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition">
              <CheckCircle size={16} />
              Save reading
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Selected period</h3>
              <p className="mt-1 text-xs text-slate-500">{period === 'custom' ? `${customStart || 'Start'} — ${customEnd || 'End'}` : period === 'week' ? 'Last 7 days' : period === 'month' ? 'Last 30 days' : 'All records'}</p>
            </div>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100">
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="all">All records</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
          {period === 'custom' && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-medium text-slate-500">From</span>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium text-slate-500">To</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </label>
            </div>
          )}
          <div className="mt-4 space-y-4">
            <label className="space-y-2">
              <span className="text-xs font-medium text-slate-500">Patient filter</span>
              <input type="text" value={patientFilter} onChange={(e) => setPatientFilter(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Search by patient" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium text-slate-500">Reading type</span>
              <select value={recordTypeFilter} onChange={(e) => setRecordTypeFilter(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100">
                <option value="">All types</option>
                {Object.entries(readingLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Needle tracking</h3>
          <p className={`mt-2 text-sm ${needleStatus.warning ? 'text-rose-600' : 'text-slate-600'}`}>{needleStatus.label}</p>
          {latestNeedleChange && <p className="mt-3 text-xs text-slate-500">Last needle change: {formatDate(latestNeedleChange.record_date)}</p>}
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Insulin status</h3>
          {latestInsulin ? (
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>{readingLabels[latestInsulin.reading_type] || latestInsulin.reading_type} reading on {formatDate(latestInsulin.record_date)}</p>
              <p>Action: {latestInsulin.insulin_action}</p>
              <p>Dosage: {latestInsulin.insulin_dosage || 'Not specified'}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No insulin updates recorded yet.</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {['fasting','breakfast','afterLunch','afterDinner'].map((key) => {
          const label = readingLabels[key];
          const stat = key === 'fasting' ? selectedStats.fasting : key === 'breakfast' ? selectedStats.breakfast : key === 'afterLunch' ? selectedStats.afterLunch : selectedStats.afterDinner;
          return (
            <div key={key} className="rounded-3xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-3 text-xl font-semibold text-slate-900">{stat.average}</p>
              <p className="mt-2 text-xs text-slate-500">Low: {stat.low} · High: {stat.high}</p>
            </div>
          );
        })}
      </div>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Records</h3>
            <p className="text-sm text-slate-500">Showing {records.length} readings for the selected filters.</p>
          </div>
          <button type="button" onClick={() => { setPeriod('all'); setCustomStart(''); setCustomEnd(''); setPatientFilter(''); setRecordTypeFilter(''); }} className="rounded-full border border-slate-300 bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200 transition">Reset filters</button>
        </div>
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-slate-500">Loading readings...</div>
        ) : records.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-slate-500">No readings found for this period.</div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm" style={{ maxWidth: '87vw' }}>
            <table className="min-w-max border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Fasting</th>
                  <th className="px-3 py-2">Last night meal</th>
                  <th className="px-3 py-2">Breakfast</th>
                  <th className="px-3 py-2">Meal</th>
                  <th className="px-3 py-2">Lunch</th>
                  <th className="px-3 py-2">Meal</th>
                  <th className="px-3 py-2">Dinner</th>
                  <th className="px-3 py-2">Meal</th>
                </tr>
              </thead>
              <tbody>
                {groupedRecords.map((group) => {
                  const fasting = group.entries.find((entry) => entry.reading_type === 'fasting');
                  const breakfast = group.entries.find((entry) => entry.reading_type === 'breakfast');
                  const lunch = group.entries.find((entry) => entry.reading_type === 'afterLunch');
                  const dinner = group.entries.find((entry) => entry.reading_type === 'afterDinner');

                  return (
                    <tr key={group.key} className="border-t border-slate-200 even:bg-slate-50">
                      <td className="px-3 py-3 align-top">
                        <p className="font-semibold text-slate-900">{formatDate(group.record_date)}</p>
                        <p className="text-xs text-slate-500">{group.patient_name}</p>
                      </td>
                      <td className="px-3 py-3 align-top">{renderReadingCell(fasting)}</td>
                      <td className="px-3 py-3 align-top">{renderMealCell(fasting)}</td>
                      <td className="px-3 py-3 align-top">{renderReadingCell(breakfast)}</td>
                      <td className="px-3 py-3 align-top">{renderMealCell(breakfast)}</td>
                      <td className="px-3 py-3 align-top">{renderReadingCell(lunch)}</td>
                      <td className="px-3 py-3 align-top">{renderMealCell(lunch)}</td>
                      <td className="px-3 py-3 align-top">{renderReadingCell(dinner)}</td>
                      <td className="px-3 py-3 align-top">{renderMealCell(dinner)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
