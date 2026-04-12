import { useEffect, useMemo, useState } from 'react';
import { Clock, Copy, Download, Plus, CheckCircle, Settings, Syringe, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

  const insulinTypes = ['fasting', 'breakfast', 'afterLunch', 'afterDinner'];
  const currentState = insulinTypes.reduce((acc, type) => {
    acc[type] = { active: false, dosage: '', action: 'none' };
    return acc;
  }, {});

  const enriched = ordered.map((record) => {
    const typeState = currentState[record.reading_type] || { active: false, dosage: '', action: 'none' };
    let active = typeState.active;
    let dosage = typeState.dosage;
    let action = typeState.action;

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
      currentState[record.reading_type] = { active, dosage, action };
    }

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

const buildChartData = (records) => {
  const readingTypes = ['fasting', 'breakfast', 'afterLunch', 'afterDinner'];
  const sortedRecords = [...records]
    .filter((record) => {
      const type = record.reading_type;
      const value = Number(record.reading_value);
      return Number.isFinite(value) && readingTypes.includes(type);
    })
    .sort((a, b) => new Date(a.record_date) - new Date(b.record_date));

  const totals = {
    fasting: 0,
    breakfast: 0,
    afterLunch: 0,
    afterDinner: 0,
  };
  const counts = {
    fasting: 0,
    breakfast: 0,
    afterLunch: 0,
    afterDinner: 0,
  };
  const lastValues = {
    fasting: null,
    breakfast: null,
    afterLunch: null,
    afterDinner: null,
  };

  const dateGroups = sortedRecords.reduce((acc, record) => {
    const dateKey = record.record_date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(record);
    return acc;
  }, {});

  return Object.keys(dateGroups)
    .sort((a, b) => new Date(a) - new Date(b))
    .map((dateKey) => {
      dateGroups[dateKey].forEach((record) => {
        const readingType = record.reading_type;
        const value = Number(record.reading_value);
        totals[readingType] += value;
        counts[readingType] += 1;
      });

      const item = { date: formatDate(dateKey) };
      readingTypes.forEach((type) => {
        if (counts[type] > 0) {
          lastValues[type] = Number((totals[type] / counts[type]).toFixed(1));
        }
        item[type] = lastValues[type];
      });

      return item;
    });
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
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyRange, setCopyRange] = useState('7');
  const [selectedReadingTypes, setSelectedReadingTypes] = useState(['fasting', 'breakfast', 'afterLunch', 'afterDinner']);
  const [selectedMealTypes, setSelectedMealTypes] = useState(['fasting', 'breakfast', 'afterLunch', 'afterDinner']);
  const [displayOptions, setDisplayOptions] = useState({
    date: true,
    patientName: false,
    deleteIcon: false,
    time: true,
    needleMark: false,
    insulinMark: true,
    fastingMeal: true,
    breakfastMeal: true,
    lunchMeal: true,
    dinnerMeal: true,
  });
  const [showDisplayOptions, setShowDisplayOptions] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
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

  const toggleSelection = (current, setter, value) => {
    if (current.includes(value)) {
      setter(current.filter((item) => item !== value));
    } else {
      setter([...current, value]);
    }
  };

  const toggleDisplayOption = (option) => {
    setDisplayOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }));
  };

  const mealOptionKey = (type) => {
    if (type === 'fasting') return 'fastingMeal';
    if (type === 'breakfast') return 'breakfastMeal';
    if (type === 'afterLunch') return 'lunchMeal';
    return 'dinnerMeal';
  };

  const getShareText = () => {
    const days = Number(copyRange);
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days + 1);

    const filtered = allRecords
      .filter((record) => new Date(record.record_date) >= threshold)
      .sort((a, b) => new Date(a.record_date) - new Date(b.record_date) || a.id - b.id);

    if (!filtered.length) {
      return `No readings found in the last ${copyRange} days.`;
    }

    const groups = new Map();
    filtered.forEach((record) => {
      const key = `${record.record_date}||${record.patient_name}`;
      if (!groups.has(key)) {
        groups.set(key, {
          record_date: record.record_date,
          patient_name: record.patient_name,
          entries: [],
        });
      }
      groups.get(key).entries.push(record);
    });

    const lines = [`Diabetes summary — last ${copyRange} days:`];
    groups.forEach((group) => {
      const headerParts = [];
      if (displayOptions.date) headerParts.push(formatDate(group.record_date));
      if (displayOptions.patientName) headerParts.push(group.patient_name);
      lines.push(`\n${headerParts.length ? headerParts.join(' — ') : 'Record'}`);

      const entryByType = {};
      group.entries.forEach((entry) => {
        entryByType[entry.reading_type] = entry;
      });

      ['fasting', 'breakfast', 'afterLunch', 'afterDinner'].forEach((type) => {
        const label = readingLabels[type];
        const entry = entryByType[type];
        if (selectedReadingTypes.includes(type) && entry) {
          const timeText = displayOptions.time && entry.reading_time ? ` at ${entry.reading_time || 'N/A'}` : '';
          const insulinText = displayOptions.insulinMark && entry.insulin_action ? `, insulin ${entry.insulin_action}${entry.insulin_dosage ? ` ${entry.insulin_dosage}` : ''}` : '';
          const needleText = displayOptions.needleMark && entry.needle_changed ? ', needle changed' : '';
          lines.push(`  ${label}: ${entry.reading_value} mg/dL${timeText}${insulinText}${needleText}`);
        }
        const mealKey = mealOptionKey(type);
        if (displayOptions[mealKey] && selectedMealTypes.includes(type) && entry && entry.notes) {
          lines.push(`  ${label} meal notes: ${entry.notes}`);
        }
      });
    });

    return lines.join('\n');
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('Copied to clipboard');
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopyStatus('Copied to clipboard');
    }
  };

  const handleCopySummary = async () => {
    const text = getShareText();
    await copyToClipboard(text);
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
      .sort((a, b) => parseRecordDateTime(b) - parseRecordDateTime(a));
    return sorted[0] || null;
  }, [allRecords]);

  const readingsSinceNeedleChange = useMemo(() => {
    if (!latestNeedleChange) return allRecords.length;
    const latestChangeTime = parseRecordDateTime(latestNeedleChange);
    const recentReadings = allRecords.filter((record) => parseRecordDateTime(record) >= latestChangeTime);
    return recentReadings.length;
  }, [allRecords, latestNeedleChange]);

  const needleStatus = useMemo(() => {
    if (!allRecords.length) return { label: 'No readings yet', warning: false };
    if (!latestNeedleChange) {
      return { label: `Needle change not tracked yet. ${allRecords.length} readings recorded.`, warning: allRecords.length >= 8 };
    }
    const remaining = Math.max(0, 10 - readingsSinceNeedleChange);
    if (remaining === 0) {
      return { label: `Needle change due now (${readingsSinceNeedleChange} readings recorded). Replace the needle.`, warning: true };
    }
    return { label: `Since last needle change: ${readingsSinceNeedleChange}. Reading(s) until next recommended change: ${remaining}.`, warning: false };
  }, [allRecords.length, latestNeedleChange, readingsSinceNeedleChange]);

  const latestInsulin = useMemo(() => {
    const sorted = [...allRecords]
      .filter((record) => record.insulin_action && record.insulin_action !== 'none')
      .sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
    return sorted[0] || null;
  }, [allRecords]);

  const chartData = useMemo(() => {
    const filtered = [...allRecords].filter((record) => {
      const recordDate = new Date(record.record_date);
      let startDate = null;
      let endDate = null;

      if (period === 'week') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 8);
        endDate = new Date();
      } else if (period === 'month') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        endDate = new Date();
      } else if (period === 'custom') {
        startDate = customStart ? new Date(customStart) : null;
        endDate = customEnd ? new Date(customEnd) : null;
      }

      if (patientFilter) {
        const term = patientFilter.toLowerCase().trim();
        if (!record.patient_name.toLowerCase().includes(term)) return false;
      }

      if (startDate && recordDate < startDate) return false;
      if (endDate && recordDate > endDate) return false;
      return true;
    });
    return buildChartData(filtered);
  }, [allRecords, period, customStart, customEnd, patientFilter]);

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
        <span className="min-w-[90px] text-slate-500">
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
          {displayOptions.deleteIcon ? (
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
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1 text-[11px] text-slate-500">
          {displayOptions.time && record.reading_time ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm">
              <Clock size={12} />
              {record.reading_time}
            </span>
          ) : null}
          {displayOptions.insulinMark && (record.insulin_dosage || record.insulin_active) ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm">
              <Syringe size={12} />
              {record.insulin_dosage || `${record.insulin_active_dosage || 'active'}`}
            </span>
          ) : null}
          {displayOptions.needleMark && record.needle_changed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
              <CheckCircle size={12} />
            </span>
          ) : null}
        </div>
      </div>
    );
  };

  const renderMealCell = (record) => (
    <div className="max-w-30 text-sm text-slate-600">
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
            <div key={key} className={`rounded-3xl p-4 bg-slate-50`}>
              <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
              <p className={`mt-3 text-xl font-semibold bg-slate-50 ${readingVariantClass(stat.average, key)}`}>{stat.average}</p>
              <p className="mt-2 text-xs text-slate-500">Low: {stat.low} · High: {stat.high}</p>
            </div>
          );
        })}
      </div>
      <div className="">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Average readings chart</h3>
            <p className="text-sm text-slate-500">Shows average reading value across all types for the selected timeframe.</p>
          </div>
        </div>
        <div className="mt-4 h-72">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis domain={[80, 'auto']} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => [`${value} mg/dL`, 'Average']} />
                <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="fasting" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name="Fasting" />
                <Line type="monotone" dataKey="breakfast" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="Breakfast" />
                <Line type="monotone" dataKey="afterLunch" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="After lunch" />
                <Line type="monotone" dataKey="afterDinner" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="After dinner" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">No chart data available for the selected timeframe.</div>
          )}
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Records</h3>
            <p className="text-sm text-slate-500">Showing {records.length} readings for the selected filters.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setCopyModalOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
              <Copy size={16} />
              Share
            </button>
            <button type="button" onClick={() => setShowDisplayOptions(true)} className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
              <Settings size={16} />
              Columns
            </button>
            <button type="button" onClick={() => { setPeriod('all'); setCustomStart(''); setCustomEnd(''); setPatientFilter(''); setRecordTypeFilter(''); }} className="rounded-full border border-slate-300 bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200 transition">Reset filters</button>
          </div>
        </div>
        {copyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl overflow-y-auto max-h-[85vh]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Share selected readings</h3>
                  <p className="text-sm text-slate-500">Choose the range, readings and meal notes to copy.</p>
                </div>
                <button type="button" onClick={() => setCopyModalOpen(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-900">Close</button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Date range</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['3', '7', '15', '30'].map((value) => (
                      <button key={value} type="button" onClick={() => setCopyRange(value)} className={`rounded-full border px-3 py-2 text-sm ${copyRange === value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-600'}`}>
                        Last {value}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Reading types</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 grid-cols-3">
                    {Object.entries(readingLabels).map(([key, label]) => (
                      <label key={key} className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={selectedReadingTypes.includes(key)} onChange={() => toggleSelection(selectedReadingTypes, setSelectedReadingTypes, key)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-800">Meal notes</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 grid-cols-3">
                  {Object.entries(readingLabels).map(([key, label]) => (
                    <label key={key} className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={selectedMealTypes.includes(key)} onChange={() => toggleSelection(selectedMealTypes, setSelectedMealTypes, key)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500">{copyStatus}</div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => setCopyModalOpen(false)} className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button>
                  <button type="button" onClick={handleCopySummary} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">Copy summary</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showDisplayOptions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl overflow-y-auto max-h-[85vh]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Table display options</h3>
                  <p className="text-sm text-slate-500">Choose what shows in the records table and share output.</p>
                </div>
                <button type="button" onClick={() => setShowDisplayOptions(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-900">Close</button>
              </div>
              <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-2">
                {[
                  { key: 'date', label: 'Date' },
                  { key: 'patientName', label: 'Patient name' },
                  { key: 'time', label: 'Time' },
                  { key: 'needleMark', label: 'Needle mark' },
                  { key: 'insulinMark', label: 'Insulin mark' },
                  { key: 'deleteIcon', label: 'Delete icon' },
                  { key: 'fastingMeal', label: 'Fasting meal' },
                  { key: 'breakfastMeal', label: 'Breakfast meal' },
                  { key: 'lunchMeal', label: 'Lunch meal' },
                  { key: 'dinnerMeal', label: 'Dinner meal' },
                ].map((option) => (
                  <label key={option.key} className="inline-flex items-center gap-2 px-2 py-2 text-sm text-slate-700">
                    <input type="checkbox" checked={displayOptions[option.key]} onChange={() => toggleDisplayOption(option.key)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                    {option.label}
                  </label>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={() => setShowDisplayOptions(false)} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">Done</button>
              </div>
            </div>
          </div>
        )}
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-slate-500">Loading readings...</div>
        ) : records.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-slate-500">No readings found for this period.</div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm" style={{ maxWidth: '80vw' }}>
            <table className="min-w-max border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
                  {(displayOptions.date || displayOptions.patientName) && (
                    <th className="px-3 py-2">Date / Patient</th>
                  )}
                  <th className="px-3 py-2">Fasting</th>
                  {displayOptions.fastingMeal && (
                    <th className="px-3 py-2">Last night meal</th>
                  )}
                  <th className="px-3 py-2">Breakfast</th>
                  {displayOptions.breakfastMeal && (
                    <th className="px-3 py-2">Meal</th>
                  )}
                  <th className="px-3 py-2">Lunch</th>
                  {displayOptions.lunchMeal && (
                    <th className="px-3 py-2">Meal</th>
                  )}
                  <th className="px-3 py-2">Dinner</th>
                  {displayOptions.dinnerMeal && (
                    <th className="px-3 py-2">Meal</th>
                  )}
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
                      {(displayOptions.date || displayOptions.patientName) && (
                        <td className="px-3 py-3 align-top">
                          {displayOptions.date && (
                            <p className="font-semibold text-slate-900">{formatDate(group.record_date)}</p>
                          )}
                          {displayOptions.patientName && (
                            <p className="text-xs text-slate-500">{group.patient_name}</p>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-3 align-top">{renderReadingCell(fasting)}</td>
                      {displayOptions.fastingMeal && (
                        <td className="px-3 py-3 align-top">{renderMealCell(fasting)}</td>
                      )}
                      <td className="px-3 py-3 align-top">{renderReadingCell(breakfast)}</td>
                      {displayOptions.breakfastMeal && (
                        <td className="px-3 py-3 align-top">{renderMealCell(breakfast)}</td>
                      )}
                      <td className="px-3 py-3 align-top">{renderReadingCell(lunch)}</td>
                      {displayOptions.lunchMeal && (
                        <td className="px-3 py-3 align-top">{renderMealCell(lunch)}</td>
                      )}
                      <td className="px-3 py-3 align-top">{renderReadingCell(dinner)}</td>
                      {displayOptions.dinnerMeal && (
                        <td className="px-3 py-3 align-top">{renderMealCell(dinner)}</td>
                      )}
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
