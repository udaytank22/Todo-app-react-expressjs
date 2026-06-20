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
    ChevronDown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTasks, updateTaskStatus } from '../store/tasksSlice';

const COLUMNS = [
    { id: 'NEW_EMAIL', title: 'New Email' },
    { id: 'PENDING_REVIEW', title: 'Pending Review' },
    { id: 'IN_PROGRESS', title: 'In Progress' },
    { id: 'WAITING_FOR_CLIENT', title: 'Waiting for Client' },
    { id: 'COMPLETED', title: 'Completed' },
    { id: 'CANCELLED', title: 'Cancelled' },
];

const Kanban = ({ socket, searchVal }) => {
    const dispatch = useDispatch();
    const { tasks, isLoading } = useSelector(state => state.tasks);
    const [priorityFilter, setPriorityFilter] = useState('');
    const [customerFilter, setCustomerFilter] = useState('');
    const scrollRef = useRef(null);
    const priorityRef = useRef(null);
    const [isPriorityOpen, setIsPriorityOpen] = useState(false);

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
    }, [dispatch]);

    // Filter tasks
    const filteredTasks = tasks.filter((task) => {
        const matchesPriority = priorityFilter ? task.priority === priorityFilter : true;
        const matchesCustomer = customerFilter
            ? task.customerName.toLowerCase().includes(customerFilter.toLowerCase())
            : true;

        // Global navbar search
        const matchesSearch = searchVal
            ? task.subject.toLowerCase().includes(searchVal.toLowerCase()) ||
            task.inquiryId.toLowerCase().includes(searchVal.toLowerCase()) ||
            task.description.toLowerCase().includes(searchVal.toLowerCase()) ||
            task.customerName.toLowerCase().includes(searchVal.toLowerCase())
            : true;

        return matchesPriority && matchesCustomer && matchesSearch;
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

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-3">
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

                    {/* Clear Button */}
                    {(priorityFilter || customerFilter) && (
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

            {/* Drag & Drop Context */}
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
                                                                    {/* Card Header Priority */}
                                                                    <div className="flex items-center justify-start">
                                                                        <Badge value={task.priority} variant="priority" />
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

                                                                        {/* Action link */}
                                                                        <Link
                                                                            to={`/inquiry/${task.id}`}
                                                                            className="text-blue-600 hover:text-blue-500 flex items-center gap-0.5 group focus:outline-none text-xs font-semibold"
                                                                        >
                                                                            <span>Details</span>
                                                                            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                                                        </Link>
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

            {/* Custom Scroll Controls */}
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
        </div>
    );
};

export default Kanban;
