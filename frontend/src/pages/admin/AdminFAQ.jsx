import React, { useState, useEffect } from 'react';
import { faqAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiZap, FiSearch, FiHelpCircle, FiEye } from 'react-icons/fi';

export default function AdminFAQ() {
  const [faqs, setFaqs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ question: '', answer: '' });
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => { fetchFAQs(); }, []);

  const fetchFAQs = async () => {
    try {
      const { data } = await faqAPI.getAll();
      setFaqs(data);
    } catch (error) {
      console.error('Failed to fetch FAQs:', error);
      toast.error('Failed to load FAQs');
    }
    setLoading(false);
  };

  const openCreate = () => { setForm({ question: '', answer: '' }); setEditing(null); setModal('create'); };
  const openEdit = (f) => { setForm({ question: f.question, answer: f.answer }); setEditing(f); setModal('edit'); };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'edit') {
        await faqAPI.update(editing.faq_id, form);
        toast.success('FAQ updated');
      } else {
        await faqAPI.create(form);
        toast.success('FAQ created');
      }
      setModal(null);
      fetchFAQs();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save'); }
    setSaving(false);
  };

  const del = async (id) => {
    if (!confirm('Delete this FAQ?')) return;
    try {
      await faqAPI.delete(id);
      toast.success('FAQ deleted');
      fetchFAQs();
    } catch { toast.error('Delete failed'); }
  };

  const bulkGenerate = async () => {
    setBulkLoading(true);
    try {
      const { data } = await faqAPI.bulkGenerate(10);
      toast.success(`Generated ${data.generated?.length || 0} new FAQs from resolved tickets`);
      fetchFAQs();
    } catch { toast.error('Bulk generation failed'); }
    setBulkLoading(false);
  };

  const filtered = faqs.filter(f =>
    f.question.toLowerCase().includes(search.toLowerCase()) ||
    f.answer.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate total views
  const totalViews = faqs.reduce((sum, f) => sum + (f.times_used || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">FAQ Management</h1>
          <p className="text-slate-500 text-sm mt-1">{faqs.length} entries • {totalViews} total views</p>
        </div>
        <div className="flex gap-3">
          <button onClick={bulkGenerate} disabled={bulkLoading}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
            <FiZap className="w-4 h-4" /> {bulkLoading ? 'Generating...' : 'AI Generate'}
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
            <FiPlus className="w-4 h-4" /> Add FAQ
          </button>
        </div>
      </div>

      <div className="relative mb-6">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search FAQs..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FiHelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">No FAQs yet. Create one or use AI to generate from resolved tickets.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            <div className="grid grid-cols-12 px-5 py-3 text-xs font-semibold text-slate-400 uppercase bg-slate-50">
              <div className="col-span-4">Question</div>
              <div className="col-span-5">Answer</div>
              <div className="col-span-2 text-center">Views</div>
              <div className="col-span-1">Actions</div>
            </div>
            {filtered.map(f => (
              <div key={f.faq_id} className="grid grid-cols-12 items-center px-5 py-4 hover:bg-slate-50 transition-all">
                <div className="col-span-4 pr-4">
                  <p className="text-sm font-medium text-slate-800 line-clamp-2">{f.question}</p>
                  {f.created_from_ticket_id && <span className="text-xs text-purple-500 mt-0.5 inline-flex items-center gap-1">🤖 AI Generated</span>}
                </div>
                <div className="col-span-5 pr-4">
                  <p className="text-sm text-slate-500 line-clamp-2">{f.answer}</p>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center justify-center gap-1">
                    <FiEye className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">{f.times_used || 0}</span>
                  </div>
                </div>
                <div className="col-span-1 flex gap-1">
                  <button onClick={() => openEdit(f)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => del(f.faq_id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h3 className="font-bold text-slate-800 text-lg mb-5">{modal === 'create' ? 'Add FAQ' : 'Edit FAQ'}</h3>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Question</label>
                <input required value={form.question} onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
                  placeholder="What is the common question?"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Answer</label>
                <textarea required value={form.answer} onChange={e => setForm(p => ({ ...p, answer: e.target.value }))}
                  placeholder="Provide a helpful answer..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold">
                  {saving ? 'Saving...' : modal === 'create' ? 'Create FAQ' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}