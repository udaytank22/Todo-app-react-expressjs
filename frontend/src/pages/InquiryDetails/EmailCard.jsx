import React from 'react';
import Card from '../../components/ui/Card';
import { formatDateTime } from '../../utils/dateFormat';
import {
    Mail,
    Calendar,
    Maximize,
    FileSpreadsheet,
    FileText,
    Download
} from 'lucide-react';

const EmailCard = ({ task, onFullScreen }) => {
    return (
        <Card className="space-y-2">
            <div className="flex items-center justify-between border-b border-black/5 pb-2">
                <div className="flex items-center gap-3">
                    <div className="bg-sky-500/10 p-2 rounded-lg text-sky-400">
                        <Mail className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">
                            Original Email Inquiry
                        </h3>
                        <p className="text-[12px] text-bold font-sans">
                            Sender: {task.senderEmail}
                        </p>
                    </div>
                </div>
                <span className="text-[12px] text-bold flex items-center gap-1.5 font-sans">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    {formatDateTime(task.createdAt)}
                </span>
            </div>

            {/* Subject and body */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">
                        {task.subject}
                    </h4>
                    <button
                        onClick={onFullScreen}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                        title="View Full Screen"
                    >
                        <Maximize className="h-4 w-4" />
                        Full Screen
                    </button>
                </div>
                <div className="rounded-xl bg-white p-4 border border-black/5 max-h-[500px] overflow-y-auto text-xs text-slate-700 leading-relaxed font-sans">
                    {task.inquiryId?.includes('LIVE') || task.email?.body ? (
                        <div dangerouslySetInnerHTML={{ __html: task.inquiryId?.includes('LIVE') ? task.description : task.email.body }} />
                    ) : (
                        <div className="whitespace-pre-wrap">{task.description}</div>
                    )}
                </div>
            </div>

            {/* Email attachments download section */}
            {(task.attachments?.length || 0) > 0 && (
                <div className="space-y-1">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Attachments
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {task.attachments.map((file) => (
                            <div
                                key={file.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-slate-100/40 border border-black/5 transition-all text-xs group text-slate-700"
                            >
                                <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
                                    {file.fileType === 'EXCEL' ? (
                                        <FileSpreadsheet className="h-4 w-4 text-emerald-500 min-w-4" />
                                    ) : file.fileType === 'PDF' ? (
                                        <FileText className="h-4 w-4 text-rose-500 min-w-4" />
                                    ) : (
                                        <FileText className="h-4 w-4 text-slate-500 min-w-4" />
                                    )}
                                    <span className="truncate font-sans font-semibold">
                                        {file.filename}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-slate-500 font-sans text-[10px]">
                                        {Math.round(file.fileSize / 1024)} KB
                                    </span>
                                    <a
                                        href={`/api/tasks/attachments/${file.id}/view`}
                                        download={file.filename}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-slate-500 hover:text-slate-800 transition-colors flex items-center p-1"
                                        title="Download attachment"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
};

export default EmailCard;
