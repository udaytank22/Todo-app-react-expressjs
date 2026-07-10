import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { groupService } from '../../services/groupService';
import { taskService } from '../../services/taskService';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { formatDateTime, formatDateTimeFull } from '../../utils/dateFormat';
import { useSelector, useDispatch } from 'react-redux';
import { updateTask, addComment } from '../../store/tasksSlice';
import { fetchGroups } from '../../store/groupsSlice';
import { useAuth } from '../../context/AuthContext';
import {
    ArrowLeft,
    AlertCircle,
    FileSpreadsheet,
    FileText,
    Download
} from 'lucide-react';

import EmailCard from './EmailCard';
import AiExtractionCard from './AiExtractionCard';
import CommentsSection from './CommentsSection';

const InquiryDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useAuth();

    const tasks = useSelector(state => state.tasks.tasks);
    const storeTask = tasks.find(t => t.id === id);

    const [task, setTask] = useState(null);
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // File parser data cache (preserved dead states for compatibility)
    const [parsedFiles] = useState({});
    const [parsingLoading] = useState({});
    const [previewAttachment, setPreviewAttachment] = useState(null);

    // Comment form state
    const [newComment, setNewComment] = useState('');
    const [commentSubmitting, setCommentSubmitting] = useState(false);

    // Edit Assignment status
    const [isUpdatingMetadata, setIsUpdatingMetadata] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const fetchTaskDetails = async () => {
        try {
            const data = await taskService.getTask(id);
            console.log(data, "task details");
            setTask(data);
        } catch (error) {
            console.error('Failed to load task details:', error);
            alert('Failed to load inquiry details. It may have been deleted.');
            navigate('/list');
        }
    };

    const fetchUsersList = async () => {
        try {
            const data = await authService.getUsers();
            setUsers(data);
            dispatch(fetchGroups());
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    };

    const fetchTeamsList = async () => {
        try {
            const data = await groupService.getTeams();
            setTeams(data);
        } catch (error) {
            console.error('Failed to load teams:', error);
        }
    };

    // Pre-load from store cache if available
    useEffect(() => {
        if (storeTask) {
            setTask(prev => {
                if (!prev || prev.id !== storeTask.id) {
                    return storeTask;
                }

                // Merge arrays by ID to keep updates from both REST API and real-time Socket.io events
                const mergedComments = Array.from(
                    new Map(
                        [...(storeTask.comments || []), ...(prev.comments || [])].map(c => [c.id, c])
                    ).values()
                ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                const mergedStatusHistory = Array.from(
                    new Map(
                        [...(storeTask.statusHistory || []), ...(prev.statusHistory || [])].map(sh => [sh.id, sh])
                    ).values()
                ).sort((a, b) => new Date(a.createdAt || a.changedAt).getTime() - new Date(b.createdAt || b.changedAt).getTime());

                const mergedAttachments = Array.from(
                    new Map(
                        [...(storeTask.attachments || []), ...(prev.attachments || [])].map(att => [att.id, att])
                    ).values()
                );

                return {
                    ...prev,
                    ...storeTask,
                    attachments: mergedAttachments,
                    comments: mergedComments,
                    statusHistory: mergedStatusHistory,
                    aiSummary: prev.aiSummary || storeTask.aiSummary,
                };
            });
            setIsLoading(false);
        }
    }, [storeTask]);

    useEffect(() => {
        const init = async () => {
            await Promise.all([fetchTaskDetails(), fetchUsersList(), fetchTeamsList()]);
            setIsLoading(false);
        };
        init();
    }, [id]);

    const handleMetadataChange = async (field, val) => {
        setIsUpdatingMetadata(true);
        try {
            const payload = {
                [field]: val
            };
            const response = await dispatch(updateTask({ id, payload })).unwrap();
            setTask(prev => ({ ...prev, ...response }));
            // Fetch details again to update status history/comments logs
            await fetchTaskDetails();
        } catch (error) {
            console.error('Failed to update task detail:', error);
            alert('Error updating detail: ' + error);
        } finally {
            setIsUpdatingMetadata(false);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setCommentSubmitting(true);
        try {
            await dispatch(addComment({ id, content: newComment })).unwrap();
            setNewComment('');
        } catch (error) {
            console.error('Add comment failed:', error);
            alert('Failed to save comment.');
        } finally {
            setCommentSubmitting(false);
        }
    };

    // Helper to parse markdown table syntax from Excel parser into styled HTML Grid
    const renderExcelGridTable = (mdTableString) => {
        if (!mdTableString) return null;

        // Check if it is an extraction failed text
        if (mdTableString.startsWith('[Excel Text Extraction Failed')) {
            return (
                <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{mdTableString}</span>
                </div>
            );
        }

        const lines = mdTableString.trim().split('\n');
        let sheetName = 'Sheet Data';
        let dataLines = lines;

        if (lines[0].startsWith('Sheet:')) {
            sheetName = lines[0];
            dataLines = lines.slice(1);
        }

        // Filter out separator lines (e.g. |---|---|)
        const tableRows = dataLines.filter(line => line.startsWith('|') && !line.includes('---'));

        if (tableRows.length === 0) {
            return <p className="text-slate-500 text-xs p-4">No columns found in sheet.</p>;
        }

        // Parse header and rows
        const headerCols = tableRows[0].split('|').map(s => s.trim()).filter(s => s);
        const rowLines = tableRows.slice(1);

        return (
            <div className="space-y-3">
                <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                    {sheetName}
                </h4>
                <div className="overflow-x-auto rounded-xl border border-black/5 bg-white/40">
                    <table className="min-w-full text-xs text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-black/5 text-slate-700 font-bold uppercase tracking-wider">
                                {headerCols.map((col, idx) => (
                                    <th key={idx} className="p-3 border-r border-black/5">
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rowLines.map((row, rowIdx) => {
                                const cols = row.split('|').map(s => s.trim()).filter(s => s);
                                return (
                                    <tr key={rowIdx} className="border-b border-black/5 hover:bg-slate-100/20 text-slate-600">
                                        {cols.map((col, colIdx) => (
                                            <td key={colIdx} className="p-3 border-r border-black/5 font-sans">
                                                {col}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    if (isLoading || !task) {
        return (
            <div className="p-6 space-y-6">
                <div className="h-8 w-64 skeleton-loader rounded-lg" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-96 skeleton-loader rounded-2xl" />
                    <div className="h-96 skeleton-loader rounded-2xl" />
                </div>
            </div>
        );
    }

    // Parse AI summaries safely
    let aiSummaryObj = {};
    try {
        if (task.aiSummary && typeof task.aiSummary === 'string') {
            const parsed = JSON.parse(task.aiSummary);
            if (parsed && typeof parsed === 'object') {
                aiSummaryObj = parsed;
            }
        }
    } catch (err) {
        // fallback
    }

    return (
        <div className="p-4 space-y-2 font-sans overflow-y-auto max-h-[calc(100vh-4rem)]">
            {/* Header back link */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Go Back</span>
                </button>

                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-black-400 font-sans uppercase">
                        {task.inquiryId}
                    </span>
                    <Badge value={task.priority} variant="priority" />
                    <Badge value={task.status} variant="status" />
                </div>
            </div>

            {/* Main Grid Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
                {/* Left Column: Email contents & Activity comments */}
                <div className="lg:col-span-2 space-y-2">
                    <EmailCard
                        task={task}
                        onFullScreen={() => setIsFullScreen(true)}
                    />

                    <CommentsSection
                        task={task}
                        newComment={newComment}
                        setNewComment={setNewComment}
                        commentSubmitting={commentSubmitting}
                        handleAddComment={handleAddComment}
                    />
                </div>

                {/* Right Column: AI details & Attachment parser views */}
                <div className="space-y-6">
                    <AiExtractionCard
                        aiSummaryObj={aiSummaryObj}
                        task={task}
                        user={user}
                        teams={teams}
                        isUpdatingMetadata={isUpdatingMetadata}
                        handleMetadataChange={handleMetadataChange}
                    />
                </div>
            </div>

            {/* Modal Preview for Attachment contents (preserved for compatibility) */}
            {previewAttachment && (
                <Modal
                    isOpen={!!previewAttachment}
                    onClose={() => setPreviewAttachment(null)}
                    title={`Attachment Preview: ${previewAttachment.filename}`}
                    size="xl"
                >
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-black/5 pb-3">
                            <span className="text-xs text-slate-600 font-sans">
                                Size: {Math.round(previewAttachment.fileSize / 1024)} KB | Type: {previewAttachment.fileType}
                            </span>
                            <a
                                href={`/api/tasks/attachments/${previewAttachment.id}/view`}
                                download={previewAttachment.filename}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold"
                            >
                                <Download className="h-4 w-4" />
                                Download Original
                            </a>
                        </div>

                        <div className="pt-2">
                            {parsingLoading[previewAttachment.id] ? (
                                <div className="py-20 flex flex-col items-center justify-center text-xs text-slate-600">
                                    <div className={`h-8 w-8 rounded-full border-2 border-t-transparent animate-spin mb-3 ${previewAttachment.fileType === 'EXCEL' ? 'border-emerald-500' : 'border-rose-500'
                                        }`} />
                                    <span>Parsing and structuring file contents...</span>
                                </div>
                            ) : previewAttachment.fileType === 'EXCEL' ? (
                                <div className="max-h-[500px] overflow-auto">
                                    {renderExcelGridTable(parsedFiles[previewAttachment.id])}
                                </div>
                            ) : (
                                <div className="bg-white/60 p-5 border border-black/5 rounded-xl max-h-[500px] overflow-y-auto text-xs text-slate-700 font-sans leading-relaxed whitespace-pre-wrap">
                                    {parsedFiles[previewAttachment.id] || 'No content parsed.'}
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Full Screen Email View */}
            <Modal
                isOpen={isFullScreen}
                onClose={() => setIsFullScreen(false)}
                size="full"
                hideHeader={true}
                className="bg-slate-100 flex flex-col"
                bodyClassName="flex-1 flex flex-col overflow-hidden h-full"
            >
                <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsFullScreen(false)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Details
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden flex bg-white">
                    <div className="w-full h-full overflow-hidden flex flex-col md:flex-row">
                        {/* Left Section: Headers & Attachments */}
                        <div className="w-full md:w-[350px] lg:w-[400px] border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50 flex flex-col h-auto md:h-full overflow-y-auto p-6 flex-shrink-0">
                            <h1 className="text-base font-bold text-slate-900 mb-6 leading-snug">{task.subject}</h1>

                            <div className="flex flex-col gap-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-base flex-shrink-0">
                                        {task.customerName ? task.customerName.charAt(0).toUpperCase() : task.senderEmail?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="font-bold text-sm text-slate-900 truncate">{task.customerName || task.senderEmail?.split('@')[0]}</div>
                                        <div className="text-xs text-slate-500 truncate">
                                            &lt;{task.senderEmail}&gt;
                                        </div>
                                    </div>
                                </div>

                                <div className="text-sm text-slate-600 flex flex-col gap-2 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                    <div className="flex gap-2"><span className="font-semibold text-slate-700 w-8 flex-shrink-0">To:</span> <span className="truncate">Support Team</span></div>
                                    <div className="flex gap-2"><span className="font-semibold text-slate-700 w-8 flex-shrink-0">Cc:</span> <span>-</span></div>
                                    <div className="flex gap-2"><span className="font-semibold text-slate-700 w-8 flex-shrink-0">Date:</span> <span>{formatDateTimeFull(task.createdAt)}</span></div>
                                </div>
                            </div>

                            {/* Attachments Section */}
                            {(task.attachments?.length || 0) > 0 && (
                                <div className="mt-2">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Attachments ({task.attachments.length})</h3>
                                    <div className="flex flex-col gap-2">
                                        {task.attachments.map((file) => (
                                            <a
                                                key={file.id}
                                                href={`/api/tasks/attachments/${file.id}/view`}
                                                download={file.filename}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-3 p-2.5 pr-4 border border-slate-200 rounded-md hover:bg-white transition-colors cursor-pointer bg-slate-50/50 shadow-sm"
                                                title="Download attachment"
                                            >
                                                <div className="bg-white border border-slate-100 p-2 rounded shadow-sm">
                                                    {file.fileType === 'EXCEL' ? (
                                                        <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                                                    ) : file.fileType === 'PDF' ? (
                                                        <FileText className="h-5 w-5 text-rose-600" />
                                                    ) : (
                                                        <FileText className="h-5 w-5 text-slate-500" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="text-sm font-medium text-slate-700 truncate">
                                                        {file.filename}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {Math.round(file.fileSize / 1024)} KB
                                                    </span>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Section: Email Body */}
                        <div className="flex-1 p-6 md:p-8 text-sm text-slate-800 leading-relaxed font-sans bg-white overflow-y-auto h-full">
                            {task.inquiryId?.includes('LIVE') || task.email?.body ? (
                                <div dangerouslySetInnerHTML={{ __html: task.inquiryId?.includes('LIVE') ? task.description : task.email.body }} />
                            ) : (
                                <div className="whitespace-pre-wrap">{task.description}</div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal >
        </div>
    );
};

export default InquiryDetails;
