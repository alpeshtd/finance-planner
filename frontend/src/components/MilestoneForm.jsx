import React, { useState } from 'react';

export default function MilestoneForm({ categories, onAdd }) {
  const [form, setForm] = useState({ name: '', target: '', deadline: '', cat_id: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onAdd(form);
      setForm({ name: '', target: '', deadline: '', cat_id: '' });
    } catch (err) {
      console.error('Failed to add milestone', err);
      // Optionally show a toast/alert here
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl space-y-4">
      <h3 className="text-lg font-black italic mb-4">Set New Strategic Goal</h3>
      <input
        type="text"
        value={form.name}
        placeholder="Goal Name (e.g. 10 Lac Savings)"
        className="w-full p-4 bg-gray-50 rounded-2xl outline-none border border-transparent focus:border-blue-500"
        onChange={e => setForm({ ...form, name: e.target.value })}
      />
      
      <div className="grid grid-cols-2 gap-4">
        <input
          type="number"
          value={form.target}
          placeholder="Target Amount"
          className="p-4 bg-gray-50 rounded-2xl outline-none"
          onChange={e => setForm({ ...form, target: e.target.value })}
        />
        <input
          type="date"
          value={form.deadline}
          className="p-4 bg-gray-50 rounded-2xl outline-none"
          onChange={e => setForm({ ...form, deadline: e.target.value })}
        />
      </div>

      <select
        value={form.cat_id}
        className="w-full p-4 bg-gray-50 rounded-2xl outline-none"
        onChange={e => setForm({ ...form, cat_id: e.target.value })}
      >
        <option value="">Select Category to Track</option>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <button className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-colors">
        Activate Milestone
      </button>
    </form>
  );
}