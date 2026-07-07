import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
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
    Edit2,
    Users,
    Shield,
    Search,
    Download,
    Upload,
    BarChart2,
    Link,
    Activity,
    LayoutList,
    Target
} from 'lucide-react';

const ReportsView = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const token = sessionStorage.getItem('token');
                const res = await axios.get('/api/reports/dashboard', {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                setData(res.data);
            } catch (err) {
                console.error('Failed to fetch reports:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="h-48 skeleton-loader rounded-2xl" />
                <div className="h-48 skeleton-loader rounded-2xl" />
            </div>
        );
    }

    if (!data) return <div className="p-6 text-slate-500">Failed to load reports.</div>;

    const renderProgressBar = (value, total, colorClass) => {
        const percentage = total === 0 ? 0 : Math.round((value / total) * 100);
        return (
            <div className="flex items-center gap-3 w-full mt-2">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${percentage}%` }}></div>
                </div>
                <span className="text-xs font-bold text-slate-600 w-8">{percentage}%</span>
            </div>
        );
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-black/5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg"><LayoutList className="h-5 w-5" /></div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Total Tasks</p>
                            <h3 className="text-2xl font-black text-slate-800">{data.totalTasks}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-black/5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-50 text-rose-500 rounded-lg"><AlertCircle className="h-5 w-5" /></div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Unassigned</p>
                            <h3 className="text-2xl font-black text-slate-800">{data.unassignedCount}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-black/5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg"><Activity className="h-5 w-5" /></div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Past 7 Days</p>
                            <h3 className="text-2xl font-black text-slate-800">{data.recentTasks}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-black/5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-sky-50 text-sky-500 rounded-lg"><Target className="h-5 w-5" /></div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Teams Active</p>
                            <h3 className="text-2xl font-black text-slate-800">{data.teamCounts.length}</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Status Breakdown */}
                <div className="bg-white p-5 rounded-xl border border-black/5 shadow-sm">
                    <h4 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-indigo-500" />
                        Tasks by Status
                    </h4>
                    <div className="space-y-4">
                        {data.statusCounts.map(s => (
                            <div key={s.status}>
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-700">{s.status}</span>
                                    <span className="text-slate-500">{s.count}</span>
                                </div>
                                {renderProgressBar(s.count, data.totalTasks, 'bg-indigo-500')}
                            </div>
                        ))}
                        {data.statusCounts.length === 0 && <p className="text-sm text-slate-500">No data available.</p>}
                    </div>
                </div>

                {/* Priority Breakdown */}
                <div className="bg-white p-5 rounded-xl border border-black/5 shadow-sm">
                    <h4 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                        Tasks by Priority
                    </h4>
                    <div className="space-y-4">
                        {data.priorityCounts.map(p => {
                            const colors = {
                                HIGH: 'bg-rose-500',
                                MEDIUM: 'bg-amber-500',
                                LOW: 'bg-emerald-500'
                            };
                            return (
                                <div key={p.priority}>
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-700">{p.priority}</span>
                                        <span className="text-slate-500">{p.count}</span>
                                    </div>
                                    {renderProgressBar(p.count, data.totalTasks, colors[p.priority] || 'bg-slate-400')}
                                </div>
                            );
                        })}
                        {data.priorityCounts.length === 0 && <p className="text-sm text-slate-500">No data available.</p>}
                    </div>
                </div>

                {/* Assignee Breakdown */}
                <div className="bg-white p-5 rounded-xl border border-black/5 shadow-sm">
                    <h4 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                        <User className="h-4 w-4 text-sky-500" />
                        Top Assignees
                    </h4>
                    <div className="space-y-4">
                        {data.userCounts.sort((a, b) => b.count - a.count).slice(0, 5).map(u => (
                            <div key={u.name}>
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-700">{u.name}</span>
                                    <span className="text-slate-500">{u.count}</span>
                                </div>
                                {renderProgressBar(u.count, data.totalTasks, 'bg-sky-500')}
                            </div>
                        ))}
                        {data.userCounts.length === 0 && <p className="text-sm text-slate-500">No data available.</p>}
                    </div>
                </div>

                {/* Team Breakdown */}
                <div className="bg-white p-5 rounded-xl border border-black/5 shadow-sm">
                    <h4 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-500" />
                        Tasks by Team
                    </h4>
                    <div className="space-y-4">
                        {data.teamCounts.sort((a, b) => b.count - a.count).map(t => (
                            <div key={t.name}>
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-700">{t.name}</span>
                                    <span className="text-slate-500">{t.count}</span>
                                </div>
                                {renderProgressBar(t.count, data.totalTasks, 'bg-purple-500')}
                            </div>
                        ))}
                        {data.teamCounts.length === 0 && <p className="text-sm text-slate-500">No data available.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Administration = () => {
    const { user } = useAuth();

    // Redirect non-privileged users
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
        return <Navigate to="/" replace />;
    }

    const [activeTab, setActiveTab] = useState('assignments'); // 'assignments' | 'employees' | 'teams'
    const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
    const [teamSearchQuery, setTeamSearchQuery] = useState('');

    const [rules, setRules] = useState([]);
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isOpen, setIsOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [assigneeType, setAssigneeType] = useState('employee'); // 'employee' | 'team'

    // Form State - Assignments
    const [ruleForm, setRuleForm] = useState({
        customerName: '',
        customerEmail: '',
        assignedUserId: '',
        teamId: '',
    });

    // Form State - Employees
    const [employeeForm, setEmployeeForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'STAFF',
        teamIds: [],
    });

    const [teamForm, setTeamForm] = useState({
        name: ''
    });

    const fetchData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const token = sessionStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const [rulesRes, usersRes, teamsRes] = await Promise.all([
                axios.get('/api/customer-assignments', { headers }),
                axios.get('/api/auth/users', { headers }),
                axios.get('/api/teams', { headers })
            ]);

            setRules(rulesRes.data);
            setUsers(usersRes.data);
            setTeams(teamsRes.data);
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('Failed to load data.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = () => {
        setEditingId(null);
        setError('');
        if (activeTab === 'assignments') {
            setAssigneeType('employee');
            setRuleForm({ customerName: '', customerEmail: '', assignedUserId: '', teamId: '' });
        } else if (activeTab === 'teams') {
            setTeamForm({ name: '' });
        } else {
            // Default to Employee form for 'employees' and 'reports' tabs
            setEmployeeForm({ name: '', email: '', password: '', role: 'STAFF', teamIds: [] });
        }
        setIsOpen(true);
    };

    const handleEditRule = (rule) => {
        setEditingId(rule.id);
        setAssigneeType(rule.teamId ? 'team' : 'employee');
        setRuleForm({
            customerName: rule.customerName || '',
            customerEmail: rule.customerEmail || '',
            assignedUserId: rule.assignedUserId || '',
            teamId: rule.teamId || '',
        });
        setError('');
        setIsOpen(true);
    };

    const handleEditEmployee = (emp) => {
        setEditingId(emp.id);
        setEmployeeForm({
            name: emp.name || '',
            email: emp.email || '',
            password: '', // Leave blank when editing unless changing
            role: emp.role || 'STAFF',
            teamIds: emp.teams?.map(t => t.id) || [],
        });
        setError('');
        setIsOpen(true);
    };

    const handleEditTeam = (team) => {
        setEditingId(team.id);
        setTeamForm({
            name: team.name || '',
        });
        setError('');
        setIsOpen(true);
    };

    const handleSaveRule = async (e) => {
        e.preventDefault();
        if (!ruleForm.customerName.trim() && !ruleForm.customerEmail.trim()) {
            setError('Please provide at least a Customer Name or a Customer Email pattern.');
            return;
        }
        if (!ruleForm.assignedUserId && !ruleForm.teamId) {
            setError('Please select an employee or team to handle these assignments.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const token = sessionStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const payload = {
                customerName: ruleForm.customerName.trim() || null,
                customerEmail: ruleForm.customerEmail.trim() || null,
                assignedUserId: ruleForm.assignedUserId || null,
                teamId: ruleForm.teamId || null,
            };

            if (editingId) {
                const response = await axios.put(`/api/customer-assignments/${editingId}`, payload, { headers });
                setRules((prev) => prev.map((r) => r.id === editingId ? response.data : r));
            } else {
                const response = await axios.post('/api/customer-assignments', payload, { headers });
                setRules((prev) => [response.data, ...prev]);
            }

            setIsOpen(false);
            setEditingId(null);
        } catch (err) {
            console.error('Failed to save assignment rule:', err);
            setError(err.response?.data?.error || 'Failed to save auto-assignment rule.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveEmployee = async (e) => {
        e.preventDefault();
        if (!employeeForm.name.trim() || !employeeForm.email.trim()) {
            setError('Name and Email are required.');
            return;
        }
        if (!editingId && !employeeForm.password) {
            setError('Password is required for new employees.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const token = sessionStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const payload = { ...employeeForm };
            if (editingId && !payload.password) {
                delete payload.password; // Don't send empty password if not changing
            }

            if (editingId) {
                const response = await axios.put(`/api/auth/users/${editingId}`, payload, { headers });
                setUsers((prev) => prev.map((u) => u.id === editingId ? response.data : u));
            } else {
                const response = await axios.post('/api/auth/users', payload, { headers });
                setUsers((prev) => [...prev, response.data].sort((a,b) => a.name.localeCompare(b.name)));
            }

            setIsOpen(false);
            setEditingId(null);
        } catch (err) {
            console.error('Failed to save employee:', err);
            setError(err.response?.data?.error || 'Failed to save employee.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveTeam = async (e) => {
        e.preventDefault();
        if (!teamForm.name.trim()) {
            setError('Team name is required.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const token = sessionStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            if (editingId) {
                const response = await axios.put(`/api/teams/${editingId}`, { name: teamForm.name }, { headers });
                setTeams((prev) => prev.map((t) => t.id === editingId ? response.data : t));
            } else {
                const response = await axios.post('/api/teams', { name: teamForm.name }, { headers });
                setTeams((prev) => [...prev, response.data].sort((a,b) => a.name.localeCompare(b.name)));
            }

            setIsOpen(false);
            setEditingId(null);
            fetchData(); // refresh to sync user team counts if needed
        } catch (err) {
            console.error('Failed to save team:', err);
            setError(err.response?.data?.error || 'Failed to save team.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteRule = async (id) => {
        if (!window.confirm('Are you sure you want to delete this auto-assignment rule?')) return;

        try {
            const token = sessionStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await axios.delete(`/api/customer-assignments/${id}`, { headers });
            setRules((prev) => prev.filter((r) => r.id !== id));
        } catch (err) {
            console.error('Failed to delete assignment rule:', err);
            alert('Error deleting rule: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDeleteEmployee = async (id) => {
        if (!window.confirm('Are you sure you want to delete this employee? Related data might be affected.')) return;

        try {
            const token = sessionStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await axios.delete(`/api/auth/users/${id}`, { headers });
            setUsers((prev) => prev.filter((u) => u.id !== id));
        } catch (err) {
            console.error('Failed to delete employee:', err);
            alert('Error deleting employee: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDeleteTeam = async (id) => {
        if (!window.confirm('Are you sure you want to delete this team? Related data might be affected.')) return;

        try {
            const token = sessionStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await axios.delete(`/api/teams/${id}`, { headers });
            setTeams((prev) => prev.filter((t) => t.id !== id));
            fetchData(); // refresh users
        } catch (err) {
            console.error('Failed to delete team:', err);
            alert('Error deleting team: ' + (err.response?.data?.error || err.message));
        }
    };

    const fileInputRef = useRef(null);

    const handleExport = () => {
        if (activeTab === 'employees') {
            const exportData = users.map(u => ({ Name: u.name, Email: u.email, Role: u.role }));
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Employees");
            XLSX.writeFile(wb, "employees.xlsx");
        } else if (activeTab === 'teams') {
            const exportData = teams.map(t => ({ Name: t.name, Members: t.users?.length || 0 }));
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Teams");
            XLSX.writeFile(wb, "teams.xlsx");
        } else if (activeTab === 'reports' && data) {
            const exportData = data.statusCounts.map(s => ({ Status: s.status, Count: s.count }));
            exportData = [
                ...data.statusCounts.map(s => ({ Category: 'Status', Name: s.status, Count: s.count })),
                ...data.priorityCounts.map(p => ({ Category: 'Priority', Name: p.priority, Count: p.count })),
                ...data.userCounts.map(u => ({ Category: 'Assignee', Name: u.name, Count: u.count })),
                ...data.teamCounts.map(t => ({ Category: 'Team', Name: t.name, Count: t.count }))
            ];
            filename = 'Reports_Data';
        } else {
            exportData = rules.map(r => ({ 
                CustomerName: r.customerName || '', 
                CustomerEmail: r.customerEmail || '', 
                AssignedUserId: r.assignedUserId || '',
                TeamId: r.teamId || ''
            }));
            filename = 'Assignment_Rules';
        }

        if (exportData.length === 0) {
            alert('No data available to export.');
            return;
        }

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, filename);
        XLSX.writeFile(wb, `${filename.toLowerCase()}.xlsx`);
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (activeTab === 'reports') {
            alert('Cannot import data directly into Reports. Please import into Employees, Teams, or Rules.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const importedData = XLSX.utils.sheet_to_json(ws);
                
                const token = sessionStorage.getItem('token');
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                if (activeTab === 'employees') {
                    const mappedUsers = importedData.map(row => ({
                        name: row.Name || row.name,
                        email: row.Email || row.email,
                        role: row.Role || row.role
                    }));
                    await axios.post('/api/auth/users/bulk', { users: mappedUsers }, { headers });
                } else if (activeTab === 'teams') {
                    // Assuming we have a bulk teams endpoint or we just loop
                    for (const row of importedData) {
                        const name = row.Name || row.name;
                        if (name) {
                            await axios.post('/api/teams', { name }, { headers });
                        }
                    }
                } else {
                    const mappedRules = importedData.map(row => ({
                        customerName: row.CustomerName || row.customerName,
                        customerEmail: row.CustomerEmail || row.customerEmail,
                        assignedUserId: row.AssignedUserId || row.assignedUserId,
                        teamId: row.TeamId || row.teamId
                    }));
                    await axios.post('/api/customer-assignments/bulk', { rules: mappedRules }, { headers });
                }
                
                fetchData();
                alert('Import successful!');
            } catch (err) {
                console.error('Import error:', err);
                alert('Failed to import data. Please check file format and missing required fields.');
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
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
        <div className="p-3 space-y-3 font-sans h-[calc(100vh-4rem)] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-extrabold tracking-wide text-slate-900 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-indigo-500" />
                        <span>Settings & Reports</span>
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                        Manage system settings, employees, rules, and view reports.
                    </p>
                </div>
                {activeTab !== 'reports' && (
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <input 
                            type="file" 
                            accept=".xlsx, .xls" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleImport}
                        />
                        <Button
                            variant="secondary"
                            onClick={() => fileInputRef.current?.click()}
                            icon={<Upload className="h-4 w-4" />}
                            title="Import from Excel"
                        >
                            Import
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={handleExport}
                            icon={<Download className="h-4 w-4" />}
                            title="Export to Excel"
                        >
                            Export
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleOpenModal}
                            icon={<Plus className="h-4 w-4" />}
                        >
                            {activeTab === 'assignments' ? 'Add Rule' : (activeTab === 'teams' ? 'Add Team' : 'Add Employee')}
                        </Button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl w-full sm:w-fit border border-slate-200/60 shadow-inner">
                <button
                    onClick={() => setActiveTab('employees')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                        activeTab === 'employees'
                            ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                >
                    <Users className="h-4 w-4" />
                    Employees
                </button>
                <button
                    onClick={() => setActiveTab('teams')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                        activeTab === 'teams'
                            ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                >
                    <Users className="h-4 w-4" />
                    Teams
                </button>
                <button
                    onClick={() => setActiveTab('assignments')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                        activeTab === 'assignments'
                            ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                >
                    <Link className="h-4 w-4" />
                    Assignment Rules
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                        activeTab === 'reports'
                            ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                >
                    <BarChart2 className="h-4 w-4" />
                    Reports
                </button>

            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'reports' ? (
                    <ReportsView />
                ) : activeTab === 'employees' ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 max-w-sm">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search employees by name or email..."
                                    value={employeeSearchQuery}
                                    onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow"
                                />
                            </div>
                        </div>
                        <Card className="p-0 border-black/5 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto w-full">
                            <table className="min-w-full text-left border-collapse">
                                <thead className="bg-slate-50/80 border-b border-black/5 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">Name</th>
                                        <th className="px-6 py-3">Email</th>
                                        <th className="px-6 py-3">Role</th>
                                        <th className="px-6 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 text-sm">
                                    {users.filter(u => 
                                        u.name.toLowerCase().includes(employeeSearchQuery.toLowerCase()) || 
                                        u.email.toLowerCase().includes(employeeSearchQuery.toLowerCase())
                                    ).map((u) => (
                                        <tr key={u.id} className="table-row-hover text-slate-700 bg-white">
                                            <td className="px-6 py-3 font-semibold text-slate-900">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-indigo-100 text-indigo-600 h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-white">
                                                        {u.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    {u.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className="flex items-center gap-2 font-sans text-xs">
                                                    <Mail className="h-4 w-4 text-slate-400" />
                                                    {u.email}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wide
                                                    ${u.role === 'ADMIN' ? 'bg-rose-100 text-rose-700' :
                                                      u.role === 'MANAGER' ? 'bg-amber-100 text-amber-700' :
                                                      'bg-emerald-100 text-emerald-700'}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEditEmployee(u)}
                                                        className="p-1.5 rounded-lg border border-black/5 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition-colors"
                                                        title="Edit employee"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteEmployee(u.id)}
                                                        disabled={user.id === u.id} // Disable deleting self
                                                        className={`p-1.5 rounded-lg border border-black/5 transition-colors ${
                                                            user.id === u.id ? 'opacity-50 cursor-not-allowed text-slate-300' : 'hover:bg-rose-50 text-slate-500 hover:text-rose-500'
                                                        }`}
                                                        title="Delete employee"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-slate-500 text-sm bg-white">
                                                <div className="flex flex-col items-center justify-center gap-2.5">
                                                    <Users className="h-8 w-8 text-slate-400" />
                                                    <span>No employees found.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                    </div>
                ) : activeTab === 'teams' ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 max-w-sm">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search teams by name..."
                                    value={teamSearchQuery}
                                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow"
                                />
                            </div>
                        </div>
                        <Card className="p-0 border-black/5 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto w-full">
                            <table className="min-w-full text-left border-collapse">
                                <thead className="bg-slate-50/80 border-b border-black/5 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">Team Name</th>
                                        <th className="px-6 py-3 text-center">Members</th>
                                        <th className="px-6 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 text-sm">
                                    {teams.filter(t => 
                                        t.name.toLowerCase().includes(teamSearchQuery.toLowerCase())
                                    ).map((t) => (
                                        <tr key={t.id} className="table-row-hover text-slate-700 bg-white">
                                            <td className="px-6 py-3 font-semibold text-slate-900">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-sky-100 text-sky-600 h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-white">
                                                        {t.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    {t.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <span className="inline-flex items-center justify-center bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-semibold">
                                                    {t.users?.length || 0} members
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEditTeam(t)}
                                                        className="p-1.5 rounded-lg border border-black/5 hover:bg-sky-50 text-slate-500 hover:text-sky-600 transition-colors"
                                                        title="Edit team"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTeam(t.id)}
                                                        className="p-1.5 rounded-lg border border-black/5 hover:bg-rose-50 text-slate-500 hover:text-rose-500 transition-colors"
                                                        title="Delete team"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {teams.length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-12 text-center text-slate-500 text-sm bg-white">
                                                <div className="flex flex-col items-center justify-center gap-2.5">
                                                    <Users className="h-8 w-8 text-slate-400" />
                                                    <span>No teams found.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                    </div>
                ) : (
                    <Card className="p-0 border-black/5 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto w-full">
                            <table className="min-w-full text-left border-collapse">
                                <thead className="bg-slate-50/80 border-b border-black/5 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">Customer Name Pattern</th>
                                        <th className="px-6 py-3">Customer Email Pattern</th>
                                        <th className="px-6 py-3">Assigned Employee</th>
                                        <th className="px-6 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 text-sm">
                                    {rules.map((rule) => (
                                        <tr key={rule.id} className="table-row-hover text-slate-700 bg-white">
                                            <td className="px-6 py-3 font-semibold text-slate-900 max-w-xs truncate">
                                                {rule.customerName ? (
                                                    <span className="flex items-center gap-2">
                                                        <Type className="h-4 w-4 text-sky-400/80" />
                                                        {rule.customerName}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic text-xs">Matches any name</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3">
                                                {rule.customerEmail ? (
                                                    <span className="flex items-center gap-2 font-sans text-xs">
                                                        <Mail className="h-4 w-4 text-sky-400/80" />
                                                        {rule.customerEmail}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic text-xs">Matches any email</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-sky-50 text-sky-600 p-1.5 rounded-lg ring-1 ring-sky-100">
                                                        {rule.team ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800 text-sm">
                                                            {rule.team ? rule.team.name : (rule.assignedUser ? rule.assignedUser.name : 'Unknown Handler')}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                                                            {rule.team ? 'Team' : (rule.assignedUser ? rule.assignedUser.email : '')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEditRule(rule)}
                                                        className="p-1.5 rounded-lg border border-black/5 hover:bg-sky-50 text-slate-500 hover:text-sky-600 transition-colors"
                                                        title="Edit assignment rule"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRule(rule.id)}
                                                        className="p-1.5 rounded-lg border border-black/5 hover:bg-rose-50 text-slate-500 hover:text-rose-500 transition-colors"
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
                                            <td colSpan="4" className="px-6 py-12 text-center text-slate-500 text-sm bg-white">
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <div className="bg-slate-100 p-3 rounded-full text-slate-400">
                                                        <Workflow className="h-8 w-8" />
                                                    </div>
                                                    <span className="font-medium text-slate-900">No assignment rules defined</span>
                                                    <p className="text-xs text-slate-500 max-w-sm">
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
                )}
            </div>

            {/* Modal for Creating/Editing */}
            {isOpen && (
                <Modal
                    isOpen={isOpen}
                    onClose={() => {
                        setIsOpen(false);
                        setEditingId(null);
                    }}
                    title={editingId 
                        ? (activeTab === 'assignments' ? "Edit Assignment Rule" : activeTab === 'teams' ? "Edit Team" : "Edit Employee") 
                        : (activeTab === 'assignments' ? "Create Assignment Rule" : activeTab === 'teams' ? "Add Team" : "Add Employee")
                    }
                    size="md"
                    footer={
                        <div className="flex justify-end gap-3 w-full">
                            <Button variant="ghost" onClick={() => {
                                setIsOpen(false);
                                setEditingId(null);
                            }}>
                                Cancel
                            </Button>
                            <Button type="submit" form="admin-form" variant="primary" isLoading={submitting}>
                                {editingId ? "Update" : "Save"}
                            </Button>
                        </div>
                    }
                >
                    <form id="admin-form" onSubmit={activeTab === 'assignments' ? handleSaveRule : activeTab === 'teams' ? handleSaveTeam : handleSaveEmployee} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {activeTab === 'assignments' ? (
                            <>
                                <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100/50 p-4 rounded-xl text-indigo-700 text-sm">
                                    <Sparkles className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                    <p>
                                        Specify the customer's exact email address (exact match) and/or name keyword (case-insensitive substring match).
                                    </p>
                                </div>

                                <Input
                                    label="Customer Name Pattern"
                                    value={ruleForm.customerName}
                                    onChange={(e) => setRuleForm({ ...ruleForm, customerName: e.target.value })}
                                    placeholder="e.g. Acme Corp"
                                />

                                <Input
                                    label="Customer Email Pattern"
                                    type="email"
                                    value={ruleForm.customerEmail}
                                    onChange={(e) => setRuleForm({ ...ruleForm, customerEmail: e.target.value })}
                                    placeholder="e.g. billing@acme.com"
                                />

                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setAssigneeType('employee')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${assigneeType === 'employee' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>Employee</button>
                                    <button type="button" onClick={() => setAssigneeType('team')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${assigneeType === 'team' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>Team</button>
                                </div>

                                {assigneeType === 'employee' ? (
                                    <Dropdown
                                        label="Assigned Employee"
                                        value={ruleForm.assignedUserId}
                                        onChange={(e) => setRuleForm({ ...ruleForm, assignedUserId: e.target.value, teamId: '' })}
                                        required
                                        placement="up"
                                        options={[
                                            { value: '', label: 'Select Employee...' },
                                            ...users.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` })),
                                        ]}
                                    />
                                ) : (
                                    <Dropdown
                                        label="Assigned Team"
                                        value={ruleForm.teamId}
                                        onChange={(e) => setRuleForm({ ...ruleForm, teamId: e.target.value, assignedUserId: '' })}
                                        required
                                        placement="up"
                                        options={[
                                            { value: '', label: 'Select Team...' },
                                            ...teams.map((t) => ({ value: t.id, label: t.name })),
                                        ]}
                                    />
                                )}
                            </>
                        ) : activeTab === 'teams' ? (
                            <>
                                <Input
                                    label="Team Name"
                                    value={teamForm.name}
                                    onChange={(e) => setTeamForm({ name: e.target.value })}
                                    required
                                    placeholder="e.g. Sales Team"
                                />
                            </>
                        ) : (
                            <>
                                <Input
                                    label="Full Name"
                                    value={employeeForm.name}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                                    required
                                    placeholder="e.g. John Doe"
                                />
                                <Input
                                    label="Email Address"
                                    type="email"
                                    value={employeeForm.email}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                                    required
                                    placeholder="john@example.com"
                                />
                                <Input
                                    label={editingId ? "New Password (leave blank to keep current)" : "Password"}
                                    type="password"
                                    value={employeeForm.password}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                                    required={!editingId}
                                    placeholder="••••••••"
                                />
                                <Dropdown
                                    label="System Role"
                                    value={employeeForm.role}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                                    required
                                    placement="up"
                                    options={[
                                        { value: 'STAFF', label: 'Staff (Standard Access)' },
                                        { value: 'MANAGER', label: 'Manager (Elevated Access)' },
                                        { value: 'ADMIN', label: 'Admin (Full Access)' },
                                    ]}
                                />
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">Assign to Teams (Optional)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {teams.map(t => (
                                            <label key={t.id} className="inline-flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                                    checked={employeeForm.teamIds.includes(t.id)}
                                                    onChange={(e) => {
                                                        const newIds = e.target.checked 
                                                            ? [...employeeForm.teamIds, t.id]
                                                            : employeeForm.teamIds.filter(id => id !== t.id);
                                                        setEmployeeForm({ ...employeeForm, teamIds: newIds });
                                                    }}
                                                />
                                                <span className="text-sm font-medium text-slate-700">{t.name}</span>
                                            </label>
                                        ))}
                                        {teams.length === 0 && <span className="text-sm text-slate-500">No teams available</span>}
                                    </div>
                                </div>
                            </>
                        )}
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default Administration;
