import React, { useState } from "react";
import { useTasks } from "../hooks/useTasks";
import { Plus, Trash2, Edit2, Link } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import { TaskStatus, Task } from "../types";
import { logAudit } from "../lib/audit";

export default function Tasks() {
  const { tasks, loading } = useTasks();
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    clientName: "",
    attachmentUrl: ""
  });

  const openModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description,
        clientName: task.clientName,
        attachmentUrl: task.attachmentUrl || ""
      });
    } else {
      setEditingTask(null);
      setFormData({ title: "", description: "", clientName: "", attachmentUrl: "" });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !user) return;
    
    try {
      if (editingTask) {
        await updateDoc(doc(db, "workspaces", activeWorkspace.id, "tasks", editingTask.id), {
          ...formData
        });
        if (activeWorkspace.type === "partnership") {
          await logAudit(activeWorkspace.id, user.uid, user.displayName || "Kullanıcı", "Güncelleme", `Görev güncellendi: ${formData.title}`);
        }
      } else {
        await addDoc(collection(db, "workspaces", activeWorkspace.id, "tasks"), {
          workspaceId: activeWorkspace.id,
          ...formData,
          status: "todo" as TaskStatus,
          createdBy: user.uid,
          createdAt: Date.now()
        });
        if (activeWorkspace.type === "partnership") {
          await logAudit(activeWorkspace.id, user.uid, user.displayName || "Kullanıcı", "Ekleme", `Yeni görev eklendi: ${formData.title}`);
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if(!activeWorkspace || !user) return;
    await updateDoc(doc(db, "workspaces", activeWorkspace.id, "tasks", taskId), {
      status: newStatus
    });
    if (activeWorkspace.type === "partnership") {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        await logAudit(activeWorkspace.id, user.uid, user.displayName || "Kullanıcı", "Durum Değişimi", `Görev durumu güncellendi: ${task.title}`);
      }
    }
  };

  const handleDelete = async (taskId: string) => {
    if(!activeWorkspace || !user || !confirm("Silmek istediğinize emin misiniz?")) return;
    try {
      const docRef = doc(db, "workspaces", activeWorkspace.id, "tasks", taskId);
      const snap = await getDoc(docRef);
      const data = snap.data();
      
      await deleteDoc(docRef);
      
      if (activeWorkspace.type === "partnership" && data) {
        await logAudit(activeWorkspace.id, user.uid, user.displayName || "Kullanıcı", "Silme", `Görev silindi: ${data.title}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const renderColumn = (status: TaskStatus, title: string, colorClass: string, bgClass: string, borderClass: string) => {
    const colTasks = tasks.filter(t => t.status === status);
    return (
      <div className={clsx("flex-1 flex flex-col min-w-[280px]", borderClass)}>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">{title} ({colTasks.length})</p>
        <div className="space-y-3 flex-1 overflow-y-auto pr-1 pb-4">
          {colTasks.map(task => (
            <motion.div 
              layoutId={task.id}
              key={task.id} 
              className={clsx("p-4 border rounded-2xl shadow-sm relative group", bgClass, status === 'done' ? "opacity-60" : "")}
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className={clsx("text-sm font-bold pr-6", status === 'done' ? 'line-through' : '')}>{task.title}</h4>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button onClick={() => openModal(task)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white rounded-md shadow-sm border border-slate-100">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDelete(task.id)} className="p-1.5 text-slate-400 hover:text-rose-600 bg-white rounded-md shadow-sm border border-slate-100">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] font-medium text-slate-500 mb-3">{task.clientName}</p>
              {task.description && (
                <p className="text-xs text-slate-600 mb-3 line-clamp-2">{task.description}</p>
              )}
              
              <div className="flex items-center justify-between mt-4">
                {task.attachmentUrl ? (
                   <a href={task.attachmentUrl} target="_blank" rel="noreferrer" className="text-[10px] flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md font-medium">
                     <Link className="w-3 h-3" />
                     Ek
                   </a>
                ) : <div/>}

                <select 
                  value={task.status} 
                  onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                  className="text-[10px] bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none font-medium text-slate-600"
                >
                  <option value="todo">Yapılacak</option>
                  <option value="in_progress">Onay Bekliyor</option>
                  <option value="done">Tamamlandı</option>
                </select>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col pb-20 md:pb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Kanban Panosu</h2>
        <button 
          onClick={() => openModal()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Yeni Görev</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 flex-1 overflow-x-auto overflow-y-hidden shadow-sm p-6">
        {loading ? (
          <div className="text-center text-slate-400 mt-10">Yükleniyor...</div>
        ) : (
          <div className="flex gap-6 h-full min-w-max">
            {renderColumn('todo', 'Yapılacaklar', 'text-slate-900', 'bg-slate-50 border-slate-200', '')}
            {renderColumn('in_progress', 'Onay Bekleyenler', 'text-indigo-900', 'bg-indigo-50/50 border-indigo-100', 'border-x border-slate-100 px-6')}
            {renderColumn('done', 'Tamamlananlar', 'text-slate-900', 'bg-slate-50 border-slate-200', '')}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl"
            >
              <h2 className="text-xl font-bold mb-6">{editingTask ? 'Görevi Düzenle' : 'Yeni Görev'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Başlık</label>
                  <input type="text" required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all font-medium text-sm"
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Firma / Müşteri Adı</label>
                  <input type="text" required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all font-medium text-sm"
                    value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Açıklama</label>
                  <textarea rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all text-sm resize-none"
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ek URL (Opsiyonel)</label>
                  <input type="url" placeholder="https://..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all text-sm"
                    value={formData.attachmentUrl} onChange={e => setFormData({...formData, attachmentUrl: e.target.value})}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">İptal</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">Kaydet</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
