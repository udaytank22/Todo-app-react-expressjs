import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { authService } from '../../services/authService';
import { groupService } from '../../services/groupService';
import { customerService } from '../../services/customerService';
import * as XLSX from 'xlsx';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Dropdown from '../../components/ui/Dropdown';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
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
    Target
} from 'lucide-react';

const Administration = ({ ReportsView }) => {
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
    const [data, setData] = useState(null); // reports data preview fallback

    // Modal State
    const [isOpen, setIsOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [assigneeType, setAssigneeType] = useState('employee'); // 'employee' | 'team'

    // Delete Confirmation Modal State
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        type: null,
        id: null,
        title: '',
        message: ''
    });

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
            const [rulesData, usersData, teamsData] = await Promise.all([
                customerService.getRules(),
                authService.getUsers(),
                groupService.getTeams()
            ]);

            setRules(rulesData);
            setUsers(usersData);
            setTeams(teamsData);

            // Fetch reports preview for export if activeTab is reports
            const repData = await customerService.getDashboardReports();
            setData(repData);
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
            const payload = {
                customerName: ruleForm.customerName.trim() || null,
                customerEmail: ruleForm.customerEmail.trim() || null,
                assignedUserId: ruleForm.assignedUserId || null,
                teamId: ruleForm.teamId || null,
            };

            if (editingId) {
                const responseData = await customerService.updateRule(editingId, payload);
                setRules((prev) => prev.map((r) => r.id === editingId ? responseData : r));
            } else {
                const responseData = await customerService.createRule(payload);
                setRules((prev) => [responseData, ...prev]);
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
            const payload = { ...employeeForm };
            if (editingId && !payload.password) {
                delete payload.password; // Don't send empty password if not changing
            }

            if (editingId) {
                const responseData = await authService.updateUser(editingId, payload);
                setUsers((prev) => prev.map((u) => u.id === editingId ? responseData : u));
            } else {
                const responseData = await authService.createUser(payload);
                setUsers((prev) => [...prev, responseData].sort((a, b) => a.name.localeCompare(b.name)));
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
            if (editingId) {
                const responseData = await groupService.updateTeam(editingId, teamForm.name);
                setTeams((prev) => prev.map((t) => t.id === editingId ? responseData : t));
            } else {
                const responseData = await groupService.createTeam(teamForm.name);
                setTeams((prev) => [...prev, responseData].sort((a, b) => a.name.localeCompare(b.name)));
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

    const confirmDelete = (type, id) => {
        let title = '';
        let message = '';
        if (type === 'rule') {
            title = 'Delete Auto-Assignment Rule';
            message = 'Are you sure you want to delete this auto-assignment rule?';
        } else if (type === 'employee') {
            title = 'Delete Employee';
            message = 'Are you sure you want to delete this employee? Related data might be affected.';
        } else if (type === 'team') {
            title = 'Delete Team';
            message = 'Are you sure you want to delete this team? Related data might be affected.';
        }
        setDeleteModal({
            isOpen: true,
            type,
            id,
            title,
            message
        });
    };

    const handleConfirmDelete = async () => {
        const { type, id } = deleteModal;
        setDeleteModal((prev) => ({ ...prev, isOpen: false }));
        try {
            if (type === 'rule') {
                await customerService.deleteRule(id);
                setRules((prev) => prev.filter((r) => r.id !== id));
            } else if (type === 'employee') {
                await authService.deleteUser(id);
                setUsers((prev) => prev.filter((u) => u.id !== id));
            } else if (type === 'team') {
                await groupService.deleteTeam(id);
                setTeams((prev) => prev.filter((t) => t.id !== id));
                fetchData(); // refresh users
            }
        } catch (err) {
            console.error(`Failed to delete ${type}:`, err);
            setError(err.response?.data?.error || `Failed to delete ${type}.`);
        }
    };

    const handleDeleteRule = (id) => {
        confirmDelete('rule', id);
    };

    const handleDeleteEmployee = (id) => {
        confirmDelete('employee', id);
    };

    const handleDeleteTeam = (id) => {
        confirmDelete('team', id);
    };

    const fileInputRef = useRef(null);

    const handleExport = () => {
        let exportData = [];
        let filename = '';
        let isSample = false;

        if (activeTab === 'employees') {
            exportData = users.map(u => ({ Name: u.name, Email: u.email, Role: u.role }));
            filename = 'Employees';
        } else if (activeTab === 'teams') {
            exportData = teams.map(t => ({ Name: t.name, Members: t.users?.length || 0 }));
            filename = 'Teams';
        } else if (activeTab === 'reports' && data) {
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
            if (activeTab === 'reports') {
                alert('No data available to export.');
                return;
            }

            isSample = true;
            if (activeTab === 'employees') {
                exportData = [{ Name: 'Sample Employee', Email: 'sample@example.com', Role: 'STAFF' }];
            } else if (activeTab === 'teams') {
                exportData = [{ Name: 'Sample Team' }];
            } else {
                exportData = [{
                    CustomerName: 'Acme Corp',
                    CustomerEmail: '*@acme.com',
                    AssignedUserId: 'user-id-or-leave-blank',
                    TeamId: 'team-id-or-leave-blank'
                }];
            }
        }

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, filename);

        const finalFilename = isSample ? `sample_${filename.toLowerCase()}.xlsx` : `${filename.toLowerCase()}.xlsx`;
        XLSX.writeFile(wb, finalFilename);
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

                if (activeTab === 'employees') {
                    const mappedUsers = importedData.map(row => ({
                        name: row.Name || row.name,
                        email: row.Email || row.email,
                        role: row.Role || row.role
                    }));
                    await authService.bulkCreateUsers({ users: mappedUsers });
                } else if (activeTab === 'teams') {
                    for (const row of importedData) {
                        const name = row.Name || row.name;
                        if (name) {
                            await groupService.createTeam(name);
                        }
                    }
                } else {
                    const mappedRules = importedData.map(row => ({
                        customerName: row.CustomerName || row.customerName,
                        customerEmail: row.CustomerEmail || row.customerEmail,
                        assignedUserId: row.AssignedUserId || row.assignedUserId,
                        teamId: row.TeamId || row.teamId
                    }));
                    await customerService.bulkCreateRules({ rules: mappedRules });
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
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === 'employees'
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                        }`}
                >
                    <Users className="h-4 w-4" />
                    Employees
                </button>
                <button
                    onClick={() => setActiveTab('teams')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === 'teams'
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                        }`}
                >
                    <Users className="h-4 w-4" />
                    Teams
                </button>
                <button
                    onClick={() => setActiveTab('assignments')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === 'assignments'
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                        }`}
                >
                    <Link className="h-4 w-4" />
                    Assignment Rules
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === 'reports'
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
                                            <th className="px-6 py-3">Team</th>
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
                                                    <span className="flex items-center gap-2 font-sans text-xs text-slate-600">
                                                        {u.teams && u.teams.length > 0
                                                            ? u.teams.map((t) => t.name).join(', ')
                                                            : <span className="text-slate-400 italic">No Team</span>}
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
                                                            className={`p-1.5 rounded-lg border border-black/5 transition-colors ${user.id === u.id ? 'opacity-50 cursor-not-allowed text-slate-300' : 'hover:bg-rose-50 text-slate-500 hover:text-rose-500'
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
                                        <th className="px-6 py-3">Customer Name</th>
                                        <th className="px-6 py-3">Customer Domain</th>
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
                                        Specify the customer's exact email address or domain (exact match) and/or name keyword (case-insensitive substring match). For common email providers (e.g. Gmail, Yahoo), you must provide the full email address.
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
            {/* Delete Confirmation Modal */}
            {deleteModal.isOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#18181b] w-full max-w-sm rounded-[24px] p-6 shadow-2xl border border-zinc-800/80 animate-scaleIn relative">
                        {/* Close button */}
                        <button
                            onClick={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
                            className="absolute top-6 right-6 text-zinc-400 hover:text-white transition-colors"
                            aria-label="Close"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>

                        {/* Icon */}
                        <div className="w-10 h-10 bg-zinc-800 border border-zinc-700/50 rounded-full flex items-center justify-center text-rose-500">
                            <Trash2 className="h-4.5 w-4.5" />
                        </div>

                        {/* Text Content */}
                        <div className="mt-4">
                            <h3 className="text-lg font-semibold text-white tracking-tight leading-snug">
                                {deleteModal.title}
                            </h3>
                            <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                                {deleteModal.message} This action cannot be undone.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
                                className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#18181b] border border-zinc-800 rounded-full hover:bg-zinc-800 transition-all outline-none ring-2 ring-sky-500"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#dc3838] rounded-full hover:bg-red-600 transition-all outline-none"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Administration;
