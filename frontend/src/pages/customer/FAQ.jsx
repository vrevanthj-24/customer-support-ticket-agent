import React, { useState, useEffect } from 'react';
import { faqAPI } from '../../services/api';
import { FiSearch, FiChevronDown, FiChevronUp, FiHelpCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function CustomerFAQ() {
  const [faqs, setFaqs] = useState([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewedFaqs, setViewedFaqs] = useState(new Set()); // Track viewed FAQs

  useEffect(() => {
    fetchFAQs();
  }, [search]);

  const fetchFAQs = async () => {
    setLoading(true);
    try {
      const { data } = await faqAPI.getAll({ search });
      setFaqs(data);
    } catch (error) {
      console.error('Failed to fetch FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (id) => {
    const isOpening = open !== id;
    setOpen(prev => prev === id ? null : id);
    
    // If opening the FAQ and haven't viewed it yet, increment view count
    if (isOpening && !viewedFaqs.has(id)) {
      setViewedFaqs(prev => new Set(prev).add(id));
      try {
        // Call API to increment view count
        await faqAPI.incrementView(id);
        // Update local state to show updated view count
        setFaqs(prevFaqs => 
          prevFaqs.map(faq => 
            faq.faq_id === id 
              ? { ...faq, times_used: (faq.times_used || 0) + 1 }
              : faq
          )
        );
      } catch (error) {
        console.error('Failed to increment view count:', error);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Frequently Asked Questions</h1>
        <p className="text-slate-500 mt-1">Find answers to common questions</p>
      </div>

      <div className="relative mb-6">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search FAQs..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Loading...</div>
      ) : faqs.length === 0 ? (
        <div className="text-center py-12">
          <FiHelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">No FAQs found{search ? ` for "${search}"` : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map(f => (
            <div key={f.faq_id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggle(f.faq_id)}
                className="w-full flex items-start justify-between gap-4 p-5 text-left hover:bg-slate-50 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FiHelpCircle className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span className="font-medium text-slate-800 text-sm">{f.question}</span>
                </div>
                {open === f.faq_id ? <FiChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <FiChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
              </button>
              {open === f.faq_id && (
                <div className="px-5 pb-5 pl-14">
                  <p className="text-sm text-slate-600 leading-relaxed">{f.answer}</p>
                  <p className="text-xs text-slate-400 mt-3">📖 Viewed {f.times_used || 0} times</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}