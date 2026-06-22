import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Dropdown from '../components/ui/Dropdown';
import Modal from '../components/ui/Modal';
import {
    Eye,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    ChevronDown
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTasks, updateTask, deleteTask } from '../store/tasksSlice';
import { useAuth } from '../context/AuthContext';

const List = ({ socket, searchVal }) => {
    const parentRef = React.useRef(null);
    const { user } = useAuth();
    const dispatch = useDispatch();
    const { tasks, isLoading, pagination } = useSelector(state => state.tasks);
    const [users, setUsers] = useState([]);

    const currentTasks = tasks;

    // Sorting state
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isPaginationOpen, setIsPaginationOpen] = useState(false);
    const paginationDropdownRef = React.useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (paginationDropdownRef.current && !paginationDropdownRef.current.contains(event.target)) {
                setIsPaginationOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset page to 1 when search or sorting options change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchVal, sortBy, sortOrder]);

    // Edit Task modal states
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [editForm, setEditForm] = useState({
        subject: '',
        customerName: '',
        description: '',
        status: '',
        priority: '',
        dueDate: '',
        externalLink: '',
        remarks: '',
        assignedUserId: '',
    });

    const fetchUsers = async () => {
        try {
            const response = await axios.get('/api/auth/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    };

    useEffect(() => {
        dispatch(fetchTasks({
            page: currentPage,
            limit: itemsPerPage,
            search: searchVal,
            sortBy,
            sortOrder
        }));
    }, [dispatch, currentPage, itemsPerPage, searchVal, sortBy, sortOrder]);

    useEffect(() => {
        fetchUsers();
    }, []);

    // Request sorting
    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    // Server-driven tasks and pagination metadata
    const totalItems = pagination?.total || tasks.length;
    const totalPages = pagination?.totalPages || 1;
    const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
    const indexOfLastItem = indexOfFirstItem + tasks.length;

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            if (start > 2) {
                pages.push('...');
            }

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (end < totalPages - 1) {
                pages.push('...');
            }

            pages.push(totalPages);
        }
        return pages;
    };

    // Adjust current page if total pages decreases (e.g. on deletion or filter)
    useEffect(() => {
        if (totalPages > 0 && currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...editForm,
                dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : null,
            };

            await dispatch(updateTask({ id: editingTask.id, payload })).unwrap();
            setIsEditOpen(false);
            setEditingTask(null);
        } catch (error) {
            console.error('Edit submit failed:', error);
            alert(error || 'Failed to update task.');
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="h-8 w-44 skeleton-loader rounded-lg" />
                <div className="h-64 skeleton-loader rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="p-3 space-y-3 font-sans">
            {/* Title */}
            <div>
                <h2 className="text-xl font-extrabold tracking-wide text-slate-900 ">
                    Inquiry Management List Grid
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                    Review, modify, or assign inquiries in a structured database sheet layout.
                </p>
            </div>

            {/* Main Table Grid Card */}
            <Card className="p-0 border-black/5 overflow-hidden">
                <div className="overflow-x-auto w-full">
                    <table className="min-w-full text-left border-collapse relative">
                        {/* Headers */}
                        <thead className="bg-white/80 border-b border-black/5 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-1 cursor-pointer select-none" onClick={() => handleSort('subject')}>
                                    <div className="flex items-center gap-1.5">
                                        <span>Subject</span>
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                                <th className="px-4 py-1 cursor-pointer select-none" onClick={() => handleSort('customerName')}>
                                    <div className="flex items-center gap-1.5">
                                        <span>Customer</span>
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                                <th className="px-4 py-1 cursor-pointer select-none" onClick={() => handleSort('senderEmail')}>
                                    <div className="flex items-center gap-1.5">
                                        <span>Sender</span>
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                                <th className="px-4 py-1 cursor-pointer select-none" onClick={() => handleSort('priority')}>
                                    <div className="flex items-center gap-1.5">
                                        <span>Priority</span>
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                                <th className="px-4 py-1 cursor-pointer select-none" onClick={() => handleSort('assignedUser')}>
                                    <div className="flex items-center gap-1.5">
                                        <span>Assigned To</span>
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                                <th className="px-4 py-1 cursor-pointer select-none" onClick={() => handleSort('createdAt')}>
                                    <div className="flex items-center gap-1.5">
                                        <span>Created Date</span>
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                                <th className="px-4 py-1 text-center">Actions</th>
                            </tr>
                        </thead>

                        {/* Body */}
                        <tbody className="divide-y divide-black/5 text-sm">
                            {currentTasks.map((task) => (
                                <tr key={task.id} className="table-row-hover text-slate-700 light:text-slate-700">
                                    <td className="px-4 py-2 font-semibold text-slate-900 max-w-xs truncate w-[20%]">
                                        <Link to={`/inquiry/${task.id}`} className="hover:text-sky-400 hover:underline transition-colors cursor-pointer block truncate">
                                            {task.subject}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-2 font-medium w-[15%] max-w-[150px] truncate" title={task.customerName}>
                                        {task.customerName}
                                    </td>
                                    <td className="px-4 py-2 text-slate-600 font-sans w-[20%] max-w-[200px] truncate" title={task.senderEmail}>
                                        {task.senderEmail}
                                    </td>
                                    <td className="px-4 py-2 w-[10%]">
                                        <Badge value={task.priority} variant="priority" />
                                    </td>
                                    <td className="px-4 py-2 w-[15%]">
                                        <span className="font-semibold text-slate-800 light:text-slate-700 text-xs">
                                            {task.assignedUser ? task.assignedUser.name : 'Unassigned'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-slate-600 text-xs font-sans w-[10%]">
                                        {new Date(task.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 w-[10%]">
                                        <div className="flex items-center justify-center gap-2">
                                            <Link to={`/inquiry/${task.id}`}>
                                                <button className="p-1.5 rounded-lg border border-black/5 hover:bg-slate-100/50 hover:text-sky-400 transition-colors" title="View details">
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {currentTasks.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="p-10 text-center text-slate-500 text-sm">
                                        No matching inquiries found in database.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {totalItems > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-black/5 bg-white/40">
                        <div className="flex items-center gap-2 text-xs text-slate-600 font-sans">
                            <span>Showing</span>
                            <div className="relative" ref={paginationDropdownRef}>
                                <button
                                    onClick={() => setIsPaginationOpen(!isPaginationOpen)}
                                    className="bg-white border border-black/10 rounded px-2 py-0.5 text-slate-800 outline-none focus:border-sky-500/50 flex items-center justify-between gap-2 min-w-[3.5rem] hover:bg-slate-50 transition-colors"
                                >
                                    <span className="font-medium">{itemsPerPage}</span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isPaginationOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isPaginationOpen && (
                                    <div className="absolute bottom-full mb-1 left-0 w-full bg-white/90 backdrop-blur-md border border-slate-200/60 rounded-lg shadow-lg overflow-hidden z-50">
                                        {[5, 10, 20, 50].map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => {
                                                    setItemsPerPage(option);
                                                    setCurrentPage(1);
                                                    setIsPaginationOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${itemsPerPage === option ? 'bg-sky-50 text-sky-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <span>entries (Total {totalItems})</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className={`p-1.5 rounded-lg border border-black/5 transition-all ${currentPage === 1
                                    ? 'text-slate-600 cursor-not-allowed bg-transparent'
                                    : 'text-slate-700 hover:text-white hover:bg-slate-100/60 hover:border-black/10 active:scale-95'
                                    }`}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>

                            {/* Render page numbers */}
                            {getPageNumbers().map((page, index) => {
                                if (page === '...') {
                                    return (
                                        <span key={`dots-${index}`} className="px-2 text-slate-500 text-xs font-sans">
                                            ...
                                        </span>
                                    );
                                }

                                return (
                                    <button
                                        key={page}
                                        type="button"
                                        onClick={() => setCurrentPage(page)}
                                        className={`px-3 py-1 rounded-lg text-xs font-sans font-semibold border transition-all active:scale-95 ${currentPage === page
                                            ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 font-bold shadow-[0_0_12px_rgba(14,165,233,0.15)]'
                                            : 'bg-transparent border-black/5 text-slate-600 hover:text-slate-800 hover:bg-slate-100/40 hover:border-black/10'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}

                            <button
                                type="button"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className={`p-1.5 rounded-lg border border-black/5 transition-all ${currentPage === totalPages
                                    ? 'text-slate-600 cursor-not-allowed bg-transparent'
                                    : 'text-slate-700 hover:text-white hover:bg-slate-100/60 hover:border-black/10 active:scale-95'
                                    }`}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Edit Inquiry Drawer Modal */}
            {editingTask && (
                <Modal
                    isOpen={isEditOpen}
                    onClose={() => setIsEditOpen(false)}
                    title={`Edit Inquiry Details: ${editingTask.inquiryId}`}
                    size="lg"
                >
                    <form onSubmit={handleEditSubmit} className="space-y-5">
                        <Input
                            label="Subject Summary"
                            value={editForm.subject}
                            onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                            required
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Customer Name"
                                value={editForm.customerName}
                                onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                                required
                            />

                            <Input
                                label="Due Date"
                                type="date"
                                value={editForm.dueDate}
                                onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Dropdown
                                label="Status Column"
                                value={editForm.status}
                                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                options={[
                                    { value: 'PENDING', label: 'Pending' },
                                    { value: 'IN_PROGRESS', label: 'In Progress' },
                                    { value: 'COMPLETED', label: 'Completed' },
                                    { value: 'CANCELLED', label: 'Cancelled' }
                                ]}
                            />

                            <Dropdown
                                label="Priority Tier"
                                value={editForm.priority}
                                onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                                disabled={user?.role !== 'ADMIN'}
                                options={[
                                    { value: 'LOW', label: 'Low' },
                                    { value: 'MEDIUM', label: 'Medium' },
                                    { value: 'HIGH', label: 'High' },
                                    { value: 'URGENT', label: 'Urgent' }
                                ]}
                            />
                        </div>

                        <Dropdown
                            label="Assigned System User"
                            value={editForm.assignedUserId}
                            onChange={(e) => setEditForm({ ...editForm, assignedUserId: e.target.value })}
                            disabled={user?.role === 'STAFF'}
                            options={[
                                { value: '', label: 'Unassigned' },
                                ...users.map(u => ({ value: u.id, label: `${u.name} (${u.role})` }))
                            ]}
                        />

                        <Input
                            label="External Platform Ticket URL (HubSpot, Jira, Shopify, etc.)"
                            value={editForm.externalLink}
                            onChange={(e) => setEditForm({ ...editForm, externalLink: e.target.value })}
                            placeholder="https://hubspot.com/..."
                        />

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-600">
                                Inquiry Description Specifications
                            </label>
                            <textarea
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                rows="4"
                                className="glass-input resize-none w-full"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-600">
                                Remarks / Working Notes
                            </label>
                            <textarea
                                value={editForm.remarks}
                                onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                                rows="2"
                                className="glass-input resize-none w-full"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
                            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary">
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default List;
