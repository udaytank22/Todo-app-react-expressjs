import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Dropdown from '../components/ui/Dropdown';
import Modal from '../components/ui/Modal';
import { useSelector, useDispatch } from 'react-redux';
import { updateTask, addComment } from '../store/tasksSlice';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Mail,
  Calendar,
  User,
  FileSpreadsheet,
  FileText,
  ExternalLink,
  MessageSquare,
  History,
  Send,
  Download,
  AlertCircle,
  Eye
} from 'lucide-react';

const InquiryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();

  const tasks = useSelector(state => state.tasks.tasks);
  const storeTask = tasks.find(t => t.id === id);

  const [task, setTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'pdf' | 'excel'

  // File parser data cache
  const [parsedFiles, setParsedFiles] = useState({});
  const [parsingLoading, setParsingLoading] = useState({});
  const [previewAttachment, setPreviewAttachment] = useState(null);

  // Comment form state
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Edit Assignment status
  const [isUpdatingMetadata, setIsUpdatingMetadata] = useState(false);

  const fetchTaskDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/tasks/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      console.log(response.data, "task details");
      setTask(response.data);
    } catch (error) {
      console.error('Failed to load task details:', error);
      alert('Failed to load inquiry details. It may have been deleted.');
      navigate('/list');
    }
  };

  const fetchUsersList = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/auth/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
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
      await Promise.all([fetchTaskDetails(), fetchUsersList()]);
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

  // Parses dynamic files on selecting visual tabs
  const handleLoadAttachmentPreview = async (attachment) => {
    if (parsedFiles[attachment.id] || parsingLoading[attachment.id]) return;

    setParsingLoading(prev => ({ ...prev, [attachment.id]: true }));
    try {
      const response = await axios.get(`/api/tasks/attachments/${attachment.id}/parse`);
      setParsedFiles(prev => ({ ...prev, [attachment.id]: response.data.content }));
    } catch (error) {
      console.error('Attachment preview failed:', error);
      setParsedFiles(prev => ({ ...prev, [attachment.id]: `[Failed to parse file: ${error.message}]` }));
    } finally {
      setParsingLoading(prev => ({ ...prev, [attachment.id]: false }));
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
        <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-900/40">
          <table className="min-w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-white/5 text-slate-300 font-bold uppercase tracking-wider">
                {headerCols.map((col, idx) => (
                  <th key={idx} className="p-3 border-r border-white/5">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowLines.map((row, rowIdx) => {
                const cols = row.split('|').map(s => s.trim()).filter(s => s);
                return (
                  <tr key={rowIdx} className="border-b border-white/5 hover:bg-slate-800/20 text-slate-400">
                    {cols.map((col, colIdx) => (
                      <td key={colIdx} className="p-3 border-r border-white/5 font-sans">
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

  // Identify attachments
  const pdfAtt = task.attachments?.find(a => a.fileType === 'PDF');
  const excelAtt = task.attachments?.find(a => a.fileType === 'EXCEL');

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
    <div className="p-6 space-y-6 font-sans overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Header back link */}
      <div className="flex items-center justify-between">
        <Link
          to="/kanban"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to board</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-sky-400 font-sans uppercase">
            {task.inquiryId}
          </span>
          <Badge value={task.priority} variant="priority" />
          <Badge value={task.status} variant="status" />
        </div>
      </div>

      {/* Main Grid Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left Column: Email contents & Activity comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Email original envelope */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-sky-500/10 p-2 rounded-lg text-sky-400">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">
                    Original Email Inquiry
                  </h3>
                  <p className="text-[10px] text-slate-500 font-sans">
                    Sender: {task.senderEmail}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 flex items-center gap-1.5 font-sans">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                {new Date(task.createdAt).toLocaleString()}
              </span>
            </div>

            {/* Subject and body */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-100">
                {task.subject}
              </h4>
              <div className="rounded-xl bg-slate-900/50 p-4 border border-white/5 max-h-[300px] overflow-y-auto text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                {task.description}
              </div>
            </div>

            {/* Email attachments download section */}
            {(task.attachments?.length || 0) > 0 && (
              <div className="space-y-2.5 pt-2">
                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Attachments
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {task.attachments.map((file) => {
                    const isPreviewable = ['PDF', 'EXCEL'].includes(file.fileType);
                    return (
                      <div
                        key={file.id}
                        onClick={() => {
                          if (isPreviewable) {
                            setPreviewAttachment(file);
                            handleLoadAttachmentPreview(file);
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-white/5 transition-all text-xs group ${isPreviewable ? 'cursor-pointer' : ''
                          }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
                          {file.fileType === 'EXCEL' ? (
                            <FileSpreadsheet className="h-4 w-4 text-emerald-500 min-w-4" />
                          ) : file.fileType === 'PDF' ? (
                            <FileText className="h-4 w-4 text-rose-500 min-w-4" />
                          ) : (
                            <FileText className="h-4 w-4 text-slate-500 min-w-4" />
                          )}
                          <span className="text-slate-300 truncate font-sans font-semibold group-hover:text-sky-400 transition-colors">
                            {file.filename}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-slate-500 font-sans text-[10px]">
                            {Math.round(file.fileSize / 1024)} KB
                          </span>
                          {isPreviewable && (
                            <button
                              type="button"
                              className="text-slate-500 hover:text-sky-400 p-1 rounded transition-colors"
                              title="Preview in modal"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <a
                            href={`/api/tasks/attachments/${file.id}/view?token=${localStorage.getItem('token') || ''}`}
                            download={file.filename}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-500 hover:text-slate-200 transition-colors flex items-center p-1"
                            title="Download attachment"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Card 2: Comments & Timeline History */}
          <Card className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="text-sm font-bold text-slate-200">
                Activity, Timeline & Comments
              </h3>
            </div>

            {/* Timeline container */}
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
              {/* Combine Comments and Status History sorted by date */}
              {[
                ...(task.comments || []).map(c => ({ ...c, type: 'comment' })),
                ...(task.statusHistory || []).map(h => ({ ...h, type: 'history' }))
              ]
                .sort((a, b) => new Date(a.createdAt || a.changedAt).getTime() - new Date(b.createdAt || b.changedAt).getTime())
                .map((item, idx) => {
                  if (item.type === 'comment') {
                    return (
                      <div key={`c-${item.id}`} className="flex gap-3 items-start">
                        <div className="bg-sky-500/10 p-2 rounded-xl text-sky-400 border border-sky-500/20 text-xs font-bold font-sans uppercase">
                          {item.user?.name ? item.user.name.substring(0, 2) : 'U'}
                        </div>
                        <div className="flex-1 rounded-2xl bg-slate-800/40 p-4 border border-white/5 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-200">{item.user?.name || 'Unknown User'}</span>
                            <span className="text-slate-500 text-[10px] font-sans">
                              {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans mt-1">
                            {item.content}
                          </p>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={`h-${item.id}`} className="flex gap-3 items-center text-xs text-slate-500 pl-4 border-l border-white/5">
                        <History className="h-3.5 w-3.5 text-slate-600" />
                        <span className="font-sans">
                          Status updated from <span className="font-bold text-slate-400">{item.fromStatus}</span> to <span className="font-bold text-sky-400">{item.toStatus}</span>
                          {item.changedBy && ` by ${item.changedBy.name}`}
                          {` on ${new Date(item.changedAt).toLocaleString()}`}
                        </span>
                      </div>
                    );
                  }
                })}

              {((task.comments?.length || 0) === 0 && (task.statusHistory?.length || 0) === 0) && (
                <p className="text-slate-500 text-xs text-center p-4">No recent history or comments available.</p>
              )}
            </div>

            {/* Comment Form input */}
            <form onSubmit={handleAddComment} className="flex gap-3 pt-4 border-t border-white/5">
              <input
                type="text"
                placeholder="Write a status update or follow-up note..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 bg-slate-900/60 border border-white/5 rounded-xl px-4 py-2.5 text-xs outline-none text-slate-200 placeholder-slate-500 focus:border-sky-500/30"
                required
              />
              <Button
                type="submit"
                variant="primary"
                isLoading={commentSubmitting}
                icon={<Send className="h-3.5 w-3.5" />}
              >
                Send
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: AI details & Attachment parser views */}
        <div className="space-y-6">

          {/* Card 1: AI Extractions */}
          <Card className="space-y-5">
            <h3 className="text-sm font-bold text-slate-200 border-b border-white/5 pb-4 uppercase tracking-wider text-sky-400">
              AI Extracted Variables
            </h3>

            {/* Fields */}
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Customer Name</span>
                <p className="text-sm font-bold text-slate-100">{aiSummaryObj.customerName || task.customerName || 'N/A'}</p>
              </div>

              {/* Priority editing control */}
              <div>
                <Dropdown
                  label="Priority"
                  value={task.priority}
                  onChange={(e) => handleMetadataChange('priority', e.target.value)}
                  disabled={isUpdatingMetadata || user?.role !== 'ADMIN'}
                  options={[
                    { value: 'LOW', label: 'Low' },
                    { value: 'MEDIUM', label: 'Medium' },
                    { value: 'HIGH', label: 'High' },
                    { value: 'URGENT', label: 'Urgent' }
                  ]}
                />
              </div>

              {/* User assignment control */}
              <Dropdown
                label="Assign Handler Staff"
                value={task.assignedUserId || ''}
                onChange={(e) => handleMetadataChange('assignedUserId', e.target.value)}
                disabled={isUpdatingMetadata || user?.role === 'STAFF'}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...users.map(u => ({ value: u.id, label: `${u.name} (${u.role})` }))
                ]}
              />

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Target Due Date</span>
                <p className="text-xs text-slate-300 font-sans">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date specified'}
                </p>
              </div>

              {/* Products/Items Grid */}
              {aiSummaryObj.products && aiSummaryObj.products.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Requested Items</span>
                  <div className="rounded-xl border border-white/5 bg-slate-900/30 overflow-hidden text-xs">
                    <div className="grid grid-cols-3 bg-slate-900/80 p-2.5 font-bold text-slate-300">
                      <div className="col-span-2">Product</div>
                      <div className="text-center">Qty</div>
                    </div>
                    <div className="divide-y divide-white/5">
                      {aiSummaryObj.products.map((p, idx) => (
                        <div key={idx} className="grid grid-cols-3 p-2.5 text-slate-400 font-sans">
                          <div className="col-span-2 font-semibold text-slate-300 truncate">{p.name}</div>
                          <div className="text-center font-bold text-slate-200">{p.quantity}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Remarks remarks tab */}
              <div className="space-y-1 pt-2 border-t border-white/5">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Additional AI Remarks</span>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {aiSummaryObj.remarks || 'No observations recorded.'}
                </p>
              </div>

              {/* External platform ticket links */}
              {task.externalLink && (
                <div className="pt-2">
                  <a
                    href={task.externalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 p-3 bg-sky-500/10 hover:bg-sky-500/25 border border-sky-500/20 text-sky-400 rounded-xl text-xs font-bold transition-all group"
                  >
                    <span>External Platform Ticket Link</span>
                    <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-y-[-1px] group-hover:translate-x-[1px]" />
                  </a>
                </div>
              )}
            </div>
          </Card>

          {/* Card 2: Interactive File Parsers Viewer */}
          {(pdfAtt || excelAtt) && (
            <Card className="space-y-4">
              {/* Tab Header buttons */}
              <div className="flex border-b border-white/5">
                {pdfAtt && (
                  <button
                    onClick={() => {
                      setActiveTab('pdf');
                      handleLoadAttachmentPreview(pdfAtt);
                    }}
                    className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 outline-none transition-all ${activeTab === 'pdf'
                      ? 'border-rose-500 text-rose-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                  >
                    PDF Specification
                  </button>
                )}

                {excelAtt && (
                  <button
                    onClick={() => {
                      setActiveTab('excel');
                      handleLoadAttachmentPreview(excelAtt);
                    }}
                    className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 outline-none transition-all ${activeTab === 'excel'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                  >
                    Excel Data Grid
                  </button>
                )}
              </div>

              {/* Tab Content panels */}
              <div className="pt-2">
                {activeTab === 'overview' && (
                  <p className="text-slate-500 text-xs text-center py-6">
                    Select a tab above to parse and view attachment contents.
                  </p>
                )}

                {/* PDF Content pre text viewer */}
                {activeTab === 'pdf' && pdfAtt && (
                  <div className="space-y-3">
                    {parsingLoading[pdfAtt.id] ? (
                      <div className="py-10 flex flex-col items-center justify-center text-xs text-slate-500">
                        <div className="h-6 w-6 rounded-full border-2 border-rose-500/10 border-t-rose-500 animate-spin mb-2" />
                        <span>Parsing PDF contents...</span>
                      </div>
                    ) : (
                      <div className="bg-slate-900/60 p-4 border border-white/5 rounded-xl max-h-[300px] overflow-y-auto text-xs text-slate-400 font-sans leading-relaxed whitespace-pre-wrap">
                        {parsedFiles[pdfAtt.id] || 'No content parsed.'}
                      </div>
                    )}
                  </div>
                )}

                {/* Excel Content tabular visualizer */}
                {activeTab === 'excel' && excelAtt && (
                  <div className="space-y-3">
                    {parsingLoading[excelAtt.id] ? (
                      <div className="py-10 flex flex-col items-center justify-center text-xs text-slate-500">
                        <div className="h-6 w-6 rounded-full border-2 border-emerald-500/10 border-t-emerald-500 animate-spin mb-2" />
                        <span>Structuring Excel tables...</span>
                      </div>
                    ) : (
                      renderExcelGridTable(parsedFiles[excelAtt.id])
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

        </div>

      </div>

      {/* Modal Preview for Attachment contents */}
      {previewAttachment && (
        <Modal
          isOpen={!!previewAttachment}
          onClose={() => setPreviewAttachment(null)}
          title={`Attachment Preview: ${previewAttachment.filename}`}
          size="xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-xs text-slate-400 font-sans">
                Size: {Math.round(previewAttachment.fileSize / 1024)} KB | Type: {previewAttachment.fileType}
              </span>
              <a
                href={`/api/tasks/attachments/${previewAttachment.id}/view?token=${localStorage.getItem('token') || ''}`}
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
                <div className="py-20 flex flex-col items-center justify-center text-xs text-slate-400">
                  <div className={`h-8 w-8 rounded-full border-2 border-t-transparent animate-spin mb-3 ${previewAttachment.fileType === 'EXCEL' ? 'border-emerald-500' : 'border-rose-500'
                    }`} />
                  <span>Parsing and structuring file contents...</span>
                </div>
              ) : previewAttachment.fileType === 'EXCEL' ? (
                <div className="max-h-[500px] overflow-auto">
                  {renderExcelGridTable(parsedFiles[previewAttachment.id])}
                </div>
              ) : (
                <div className="bg-slate-900/60 p-5 border border-white/5 rounded-xl max-h-[500px] overflow-y-auto text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">
                  {parsedFiles[previewAttachment.id] || 'No content parsed.'}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InquiryDetails;
