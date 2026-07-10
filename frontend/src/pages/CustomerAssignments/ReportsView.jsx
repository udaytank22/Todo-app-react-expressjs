import React, { useState, useEffect } from 'react';
import { customerService } from '../../services/customerService';
import {
    User,
    AlertCircle,
    Activity,
    Users,
    LayoutList,
    Target
} from 'lucide-react';

const ReportsView = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const data = await customerService.getDashboardReports();
                setData(data);
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

export default ReportsView;
