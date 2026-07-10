import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGroups, createGroup, updateGroup, deleteGroup } from '../store/groupsSlice';
import { fetchTasks } from '../store/tasksSlice';
import { Edit2, Trash2, Tag, Loader, Plus, Users, ChevronDown, ChevronUp, Mail, Info, Settings, ArrowRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { STATUS_COLORS } from '../utils/statusColors';

const Groups = () => {
    const dispatch = useDispatch();
    const { groups, isLoading } = useSelector(state => state.groups);
    const { tasks } = useSelector(state => state.tasks);
    const [editingGroupId, setEditingGroupId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [expandedGroupId, setExpandedGroupId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredGroups = groups.filter(group =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        dispatch(fetchGroups());
        dispatch(fetchTasks({ limit: 1000 }));
    }, [dispatch]);

    const handleUpdate = async (id) => {
        if (!editingName.trim()) return;
        setErrorMsg('');
        try {
            await dispatch(updateGroup({ id, name: editingName.trim() })).unwrap();
            setEditingGroupId(null);
        } catch (err) {
            setErrorMsg(err);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this group? This will remove the group from all associated tasks.')) {
            setErrorMsg('');
            try {
                await dispatch(deleteGroup(id)).unwrap();
            } catch (err) {
                setErrorMsg(err);
            }
        }
    };

    return (
        <div className="p-3 space-y-3 font-sans h-[calc(100vh-4rem)] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-extrabold tracking-wide text-slate-900 flex items-center gap-2">
                        Manage Groups
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                        View, edit, and manage your email groups here. Groups can be assigned to inquiries.
                    </p>
                </div>
            </div>

            {errorMsg && (
                <div className="mb-4 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium">
                    {errorMsg}
                </div>
            )}

            {/* Content List */}
            <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-slate-500" />
                        <h3 className="font-semibold text-slate-700">All Groups ({filteredGroups.length})</h3>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search groups..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-80 pl-9 pr-4 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all bg-white"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
                    {isLoading && groups.length === 0 ? (
                        <div className="flex items-center justify-center py-12 text-slate-400">
                            <Loader className="w-8 h-8 animate-spin" />
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
                            <Tag className="w-10 h-10 text-slate-300 mb-3" />
                            <p className="font-medium text-base text-slate-700">No groups found</p>
                            <p className="text-sm">You can create new groups by clicking "Add Group" from a Kanban card.</p>
                        </div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
                            <Search className="w-10 h-10 text-slate-300 mb-3" />
                            <p className="font-medium text-base text-slate-700">No groups found for "{searchQuery}"</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                            {filteredGroups.map(group => {
                            const groupTasks = tasks.filter(t => t.groupId === group.id);
                            const isExpanded = expandedGroupId === group.id;

                            return (
                                <div key={group.id} className={`flex flex-col bg-white border ${isExpanded ? 'border-sky-300 shadow-md' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'} rounded-xl transition-all overflow-hidden`}>
                                    {/* Main Card Header */}
                                    <div
                                        className="flex items-center justify-between p-2 cursor-pointer select-none group/item"
                                        onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                                    >
                                        <div className="flex items-center gap-8 flex-1">

                                            {/* Title & Subtitle */}
                                            {editingGroupId === group.id ? (
                                                <div className="flex items-center gap-3 flex-1 mr-4" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="text"
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        className="flex-1 text-sm border border-sky-400 rounded-lg px-3 py-1.5 outline-none focus:ring-4 focus:ring-sky-100 shadow-sm"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleUpdate(group.id);
                                                            if (e.key === 'Escape') setEditingGroupId(null);
                                                        }}
                                                    />
                                                    <button onClick={() => handleUpdate(group.id)} className="text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 px-3 py-1.5 rounded-lg transition-colors shadow-sm">Save</button>
                                                    <button onClick={() => setEditingGroupId(null)} className="text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col flex-1">
                                                    <span className="text-sm font-extrabold text-slate-800">{group.name}</span>
                                                </div>
                                            )}

                                            {/* Extra Info */}
                                            {editingGroupId !== group.id && (
                                                <div className="flex flex-col hidden sm:flex w-32">
                                                    <span className="text-sm font-bold text-slate-700">{groupTasks.length} Emails</span>
                                                    <span className="text-xs text-slate-400">Assigned</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-3 ml-4" onClick={(e) => e.stopPropagation()}>
                                            <div className={`flex items-center gap-1 ${isExpanded ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'} transition-opacity mr-4`}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingGroupId(group.id);
                                                        setEditingName(group.name);
                                                    }}
                                                    className="p-2 text-slate-600 bg-slate-100 hover:text-sky-600 hover:bg-sky-100 rounded-full transition-colors flex items-center justify-center"
                                                    title="Edit"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(group.id);
                                                    }}
                                                    className="p-2 text-slate-600 bg-slate-100 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors flex items-center justify-center"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                        </div>
                                    </div>

                                    {/* Expanded Content Area */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-100 bg-slate-50/50 p-4 shadow-inner">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <Mail className="w-3.5 h-3.5" />
                                                Emails in this Group ({groupTasks.length})
                                            </h4>

                                            {groupTasks.length === 0 ? (
                                                <div className="text-sm text-slate-500 bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm">
                                                    No emails are currently assigned to this group.
                                                </div>
                                            ) : (
                                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                                    {groupTasks.map(task => (
                                                        <Link key={task.id} to={`/inquiry/${task.id}`} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all group/task cursor-pointer">
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[task.status]?.dot || 'bg-slate-300'}`} />
                                                                <div className="flex flex-col truncate">
                                                                    <span className="text-sm font-semibold text-slate-800 truncate">{task.subject}</span>
                                                                    <span className="text-xs text-slate-500 truncate">{task.customerName || 'No customer'} • {task.priority} Priority</span>
                                                                </div>
                                                            </div>
                                                            <div className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors flex items-center gap-1 flex-shrink-0 opacity-0 group-hover/task:opacity-100">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">View Details</span>
                                                                <ArrowRight className="w-4 h-4" />
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Groups;
