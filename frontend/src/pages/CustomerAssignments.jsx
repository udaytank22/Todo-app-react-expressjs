import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Dropdown from '../components/ui/Dropdown';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import {
    User,
    Plus,
    Trash2,
    AlertCircle,
    Workflow,
    Sparkles,
    Mail,
    Type,
    Edit2
} from 'lucide-react';

const CustomerAssignments = () => {
    const { user } = useAuth();

    // Redirect non-privileged users
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
        return <Navigate to="/" replace />;
    }

    const [rules, setRules] = useState([]);
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isOpen, setIsOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [editingRuleId, setEditingRuleId] = useState(null);

    // Form State
    const [form, setForm] = useState({
        customerName: '',
        customerEmail: '',
        assignedUserId: '',
    });

    const fetchData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const [rulesRes, usersRes] = await Promise.all([
                axios.get('/api/customer-assignments', { headers }),
                axios.get('/api/auth/users', { headers }),
            ]);

            setRules(rulesRes.data);
            setUsers(usersRes.data);
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('Failed to load auto-assignment rules.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = () => {
        setEditingRuleId(null);
        setForm({
            customerName: '',
            customerEmail: '',
            assignedUserId: '',
        });
        setError('');
        setIsOpen(true);
    };

    const handleEditRule = (rule) => {
        setEditingRuleId(rule.id);
        setForm({
            customerName: rule.customerName || '',
            customerEmail: rule.customerEmail || '',
            assignedUserId: rule.assignedUserId || '',
        });
        setError('');
        setIsOpen(true);
    };

    const handleCreateRule = async (e) => {
        e.preventDefault();
        if (!form.customerName.trim() && !form.customerEmail.trim()) {
            setError('Please provide at least a Customer Name or a Customer Email pattern.');
            return;
        }
        if (!form.assignedUserId) {
            setError('Please select an employee to handle these assignments.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const payload = {
                customerName: form.customerName.trim() || null,
                customerEmail: form.customerEmail.trim() || null,
                assignedUserId: form.assignedUserId,
            };

            if (editingRuleId) {
                const response = await axios.put(`/api/customer-assignments/${editingRuleId}`, payload, { headers });
                setRules((prev) => prev.map((r) => r.id === editingRuleId ? response.data : r));
            } else {
                const response = await axios.post('/api/customer-assignments', payload, { headers });
                setRules((prev) => [response.data, ...prev]);
            }

            setIsOpen(false);
            setEditingRuleId(null);
        } catch (err) {
            console.error('Failed to save assignment rule:', err);
            setError(err.response?.data?.error || 'Failed to save auto-assignment rule.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteRule = async (id) => {
        if (!window.confirm('Are you sure you want to delete this auto-assignment rule?')) return;

        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await axios.delete(`/api/customer-assignments/${id}`, { headers });
            setRules((prev) => prev.filter((r) => r.id !== id));
        } catch (err) {
            console.error('Failed to delete assignment rule:', err);
            alert('Error deleting rule: ' + (err.response?.data?.error || err.message));
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="h-8 w-64 skeleton-loader rounded-lg" />
                <div className="h-96 skeleton-loader rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="p-3 space-y-3 font-sans h-[calc(100vh-4rem)] overflow-y-auto">
            {/* Title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-extrabold tracking-wide text-slate-900 flex items-center gap-2">
                        <Workflow className="h-5 w-5 text-sky-400" />
                        <span>Master Auto-Assignment Rules</span>
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                        Map specific customer names or emails to system employees to automatically route incoming email inquiries.
                    </p>
                </div>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={handleOpenModal}
                    icon={<Plus className="h-4 w-4" />}
                    className="self-start sm:self-auto"
                >
                    Add Assignment Rule
                </Button>
            </div>

            {/* Rules list */}
            <Card className="p-0 border-black/5 overflow-hidden">
                <div className="overflow-x-auto w-full">
                    <table className="min-w-full text-left border-collapse">
                        <thead className="bg-white/80 border-b border-black/5 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-1.5">Customer Name Pattern</th>
                                <th className="px-4 py-1.5">Customer Email Pattern</th>
                                <th className="px-4 py-1.5">Assigned Employee</th>
                                <th className="px-4 py-1.5 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 text-sm">
                            {rules.map((rule) => (
                                <tr key={rule.id} className="table-row-hover text-slate-700">
                                    <td className="px-4 py-2 font-semibold text-slate-900 max-w-xs truncate">
                                        {rule.customerName ? (
                                            <span className="flex items-center gap-2">
                                                <Type className="h-4 w-4 text-sky-400/80" />
                                                {rule.customerName}
                                            </span>
                                        ) : (
                                            <span className="text-slate-500 italic text-xs">Matches any name</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">
                                        {rule.customerEmail ? (
                                            <span className="flex items-center gap-2 font-sans text-xs">
                                                <Mail className="h-4 w-4 text-sky-400/80" />
                                                {rule.customerEmail}
                                            </span>
                                        ) : (
                                            <span className="text-slate-500 italic text-xs">Matches any email</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="bg-sky-500/10 p-1.5 rounded-lg border border-sky-500/15 text-sky-400 text-xs flex items-center justify-center">
                                                <User className="h-3.5 w-3.5" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800 text-xs">
                                                    {rule.assignedUser ? rule.assignedUser.name : 'Unknown Handler'}
                                                </p>
                                                <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                                                    {rule.assignedUser ? rule.assignedUser.email : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleEditRule(rule)}
                                                className="p-1.5 rounded-lg border border-black/5 hover:bg-sky-500/10 text-slate-500 hover:text-sky-500 transition-colors"
                                                title="Edit assignment rule"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRule(rule.id)}
                                                className="p-1.5 rounded-lg border border-black/5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                                                title="Delete assignment rule"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {rules.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-4 py-12 text-center text-slate-500 text-sm">
                                        <div className="flex flex-col items-center justify-center gap-2.5">
                                            <Workflow className="h-8 w-8 text-slate-600" />
                                            <span>No auto-assignment rules defined yet.</span>
                                            <p className="text-xs text-slate-600 max-w-sm">
                                                Create rules to automatically route new emails to dedicated personnel. Unmapped emails will remain unassigned.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Creation Modal */}
            {isOpen && (
                <Modal
                    isOpen={isOpen}
                    onClose={() => {
                        setIsOpen(false);
                        setEditingRuleId(null);
                    }}
                    title={editingRuleId ? "Edit Auto-Assignment Rule" : "Create Auto-Assignment Rule"}
                    size="md"
                    footer={
                        <div className="flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => {
                                setIsOpen(false);
                                setEditingRuleId(null);
                            }}>
                                Cancel
                            </Button>
                            <Button type="submit" form="assignment-rule-form" variant="primary" isLoading={submitting}>
                                {editingRuleId ? "Update Rule" : "Save Rule"}
                            </Button>
                        </div>
                    }
                >
                    <form id="assignment-rule-form" onSubmit={handleCreateRule} className="space-y-5">
                        {error && (
                            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
                                <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="flex items-start gap-2.5 bg-sky-500/5 border border-sky-500/10 p-4 rounded-xl text-sky-400 text-[11px] leading-relaxed">
                            <Sparkles className="h-4.5 w-4.5 text-sky-400 flex-shrink-0 mt-0.5" />
                            <p>
                                Specify the customer's exact email address (exact match) and/or name keyword (case-insensitive substring match).
                                Incoming inquiries that match these parameters will be instantly assigned to the designated employee.
                            </p>
                        </div>

                        <Input
                            label="Customer Name Pattern (e.g. Acme Corp)"
                            value={form.customerName}
                            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                            placeholder="Case-insensitive name search query"
                        />

                        <Input
                            label="Customer Email Pattern (e.g. billing@acme.com)"
                            type="email"
                            value={form.customerEmail}
                            onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                            placeholder="Exact sender email address"
                        />

                        <Dropdown
                            label="Assigned System User / Staff"
                            value={form.assignedUserId}
                            onChange={(e) => setForm({ ...form, assignedUserId: e.target.value })}
                            required
                            placement="up"
                            options={[
                                { value: '', label: 'Select Employee...' },
                                ...users.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` })),
                            ]}
                        />

                    </form>
                </Modal>
            )}
        </div>
    );
};

export default CustomerAssignments;
