import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ticketAPI, agentAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  FiSend, FiZap, FiInfo, FiAlertTriangle, FiLoader, 
  FiArrowLeft, FiTag, FiCheckCircle, FiTrendingUp, FiCpu,
  FiHelpCircle
} from 'react-icons/fi';

const PRIORITY_INFO = {
  P1: { label: 'Critical', color: 'bg-red-100 text-red-800 border-red-200', desc: 'Immediate attention required - Business impact', icon: '🔴' },
  P2: { label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-200', desc: 'Urgent - Needs quick resolution', icon: '🟠' },
  P3: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', desc: 'Normal priority - Will be addressed in order', icon: '🟡' },
  P4: { label: 'Low', color: 'bg-green-100 text-green-800 border-green-200', desc: 'Low priority - Can wait', icon: '🟢' },
};

const CATEGORY_COLORS = {
  'Technical': 'bg-purple-100 text-purple-800 border-purple-200',
  'Billing': 'bg-blue-100 text-blue-800 border-blue-200',
  'Account': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Feature Request': 'bg-pink-100 text-pink-800 border-pink-200',
  'General': 'bg-gray-100 text-gray-800 border-gray-200',
};

// Business-focused category detection
const detectCategoryFromText = (text) => {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('login') || lowerText.includes('password') || lowerText.includes('account') || 
      lowerText.includes('profile') || lowerText.includes('sign in') || lowerText.includes('cannot access')) {
    return { category: 'Account', subcategory: 'Account Access' };
  }
  if (lowerText.includes('payment') || lowerText.includes('billing') || lowerText.includes('invoice') || 
      lowerText.includes('refund') || lowerText.includes('charge') || lowerText.includes('subscription')) {
    return { category: 'Billing', subcategory: 'Payment Issue' };
  }
  if (lowerText.includes('bug') || lowerText.includes('error') || lowerText.includes('crash') || 
      lowerText.includes('slow') || lowerText.includes('not working') || lowerText.includes('issue')) {
    return { category: 'Technical', subcategory: 'Technical Problem' };
  }
  if (lowerText.includes('feature') || lowerText.includes('suggestion') || lowerText.includes('enhancement') || 
      lowerText.includes('would like') || lowerText.includes('improve') || lowerText.includes('new feature')) {
    return { category: 'Feature Request', subcategory: 'Suggestion' };
  }
  return { category: 'General', subcategory: 'General Inquiry' };
};

// Business-focused priority detection
const detectPriorityFromText = (text) => {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('urgent') || lowerText.includes('critical') || lowerText.includes('emergency') || 
      lowerText.includes('down') || lowerText.includes('outage') || lowerText.includes('data loss') ||
      lowerText.includes('security') || lowerText.includes('can\'t work') || lowerText.includes('business stopped')) {
    return 'P1';
  }
  if (lowerText.includes('error') || lowerText.includes('failed') || lowerText.includes('bug') || 
      lowerText.includes('cannot') || lowerText.includes('issue') || lowerText.includes('problem') ||
      lowerText.includes('not working') || lowerText.includes('broken') || lowerText.includes('stuck')) {
    return 'P2';
  }
  if (lowerText.includes('suggestion') || lowerText.includes('feature') || lowerText.includes('enhancement') ||
      lowerText.includes('how to') || lowerText.includes('question') || lowerText.includes('wondering')) {
    return 'P4';
  }
  return 'P3';
};

export default function CreateTicket() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill;
  const isEscalation = prefill?.is_escalation || !!prefill?.original_ticket_id;

  const [title, setTitle] = useState(prefill?.title || '');
  const [description, setDescription] = useState(prefill?.description || '');
  const [submitting, setSubmitting] = useState(false);
  const [aiCategory, setAiCategory] = useState(null);
  const [aiPriority, setAiPriority] = useState(null);
  const [categorizing, setCategorizing] = useState(false);
  const [categorizeError, setCategorizeError] = useState(false);
  const typingTimeoutRef = useRef(null);
  const [exampleTickets, setExampleTickets] = useState(false);

  // Business example tickets for quick testing
  const businessExamples = [
    {
      title: "Need to update my business name",
      description: "My LLC was registered. Old name 'John's Handyman' needs to be 'Pro Home Services LLC' on invoices."
    },
    {
      title: "Payment was declined",
      description: "My credit card payment failed even though I have sufficient funds. Need to process subscription."
    },
    {
      title: "Can't login to dashboard",
      description: "I keep getting 'Invalid credentials' error. I've reset my password twice but still can't access."
    },
    {
      title: "Add my employee to account",
      description: "Want to add my assistant Sarah to help manage support tickets. She needs access to view and reply."
    },
    {
      title: "Website loading slowly",
      description: "My online store is taking 15-20 seconds to load. Customers are complaining and leaving."
    }
  ];

  // Real-time categorization as user types
  useEffect(() => {
    if (isEscalation) return;
    
    const textToAnalyze = `${title} ${description}`.trim();
    
    // Don't categorize if text is too short
    if (textToAnalyze.length < 10) {
      setAiCategory(null);
      setAiPriority(null);
      setCategorizeError(false);
      return;
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout for debouncing
    typingTimeoutRef.current = setTimeout(() => {
      setCategorizing(true);
      setCategorizeError(false);
      
      try {
        // Detect category and priority locally (fast, no API call)
        const detected = detectCategoryFromText(textToAnalyze);
        const priority = detectPriorityFromText(textToAnalyze);
        
        setAiCategory(detected);
        setAiPriority(priority);
        
      } catch (error) {
        console.error('Categorization failed:', error);
        setCategorizeError(true);
      } finally {
        setCategorizing(false);
      }
    }, 800); // 800ms debounce for better UX
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [title, description, isEscalation]);

  const loadExample = (example) => {
    setTitle(example.title);
    setDescription(example.description);
    setExampleTickets(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Please fill in both title and description');
      return;
    }
    
    setSubmitting(true);
    try {
      const { data: ticket } = await ticketAPI.create({
        title, description,
      });

      toast.success('Ticket submitted! Our team will review your issue.');
      navigate(`/customer/tickets/${ticket.ticket_id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit ticket');
    }
    setSubmitting(false);
  };

  const pi = aiPriority ? PRIORITY_INFO[aiPriority] : null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-bold text-slate-800">
          {isEscalation ? '🔺 Escalate Issue' : 'Submit Support Ticket'}
        </h1>
        <p className="text-slate-500 mt-1">
          {isEscalation
            ? 'Your previous issue details are pre-filled. Add more context if needed.'
            : 'Describe your business issue and our AI will automatically categorize and route it to the right team'}
        </p>
      </div>

      {/* Example Tickets Helper */}
      {!isEscalation && !title && !description && (
        <div className="mb-4">
          <button
            onClick={() => setExampleTickets(!exampleTickets)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <FiHelpCircle className="w-4 h-4" />
            Need inspiration? View example tickets
          </button>
          
          {exampleTickets && (
            <div className="mt-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm font-semibold text-blue-800 mb-3">📋 Common Business Issues:</p>
              <div className="space-y-2">
                {businessExamples.map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadExample(example)}
                    className="w-full text-left p-2 bg-white rounded-lg hover:bg-blue-100 transition text-sm"
                  >
                    <div className="font-medium text-slate-700">{example.title}</div>
                    <div className="text-xs text-slate-500 truncate">{example.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Escalation notice */}
      {isEscalation && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-orange-200 bg-orange-50 mb-4">
          <FiAlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Escalated from previous ticket</p>
            <p className="text-xs text-orange-600 mt-0.5">
              {prefill?.original_ticket_id && `Original Ticket #${prefill.original_ticket_id} — `}
              Your original issue details are pre-filled below.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Need to update my business name"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={isEscalation ? 8 : 6}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your issue in detail..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all"
            />
          </div>

          {/* AI Analysis Card */}
          {(categorizing || aiCategory) && !categorizeError && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 animate-fade-in">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${categorizing ? 'bg-blue-500' : 'bg-green-500'}`}>
                  {categorizing ? (
                    <FiLoader className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <FiCheckCircle className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {categorizing ? 'AI is analyzing your issue...' : 'AI Analysis Complete'}
                  </p>
                  
                  {!categorizing && aiCategory && (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs text-slate-500">Detected Category:</span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${CATEGORY_COLORS[aiCategory.category] || CATEGORY_COLORS['General']}`}>
                          <FiTag className="h-3.5 w-3.5" />
                          {aiCategory.category}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700">
                          {aiCategory.subcategory}
                        </span>
                      </div>
                      
                      {aiPriority && pi && (
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${pi.color}`}>
                          <span>{pi.icon}</span>
                          <span>Priority: {aiPriority} - {pi.label}</span>
                          <span className="text-xs opacity-75">({pi.desc})</span>
                        </div>
                      )}
                      
                      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        <FiCpu className="h-3 w-3" />
                        AI will automatically route this to the right department
                      </p>
                    </div>
                  )}
                  
                  {categorizing && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                      </div>
                      <span className="text-xs text-slate-500">Analyzing your business issue...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {categorizeError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <FiAlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">Analysis Temporarily Unavailable</p>
                  <p className="text-xs text-red-600 mt-1">
                    Your ticket will still be submitted and categorized by our system. Continue typing or submit now.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-xl p-3">
            <FiInfo className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-500" />
            <span>
              {isEscalation
                ? 'A support agent has been notified and will respond shortly.'
                : 'Our AI analyzes your description to suggest the best category and priority for your business issue.'}
            </span>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button 
            type="submit" 
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200"
          >
            {submitting ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiSend className="w-4 h-4" />}
            {submitting ? 'Submitting...' : isEscalation ? 'Submit Escalated Ticket' : 'Submit Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Add CSS animation to your global CSS or component
const style = document.createElement('style');
style.textContent = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
`;
document.head.appendChild(style);