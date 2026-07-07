
import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import {
    Paperclip,
    MessageSquare,
    X,
    User,
    ChevronRight,
    ChevronLeft,
    ChevronDown,
    Tag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTasks, updateTaskStatus } from '../store/tasksSlice';
import { fetchGroups } from '../store/groupsSlice';
import ManageGroupsModal from '../components/ManageGroupsModal';

const COLUMNS = [
    { id: 'PENDING', title: 'Pending' },
    { id: 'IN_PROGRESS', title: 'In Progress' },
    { id: 'COMPLETED', title: 'Completed' },
    { id: 'CANCELLED', title: 'Cancelled' },
];

const Kanban = ({ socket, searchVal }) => {
    const dispatch = useDispatch();
    const { tasks, isLoading } = useSelector(state => state.tasks);
    const { groups } = useSelector(state => state.groups);
    const [priorityFilter, setPriorityFilter] = useState('');
    const [customerFilter, setCustomerFilter] = useState('');
    const [groupFilter, setGroupFilter] = useState('');
    const [viewFormat, setViewFormat] = useState('KANBAN'); // KANBAN or TABLE
    const scrollRef = useRef(null);
    const priorityRef = useRef(null);
    const groupRef = useRef(null);
    const [isPriorityOpen, setIsPriorityOpen] = useState(false);
    const [isGroupOpen, setIsGroupOpen] = useState(false);
    const [openStatusId, setOpenStatusId] = useState(null);

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignTaskId, setAssignTaskId] = useState(null);

    const PRIORITY_OPTIONS = [
        { value: '', label: 'All Priorities' },
        { value: 'LOW', label: 'Low' },
        { value: 'MEDIUM', label: 'Medium' },
        { value: 'HIGH', label: 'High' },
        { value: 'URGENT', label: 'Urgent' }
    ];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (priorityRef.current && !priorityRef.current.contains(event.target)) {
                setIsPriorityOpen(false);
            }
            if (groupRef.current && !groupRef.current.contains(event.target)) {
                setIsGroupOpen(false);
            }
            if (!event.target.closest('.status-dropdown-container')) {
                setOpenStatusId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const scrollLeft = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: -340, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: 340, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        dispatch(fetchTasks({ limit: 200 }));
        dispatch(fetchGroups());
    }, [dispatch]);

    // Filter tasks
    const filteredTasks = tasks.filter((task) => {
        const matchesPriority = priorityFilter ? task.priority === priorityFilter : true;
        const matchesCustomer = customerFilter
            ? task.customerName.toLowerCase().includes(customerFilter.toLowerCase())
            : true;
        const matchesGroup = groupFilter ? task.groupId === groupFilter : true;

        // Global navbar search
        const matchesSearch = searchVal
            ? task.subject.toLowerCase().includes(searchVal.toLowerCase()) ||
            task.inquiryId.toLowerCase().includes(searchVal.toLowerCase()) ||
            task.description.toLowerCase().includes(searchVal.toLowerCase()) ||
            task.customerName.toLowerCase().includes(searchVal.toLowerCase())
            : true;

        return matchesPriority && matchesCustomer && matchesGroup && matchesSearch;
    });

    const onDragEnd = (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;

        // Do nothing if dropped in the same column at the same index
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        // Dispatch status update in Redux (which triggers optimistic UI update)
        dispatch(updateTaskStatus({ id: draggableId, status: destination.droppableId }))
            .unwrap()
            .catch((err) => {
                console.error('Failed to update task status in backend:', err);
                alert('Failed to update status on server. Reverting board changes...');
                // Force refresh store tasks to roll back the status
                dispatch(fetchTasks(true));
            });
    };

    const handleResetFilters = () => {
        setPriorityFilter('');
        setCustomerFilter('');
        setGroupFilter('');
    };

    // Group tasks by column
    const getTasksByColumn = (colId) => {
        return filteredTasks.filter(t => t.status === colId);
    };

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div className="h-8 w-40 skeleton-loader rounded-lg" />
                    <div className="h-10 w-64 skeleton-loader rounded-xl" />
                </div>
                <div className="flex gap-5 overflow-x-auto pb-4">
                    {[...Array(6)].map((_, idx) => (
                        <div key={idx} className="w-80 min-w-80 h-[500px] skeleton-loader rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 space-y-3 h-[calc(101vh-4rem)] flex flex-col font-sans">
            {/* Filtering Header Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                    <h2 className="text-xl font-extrabold tracking-wide text-slate-900 ">
                        Kanban Board
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                        Drag cards to move inquiries through response pipelines.
                    </p>
                </div>

                {/* Filter Controls & View Toggle */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setViewFormat('KANBAN')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${viewFormat === 'KANBAN' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Kanban
                        </button>
                        <button
                            onClick={() => setViewFormat('TABLE')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${viewFormat === 'TABLE' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Table
                        </button>
                    </div>

                    {/* Customer filter */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Filter by customer..."
                            value={customerFilter}
                            onChange={(e) => setCustomerFilter(e.target.value)}
                            className="bg-white/50 border border-black/5 rounded-xl pl-9 pr-4 py-2 text-xs outline-none transition-all placeholder-slate-500 text-slate-800 focus:border-sky-500/30"
                        />
                        <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    </div>

                    {/* Priority filter (Custom Dropdown) */}
                    <div className="relative" ref={priorityRef}>
                        <button
                            onClick={() => setIsPriorityOpen(!isPriorityOpen)}
                            className="flex items-center justify-between w-36 bg-white/50 border border-black/5 rounded-xl px-4 py-2 text-xs outline-none cursor-pointer text-slate-800 hover:bg-white/80 transition-all focus:border-sky-500/30"
                        >
                            <span>
                                {PRIORITY_OPTIONS.find(opt => opt.value === priorityFilter)?.label || 'All Priorities'}
                            </span>
                            <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${isPriorityOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isPriorityOpen && (
                            <div className="absolute top-full left-0 mt-2 w-full bg-white/95 backdrop-blur-xl border border-black/5 rounded-xl shadow-xl z-50 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-200">
                                {PRIORITY_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => {
                                            setPriorityFilter(opt.value);
                                            setIsPriorityOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${priorityFilter === opt.value
                                            ? 'bg-sky-50 text-sky-600 font-bold'
                                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Group filter */}
                    <div className="relative" ref={groupRef}>
                        <button
                            onClick={() => setIsGroupOpen(!isGroupOpen)}
                            className="flex items-center justify-between w-36 bg-white/50 border border-black/5 rounded-xl px-4 py-2 text-xs outline-none cursor-pointer text-slate-800 hover:bg-white/80 transition-all focus:border-sky-500/30"
                        >
                            <span className="flex items-center gap-1.5 truncate">
                                <Tag className="w-3.5 h-3.5 text-slate-400" />
                                {groupFilter ? groups.find(g => g.id === groupFilter)?.name || 'All Groups' : 'All Groups'}
                            </span>
                            <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${isGroupOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isGroupOpen && (
                            <div className="absolute top-full left-0 mt-2 w-full bg-white/95 backdrop-blur-xl border border-black/5 rounded-xl shadow-xl z-50 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-200">
                                <button
                                    onClick={() => {
                                        setGroupFilter('');
                                        setIsGroupOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${!groupFilter
                                        ? 'bg-sky-50 text-sky-600 font-bold'
                                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                                        }`}
                                >
                                    All Groups
                                </button>
                                {groups.map((g) => (
                                    <button
                                        key={g.id}
                                        onClick={() => {
                                            setGroupFilter(g.id);
                                            setIsGroupOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${groupFilter === g.id
                                            ? 'bg-sky-50 text-sky-600 font-bold'
                                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                                            }`}
                                    >
                                        {g.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Clear Button */}
                    {(priorityFilter || customerFilter || groupFilter) && (
                        <button
                            onClick={handleResetFilters}
                            className="flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-400 p-2"
                        >
                            <X className="h-3.5 w-3.5" />
                            <span>Clear</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            {viewFormat === 'KANBAN' ? (
                /* Drag & Drop Context */
                <DragDropContext onDragEnd={onDragEnd}>
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    >
                        <div className="flex gap-2 h-full w-max min-w-full">
                            {COLUMNS.map((column) => {
                                const colTasks = getTasksByColumn(column.id);

                                return (
                                    <div key={column.id} className="kanban-column flex flex-col h-full">
                                        {/* Column Title Header */}
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-xs font-bold text-slate-700 light:text-slate-700 tracking-wider uppercase">
                                                {column.title}
                                            </h3>
                                            <span className="px-1 py-0.1 rounded-full text-[10px] font-extrabold bg-slate-100 light:bg-slate-200 text-slate-600 ">
                                                {colTasks.length}
                                            </span>
                                        </div>

                                        {/* Column Body Droppable Area */}
                                        <Droppable droppableId={column.id}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                    className={`flex-1 overflow-y-auto space-y-1 pr-1 transition-all duration-200 rounded-xl ${snapshot.isDraggingOver ? 'bg-white/10 /10 scale-[0.99]' : ''
                                                        }`}
                                                >
                                                    {colTasks.map((task, index) => (
                                                        <Draggable
                                                            key={task.id}
                                                            draggableId={task.id}
                                                            index={index}
                                                        >
                                                            {(draggedProvided, draggedSnapshot) => (
                                                                <div
                                                                    ref={draggedProvided.innerRef}
                                                                    {...draggedProvided.draggableProps}
                                                                    {...draggedProvided.dragHandleProps}
                                                                    className="transform-none"
                                                                >
                                                                    <Card
                                                                        hoverEffect
                                                                        className={`p-4 border border-black/5 border-l-4 border-l-sky-400 relative ${draggedSnapshot.isDragging ? 'shadow-2xl border-sky-500/50 scale-[1.02] bg-white/90' : ''
                                                                            }`}
                                                                    >
                                                                        {/* Card Header Priority & Group */}
                                                                        <div className="flex items-center justify-start gap-2">
                                                                            <Badge value={task.priority} variant="priority" />
                                                                            {task.group && (
                                                                                <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-sky-50 text-sky-600 rounded-md border border-sky-100">
                                                                                    <Tag className="w-3 h-3" />
                                                                                    {task.group.name}
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {/* Subject Title */}
                                                                        <h4 className="text-sm font-semibold text-slate-900 line-clamp-2 mt-2 leading-relaxed">
                                                                            {task.subject}
                                                                        </h4>

                                                                        {/* Customer Display Name */}
                                                                        <p className="text-xs text-slate-600 mt-2 truncate">
                                                                            Client: <span className="text-slate-700 light:text-slate-700 font-medium">{task.customerName}</span>
                                                                        </p>

                                                                        {/* Card Footer Details */}
                                                                        <div className="flex items-center justify-between mt-4 text-slate-500 text-[10px]">
                                                                            <div className="flex items-center gap-2">
                                                                                {/* Indicator: Attachments */}
                                                                                {task._count?.attachments > 0 && (
                                                                                    <span className="flex items-center gap-1.5 hover:text-slate-700">
                                                                                        <Paperclip className="h-3 w-3" />
                                                                                        <span>{task._count.attachments}</span>
                                                                                    </span>
                                                                                )}

                                                                                {/* Indicator: Comments */}
                                                                                {task._count?.comments > 0 && (
                                                                                    <span className="flex items-center gap-1.5 hover:text-slate-700">
                                                                                        <MessageSquare className="h-3 w-3" />
                                                                                        <span>{task._count.comments}</span>
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            {/* Action buttons */}
                                                                            <div className="flex items-center gap-2">
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setAssignTaskId(task.id);
                                                                                        setIsAssignModalOpen(true);
                                                                                    }}
                                                                                    className="text-sky-600 hover:text-sky-500 text-xs font-semibold px-2 py-1 rounded-md hover:bg-sky-50 transition-colors"
                                                                                >
                                                                                    {task.groupId ? (
                                                                                        <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-sky-50 text-sky-600 rounded-md border border-sky-100 whitespace-nowrap">
                                                                                            <Tag className="w-3 h-3" />
                                                                                            {groups.find(g => g.id === task.groupId)?.name || 'Change Group'}
                                                                                        </span>
                                                                                    ) : 'Add Group'}
                                                                                </button>

                                                                                <Link
                                                                                    to={`/inquiry/${task.id}`}
                                                                                    className="text-blue-600 hover:text-blue-500 flex items-center gap-0.5 group focus:outline-none text-xs font-semibold"
                                                                                >
                                                                                    <span>Details</span>
                                                                                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                                                                </Link>
                                                                            </div>
                                                                        </div>
                                                                    </Card>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                    {colTasks.length === 0 && (
                                                        <div className="h-28 border border-dashed border-black/5 rounded-xl flex items-center justify-center text-xs text-slate-500 font-sans">
                                                            Drop inquiry here
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </Droppable>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </DragDropContext>
            ) : (
                /* Table View */
                <div className="flex-1 overflow-auto bg-white border border-slate-200/80 rounded-xl shadow-sm">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50/80 border-b border-slate-200 sticky top-0 z-10 text-xs text-slate-500 font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Subject</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Priority</th>
                                <th className="px-6 py-4 text-center">Group</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTasks.map(task => (
                                <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-3 font-semibold text-slate-900 max-w-[250px] truncate" title={task.subject}>
                                        <Link to={`/inquiry/${task.id}`} className="hover:text-sky-500 hover:underline">
                                            {task.subject}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-3 text-slate-600 font-medium">{task.customerName}</td>
                                    <td className="px-6 py-3">
                                        <div className="relative status-dropdown-container w-36">
                                            <button
                                                onClick={() => setOpenStatusId(openStatusId === task.id ? null : task.id)}
                                                className="flex items-center justify-between w-full bg-white border border-slate-200/80 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-sm"
                                            >
                                                <span>{COLUMNS.find(c => c.id === task.status)?.title || 'Unknown'}</span>
                                                <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${openStatusId === task.id ? 'rotate-180' : ''}`} />
                                            </button>

                                            {openStatusId === task.id && (
                                                <div className="absolute top-full left-0 mt-1 w-full bg-white/95 backdrop-blur-xl border border-black/5 rounded-lg shadow-xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
                                                    {COLUMNS.map((col) => (
                                                        <button
                                                            key={col.id}
                                                            onClick={() => {
                                                                dispatch(updateTaskStatus({ id: task.id, status: col.id }))
                                                                    .unwrap()
                                                                    .catch(() => {
                                                                        alert('Failed to update status on server.');
                                                                        dispatch(fetchTasks(true));
                                                                    });
                                                                setOpenStatusId(null);
                                                            }}
                                                            className={`w-full text-left px-3 py-2 text-xs transition-colors ${task.status === col.id
                                                                ? 'bg-sky-50 text-sky-600 font-bold'
                                                                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                                                                }`}
                                                        >
                                                            {col.title}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <Badge value={task.priority} variant="priority" />
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        {task.groupId ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-sky-50 text-sky-600 rounded-md border border-sky-100 whitespace-nowrap">
                                                <Tag className="w-3 h-3" />
                                                {groups.find(g => g.id === task.groupId)?.name || 'Unknown Group'}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setAssignTaskId(task.id);
                                                    setIsAssignModalOpen(true);
                                                }}
                                                className="text-sky-600 hover:text-sky-500 text-xs font-semibold px-2 py-1 rounded-md hover:bg-sky-50 transition-colors"
                                            >
                                                {task.groupId ? 'Change Group' : 'Add Group'}
                                            </button>

                                            <Link
                                                to={`/inquiry/${task.id}`}
                                                className="text-blue-600 hover:text-blue-500 flex items-center gap-0.5 group focus:outline-none text-xs font-semibold px-2 py-1 hover:bg-slate-50 rounded-md transition-colors"
                                            >
                                                <span>Details</span>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredTasks.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500 font-medium">
                                        No inquiries found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Custom Scroll Controls */}
            {viewFormat === 'KANBAN' && (
                <div className="flex justify-center items-center gap-4">
                    <button
                        onClick={scrollLeft}
                        className="p-2 rounded-full bg-white/50 border border-black/5 hover:bg-white/90 text-slate-600 hover:text-slate-900 transition-all shadow-sm focus:outline-none"
                        title="Scroll Left"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        onClick={scrollRight}
                        className="p-2 rounded-full bg-white/50 border border-black/5 hover:bg-white/90 text-slate-600 hover:text-slate-900 transition-all shadow-sm focus:outline-none"
                        title="Scroll Right"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            )}

            {/* Manage Groups Modal for Assigning */}
            <ManageGroupsModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                mode="assign"
                taskId={assignTaskId}
            />
        </div>
    );
};

export default Kanban;
