import React, { useState, useEffect } from 'react';
import { agentAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiPlus, FiToggleLeft, FiToggleRight, FiUsers, FiMail, FiTag, FiTrash2 } from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function AdminAgents() {
  const [agents, setAgents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', department_id: '' });
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // agent to delete

  useEffect(() => {
    fetchAgents();
    fetchDepartments();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data } = await agentAPI.getAll();
      setAgents(data);
    } catch {
      toast.error('Failed to load agents');
    }
    setLoading(false);
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_URL}/categories/departments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setDepartments(data);
        // Set default department_id to first dept
        if (data.length > 0) {
          setForm(p => ({ ...p, department_id: data[0].department_id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      toast.error('Failed to load departments');
    }
  };

  const getDepartmentName = (departmentId) => {
    if (!departmentId) return 'Unassigned';
    const dept = departments.find(d => d.department_id === departmentId);
    return dept ? dept.name : `Dept. #${departmentId}`;
  };

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await agentAPI.create({
        name: form.name,
        email: form.email,
        department_id: parseInt(form.department_id)
      });
      toast.success('Agent created successfully');
      setShowForm(false);
      setForm({ name: '', email: '', department_id: departments[0]?.department_id || '' });
      fetchAgents();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create agent');
    }
    setCreating(false);
  };

  const deleteAgent = async (agent) => {
    setDeletingId(agent.agent_id);
    try {
      await agentAPI.delete(agent.agent_id);
      toast.success(`Agent "${agent.name}" deleted`);
      setConfirmDelete(null);
      fetchAgents();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete agent');
    }
    setDeletingId(null);
  };

  const toggleStatus = async (agent) => {
    const newStatus = agent.status === 'active' ? 'inactive' : 'active';
    try {
      await agentAPI.updateStatus(agent.agent_id, newStatus);
      toast.success(`Agent ${newStatus}`);
      fetchAgents();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const activeCount = agents.filter(a => a.status === 'active').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agent Management</h1>
          <p className="text-slate-500 text-sm mt-1">{activeCount} of {agents.length} agents active</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
          <FiPlus className="w-4 h-4" /> Add Agent
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Agents', value: agents.length, color: 'text-blue-700' },
          { label: 'Active', value: activeCount, color: 'text-green-700' },
          { label: 'Inactive', value: agents.length - activeCount, color: 'text-slate-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-8 text-slate-400">Loading...</div>
        ) : agents.length === 0 ? (
          <div className="col-span-3 text-center py-12 bg-white rounded-2xl border border-slate-200">
            <FiUsers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">No agents yet. Add your first agent.</p>
          </div>
        ) : agents.map(a => (
          <div key={a.agent_id} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
                  {a.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{a.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <FiTag className="w-3 h-3" />
                    {getDepartmentName(a.department_id)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Toggle Status */}
                <button onClick={() => toggleStatus(a)} className="transition-colors">
                  {a.status === 'active'
                    ? <FiToggleRight className="w-7 h-7 text-green-500 hover:text-green-600" />
                    : <FiToggleLeft className="w-7 h-7 text-slate-300 hover:text-slate-400" />}
                </button>
                {/* Delete Button */}
                <button
                  onClick={() => setConfirmDelete(a)}
                  className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                  title="Delete agent">
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <FiMail className="w-3.5 h-3.5" />
              <span className="truncate">{a.email}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {a.status}
              </span>
              <span className="text-xs text-slate-400">Agent #{a.agent_id}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Agent Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-slate-800 text-lg mb-5">Add New Agent</h3>
            <form onSubmit={create} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="John Smith"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="agent@company.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
                <select value={form.department_id} onChange={e => setForm(p => ({ ...p, department_id: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {departments.length === 0 && (
                    <option value="">No departments found</option>
                  )}
                  {departments.map(dept => (
                    <option key={dept.department_id} value={dept.department_id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={creating || departments.length === 0}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold">
                  {creating ? 'Creating...' : 'Create Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <FiTrash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Delete Agent</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              Are you sure you want to delete <strong>{confirmDelete.name}</strong>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={() => deleteAgent(confirmDelete)}
                disabled={deletingId === confirmDelete.agent_id}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold">
                {deletingId === confirmDelete.agent_id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
