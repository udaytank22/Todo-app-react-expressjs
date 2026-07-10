import React from 'react';
import Card from '../../components/ui/Card';
import Dropdown from '../../components/ui/Dropdown';
import { ExternalLink } from 'lucide-react';

const AiExtractionCard = ({
    aiSummaryObj,
    task,
    user,
    teams,
    isUpdatingMetadata,
    handleMetadataChange
}) => {
    return (
        <Card className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 border-b border-black/5 pb-2 uppercase tracking-wider text-sky-400">
                AI Extracted Variables
            </h3>

            {/* Fields */}
            <div className="space-y-4">
                <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Customer Name</span>
                    <p className="text-sm font-bold text-slate-900">{aiSummaryObj.customerName || task.customerName || 'N/A'}</p>
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

                {/* Team assignment control */}
                <div>
                    <Dropdown
                        label="Assigned Team"
                        value={task.teamId || ''}
                        onChange={(e) => handleMetadataChange('teamId', e.target.value)}
                        disabled={isUpdatingMetadata || user?.role === 'STAFF'}
                        options={[
                            { value: '', label: 'Unassigned' },
                            ...teams.map(t => ({ value: t.id, label: t.name }))
                        ]}
                    />
                </div>

                {/* Products/Items Grid */}
                {aiSummaryObj.products && aiSummaryObj.products.length > 0 && (
                    <div className="space-y-2 pt-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Requested Items</span>
                        <div className="rounded-xl border border-black/5 bg-white/30 overflow-hidden text-xs">
                            <div className="grid grid-cols-3 bg-white/80 p-2.5 font-bold text-slate-700">
                                <div className="col-span-2">Product</div>
                                <div className="text-center">Qty</div>
                            </div>
                            <div className="divide-y divide-black/5">
                                {aiSummaryObj.products.map((p, idx) => (
                                    <div key={idx} className="grid grid-cols-3 p-2.5 text-slate-600 font-sans">
                                        <div className="col-span-2 font-semibold text-slate-700 truncate">{p.name}</div>
                                        <div className="text-center font-bold text-slate-800">{p.quantity}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

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
    );
};

export default AiExtractionCard;
