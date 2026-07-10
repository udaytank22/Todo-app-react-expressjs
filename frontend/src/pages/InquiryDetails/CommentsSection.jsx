import React from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { formatDateTime } from '../../utils/dateFormat';
import { History, Send } from 'lucide-react';

const CommentsSection = ({
    task,
    newComment,
    setNewComment,
    commentSubmitting,
    handleAddComment
}) => {
    return (
        <Card className="space-y-6">
            <div className="flex items-center justify-between border-b border-black/5 pb-4">
                <h3 className="text-sm font-bold text-slate-800">
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
                                    <div className="flex-1 rounded-2xl bg-slate-100/40 p-4 border border-black/5 space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-slate-800">{item.user?.name || 'Unknown User'}</span>
                                            <span className="text-slate-500 text-[10px] font-sans">
                                                {formatDateTime(item.createdAt)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans mt-1">
                                            {item.content}
                                        </p>
                                    </div>
                                </div>
                            );
                        } else {
                            return (
                                <div key={`h-${item.id}`} className="flex gap-3 items-center text-xs text-slate-500 pl-4 border-l border-black/5">
                                    <History className="h-3.5 w-3.5 text-slate-600" />
                                    <span className="font-sans">
                                        Status updated from <span className="font-bold text-slate-600">{item.fromStatus}</span> to <span className="font-bold text-sky-400">{item.toStatus}</span>
                                        {item.changedBy && ` by ${item.changedBy.name}`}
                                        {` on ${formatDateTime(item.changedAt)}`}
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
            <form onSubmit={handleAddComment} className="flex gap-3 pt-4 border-t border-black/5">
                <input
                    type="text"
                    placeholder="Write a status update or follow-up note..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 bg-white/60 border border-black/5 rounded-xl px-4 py-2.5 text-xs outline-none text-slate-800 placeholder-slate-500 focus:border-sky-500/30"
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
    );
};

export default CommentsSection;
