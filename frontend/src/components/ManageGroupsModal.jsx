import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGroups, createGroup, updateGroup, deleteGroup } from '../store/groupsSlice';
import { updateTask } from '../store/tasksSlice';
import { X, Plus, Edit2, Trash2, Tag, Loader, Check, Search } from 'lucide-react';
import Modal from './ui/Modal';

const ManageGroupsModal = ({ isOpen, onClose, mode = 'list', taskId = null }) => {
  const dispatch = useDispatch();
  const { groups, isLoading } = useSelector(state => state.groups);
  
  const [newGroupName, setNewGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [assigningId, setAssigningId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchGroups());
      setNewGroupName('');
      setEditingGroupId(null);
      setErrorMsg('');
      setAssigningId(null);
    }
  }, [isOpen, dispatch]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!newGroupName.trim()) return;
    try {
      const newGroup = await dispatch(createGroup(newGroupName.trim())).unwrap();
      setNewGroupName('');
      if (mode === 'assign' && taskId) {
        handleAssign(newGroup.id);
      }
    } catch (err) {
      setErrorMsg(err);
    }
  };

  const handleUpdate = async (id) => {
    if (!editingName.trim()) return;
    setErrorMsg('');
    try {
      await dispatch(updateGroup({ id, name: editingName.trim() })).unwrap();
      setEditingGroupId(null);
    } catch (err) {
      setErrorMsg(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this group? This will remove the group from all associated tasks.')) {
      setErrorMsg('');
      try {
        await dispatch(deleteGroup(id)).unwrap();
      } catch (err) {
        setErrorMsg(err);
      }
    }
  };

  const handleAssign = async (groupId) => {
    if (!taskId) return;
    setAssigningId(groupId);
    setErrorMsg('');
    try {
      await dispatch(updateTask({ id: taskId, payload: { groupId } })).unwrap();
      onClose();
    } catch (err) {
      setErrorMsg(err);
      setAssigningId(null);
    }
  };

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    return groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [groups, searchQuery]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-800">
          <div className="bg-sky-100 p-1 rounded-md text-sky-600">
            <Tag className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold tracking-tight">
            {mode === 'assign' ? 'Assign to Group' : 'Manage Groups'}
          </h2>
        </div>
      }
      size="md"
      className="h-[70vh] max-h-[800px] flex flex-col"
      bodyClassName="flex-1 flex flex-col p-5 overflow-hidden"
    >
      {errorMsg && (
        <div className="mb-4 p-2.5 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 font-medium">
          {errorMsg}
        </div>
      )}

      {/* Add New Group */}
      {mode === 'assign' && (
        <form onSubmit={handleCreate} className="flex gap-2 mb-5 flex-shrink-0">
          <input 
            type="text" 
            placeholder="New group name..."
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="flex-1 text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium placeholder:text-slate-400"
          />
          <button 
            type="submit" 
            disabled={!newGroupName.trim() || isLoading}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assign</span>
          </button>
        </form>
      )}

      {/* Groups List and Search */}
      <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-1 px-1 flex-shrink-0">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Existing Groups</h3>
        </div>
        
        <div className="relative mb-2 flex-shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium placeholder:text-slate-400"
          />
        </div>
        
        <div className="overflow-y-auto flex-1 space-y-1.5 min-h-[200px] pr-1">
          {isLoading && groups.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-slate-400">
              <Loader className="w-5 h-5 animate-spin" />
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 gap-2">
               <Tag className="w-5 h-5 text-slate-300" />
               <p className="text-xs text-slate-500 font-medium">No groups created yet.</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-slate-500">
               <Search className="w-5 h-5 text-slate-300 mb-2" />
               <p className="text-xs font-medium">No groups match "{searchQuery}"</p>
            </div>
          ) : (
            filteredGroups.map(group => (
              <div key={group.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 hover:border-slate-200 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] rounded-lg transition-all group/item">
                {editingGroupId === group.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <input 
                      type="text" 
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 text-xs border border-sky-300 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-sky-100"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate(group.id);
                        if (e.key === 'Escape') setEditingGroupId(null);
                      }}
                    />
                    <button onClick={() => handleUpdate(group.id)} className="text-[10px] font-bold text-sky-600 hover:text-sky-700 bg-sky-50 px-2 py-1 rounded">Save</button>
                    <button onClick={() => setEditingGroupId(null)} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-2 py-1 rounded">Cancel</button>
                  </div>
                ) : (
                  <>
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                      {group.name}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      {mode === 'assign' ? (
                        <button 
                          onClick={() => handleAssign(group.id)}
                          disabled={assigningId === group.id}
                          className="text-[10px] font-bold px-2 py-1 text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          {assigningId === group.id ? <Loader className="w-3 h-3 animate-spin" /> : 'Select'}
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                              setEditingGroupId(group.id);
                              setEditingName(group.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(group.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ManageGroupsModal;
