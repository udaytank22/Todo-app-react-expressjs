import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTasks } from '../store/tasksSlice';
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Mail,
  Users
} from 'lucide-react';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { tasks, isLoading } = useSelector(state => state.tasks);

  useEffect(() => {
    dispatch(fetchTasks({ limit: 500 }));
  }, [dispatch]);

  // Compute metrics
  const totalInquiries = tasks.length;
  const newEmails = tasks.filter(t => t.status === 'NEW_EMAIL').length;
  const pendingTasks = tasks.filter(t => t.status === 'PENDING_REVIEW').length;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const highPriority = tasks.filter(t => ['HIGH', 'URGENT'].includes(t.priority)).length;

  const recentInquiries = tasks.slice(0, 5); // top 5 recent tasks

  // Status distributions
  const statuses = ['NEW_EMAIL', 'PENDING_REVIEW', 'IN_PROGRESS', 'WAITING_FOR_CLIENT', 'COMPLETED', 'CANCELLED'];
  const statusCounts = statuses.reduce((acc, status) => {
    acc[status] = tasks.filter(t => t.status === status).length;
    return acc;
  }, {});

  const getPercentage = (count) => {
    if (totalInquiries === 0) return 0;
    return Math.round((count / totalInquiries) * 100);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 skeleton-loader rounded-lg" />

        {/* Metric grids skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 skeleton-loader rounded-2xl" />
          ))}
        </div>

        {/* Content sections skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 skeleton-loader rounded-2xl" />
          <div className="h-96 skeleton-loader rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3 font-sans h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold tracking-wide text-slate-900 ">
          Inquiry Management Dashboard
        </h2>
        <p className="text-xs text-slate-600 light:text-slate-500 mt-1">
          Review incoming Outlook inquiries, AI parse metrics, and team progress.
        </p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <Card hoverEffect className="relative overflow-hidden border-sky-500/10">
          <div className="absolute top-0 right-0 h-16 w-16 bg-sky-500/5 rounded-bl-full flex items-center justify-center text-sky-400">
            <Inbox className="h-5 w-5 mr-[-6px] mt-[-6px]" />
          </div>
          <p className="text-xs font-semibold text-slate-600 tracking-wider uppercase">
            Total Inquiries
          </p>
          <h3 className="text-3xl font-extrabold text-slate-900 mt-2 font-sans tracking-tight">
            {totalInquiries}
          </h3>
        </Card>

        <Card hoverEffect className="relative overflow-hidden border-violet-500/10">
          <div className="absolute top-0 right-0 h-16 w-16 bg-violet-500/5 rounded-bl-full flex items-center justify-center text-violet-400">
            <Mail className="h-5 w-5 mr-[-6px] mt-[-6px]" />
          </div>
          <p className="text-xs font-semibold text-slate-600 tracking-wider uppercase">
            New Emails
          </p>
          <h3 className="text-3xl font-extrabold text-violet-400 mt-2 font-sans tracking-tight">
            {newEmails}
          </h3>
        </Card>

        <Card hoverEffect className="relative overflow-hidden border-amber-500/10">
          <div className="absolute top-0 right-0 h-16 w-16 bg-amber-500/5 rounded-bl-full flex items-center justify-center text-amber-400">
            <Clock className="h-5 w-5 mr-[-6px] mt-[-6px]" />
          </div>
          <p className="text-xs font-semibold text-slate-600 tracking-wider uppercase">
            Pending Review
          </p>
          <h3 className="text-3xl font-extrabold text-amber-400 mt-2 font-sans tracking-tight">
            {pendingTasks}
          </h3>
        </Card>

        <Card hoverEffect className="relative overflow-hidden border-emerald-500/10">
          <div className="absolute top-0 right-0 h-16 w-16 bg-emerald-500/5 rounded-bl-full flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="h-5 w-5 mr-[-6px] mt-[-6px]" />
          </div>
          <p className="text-xs font-semibold text-slate-600 tracking-wider uppercase">
            Completed Tasks
          </p>
          <h3 className="text-3xl font-extrabold text-emerald-400 mt-2 font-sans tracking-tight">
            {completedTasks}
          </h3>
        </Card>

        <Card hoverEffect className="relative overflow-hidden border-rose-500/10">
          <div className="absolute top-0 right-0 h-16 w-16 bg-rose-500/5 rounded-bl-full flex items-center justify-center text-rose-400">
            <AlertTriangle className="h-5 w-5 mr-[-6px] mt-[-6px]" />
          </div>
          <p className="text-xs font-semibold text-slate-600 tracking-wider uppercase">
            High Priority
          </p>
          <h3 className="text-3xl font-extrabold text-rose-400 mt-2 font-sans tracking-tight">
            {highPriority}
          </h3>
        </Card>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Recent Inquiries List Feed */}
        <div className="lg:col-span-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 light:text-slate-700 tracking-wider uppercase">
              Recent Email Inquiries
            </h3>
            <Link to="/kanban" className="text-xs font-semibold text-black-400 hover:text-sky-300 flex items-center gap-1 group">
              <span>Go to Kanban board</span>
              <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <Card className="p-0 border-black/5 overflow-hidden">
            {recentInquiries.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                <Mail className="h-10 w-10 mx-auto mb-3 opacity-25" />
                <p className="text-sm">No incoming inquiries processed yet.</p>
                <p className="text-xs mt-1">Click sync/simulate fetch in the top header to import emails.</p>
              </div>
            ) : (
              <div className="divide-y divide-black/5 ">
                {recentInquiries.map((task) => (
                  <Link
                    key={task.id}
                    to={`/inquiry/${task.id}`}
                    className="flex items-center justify-between py-3 hover:bg-slate-100/30 light:hover:bg-slate-50/50 transition-all duration-200 group"
                  >
                    <div className="space-y-0.5 max-w-[70%]">
                      <div className="flex items-center gap-2.5">
                        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-sky-400 transition-colors truncate">
                          {task.subject}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 truncate">
                        Customer: <span className="font-semibold text-slate-700">{task.customerName}</span> &bull; Sender: <span className="text-slate-600">{task.senderEmail}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge value={task.priority} variant="priority" />
                      <Badge value={task.status} variant="status" />
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-700 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Analytics Distribution Panel */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 light:text-slate-700 tracking-wider uppercase">
            Status Breakdown
          </h3>

          <Card className="space-y-4">
            <div className="space-y-3">
              {statuses.map((status) => {
                const count = statusCounts[status] || 0;
                const percentage = getPercentage(count);

                // Color maps for charts
                const barColors = {
                  NEW_EMAIL: 'bg-violet-500',
                  PENDING_REVIEW: 'bg-amber-500',
                  IN_PROGRESS: 'bg-sky-500',
                  WAITING_FOR_CLIENT: 'bg-pink-500',
                  COMPLETED: 'bg-emerald-500',
                  CANCELLED: 'bg-rose-500',
                };

                const labels = {
                  NEW_EMAIL: 'New Email',
                  PENDING_REVIEW: 'Pending Review',
                  IN_PROGRESS: 'In Progress',
                  WAITING_FOR_CLIENT: 'Waiting for Client',
                  COMPLETED: 'Completed',
                  CANCELLED: 'Cancelled',
                };

                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 light:text-slate-700">
                        {labels[status]}
                      </span>
                      <span className="text-slate-600 font-bold">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    {/* SVG progress line */}
                    <div className="w-full h-2 rounded-full bg-white/50 light:bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColors[status] || 'bg-slate-500'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Summary Box */}
            <div className="pt-5 border-t border-black/5 text-xs text-slate-600 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-sky-400" />
                <span>Assigned inquiries</span>
              </span>
              <span className="font-bold text-slate-800">
                {tasks.filter(t => t.assignedUserId).length} / {totalInquiries}
              </span>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
