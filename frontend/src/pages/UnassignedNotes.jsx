import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Loader, Calendar, StickyNote, Inbox, ExternalLink, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import DatePicker from '../components/ui/DatePicker';
import Badge from '../components/ui/Badge';

const UnassignedNotes = () => {
    const { token } = useAuth();

    // Default to today
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTasks = async () => {
            if (!token) return;
            setLoading(true);
            setError('');
            try {
                const response = await axios.get(`/api/tasks`, {
                    params: {
                        unassigned: 'true',
                        date: selectedDate,
                        limit: 100 // fetch up to 100
                    }
                });
                setTasks(response.data.data || []);
            } catch (err) {
                console.error("Failed to fetch unassigned tasks:", err);
                setError('Failed to fetch unassigned notes.');
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, [token, selectedDate]);

    return (
        <div className="p-3 space-y-3 flex flex-col font-sans">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <StickyNote className="h-6 w-6 text-sky-500" />
                        Daily Unassigned Notes
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">
                        Review unassigned inquiries and notes for the selected day.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <DatePicker
                        value={selectedDate}
                        onChange={(val) => setSelectedDate(val)}
                    />
                </div>
            </header>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium">
                    {error}
                </div>
            )}

            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader className="h-8 w-8 text-sky-500 animate-spin" />
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <Inbox className="h-16 w-16 mb-4 opacity-20" />
                        <h3 className="text-base font-bold text-slate-500">No unassigned inquiries</h3>
                        <p className="text-sm mt-1">There are no unassigned inquiries for {new Date(selectedDate).toLocaleDateString()}.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {tasks.map(task => (
                            <Card key={task.id} className="p-5 flex flex-col h-full border-l-4 border-l-sky-400 hover:shadow-lg transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge value={task.priority} variant="priority" />
                                    <Link to={`/inquiry/${task.id}`} className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-sky-500">
                                        <ExternalLink className="h-4 w-4" />
                                    </Link>
                                </div>

                                <h3 className="text-sm font-bold text-slate-800 line-clamp-2 mb-2">
                                    {task.subject}
                                </h3>

                                <div className="text-xs text-slate-500 mb-4">
                                    From: <span className="font-semibold text-slate-700">{task.customerName}</span>
                                </div>

                                <div className="flex-1 flex flex-col gap-3">
                                    {task.remarks && (
                                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                            <div className="text-[10px] uppercase font-bold text-yellow-600 tracking-wider mb-1">Remarks</div>
                                            <p className="text-xs text-slate-700 whitespace-pre-wrap">{task.remarks}</p>
                                        </div>
                                    )}

                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex-1">
                                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Description</div>
                                        <p className="text-xs text-slate-600 line-clamp-4 whitespace-pre-wrap">
                                            {task.description || 'No description provided.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                                    <span>{new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <Badge value={task.status} variant="status" />
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UnassignedNotes;
