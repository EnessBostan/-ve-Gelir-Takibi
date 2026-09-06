import React, { useState } from "react";
import { useIdeas } from "../hooks/useIdeas";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { Plus, Lightbulb, Trash2, Edit2, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import clsx from "clsx";
import { Idea, IdeaStatus } from "../types";

export default function Ideas() {
  const { ideas, loading } = useIdeas();
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    status: "new" as IdeaStatus
  });

  const openModal = (idea?: Idea) => {
    if (idea) {
      setEditingIdea(idea);
      setFormData({
        title: idea.title,
        content: idea.content,
        status: idea.status
      });
    } else {
      setEditingIdea(null);
      setFormData({ title: "", content: "", status: "new" });
    }
    setIsModalOpen(true);
  };

  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim() || isAIGenerating) return;
    
    setIsAIGenerating(true);
    try {
      const response = await fetch("/api/generate-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: aiTopic }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setIsAIModalOpen(false);
        setAiTopic("");
        setEditingIdea(null);
        setFormData({
          title: `💡 AI Fikri: ${aiTopic}`,
          content: data.result,
          status: "new"
        });
        setIsModalOpen(true);
      } else {
        alert(data.error || "Bir hata oluştu");
      }
    } catch (err) {
      console.error(err);
      alert("Bağlantı hatası");
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !user) return;
    
    try {
      if (editingIdea) {
        await updateDoc(doc(db, "workspaces", activeWorkspace.id, "ideas", editingIdea.id), {
          ...formData
        });
      } else {
        await addDoc(collection(db, "workspaces", activeWorkspace.id, "ideas"), {
          workspaceId: activeWorkspace.id,
          ...formData,
          createdBy: user.uid,
          createdAt: Date.now()
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (ideaId: string) => {
    if(!activeWorkspace || !confirm("Bu fikri silmek istediğinize emin misiniz?")) return;
    await deleteDoc(doc(db, "workspaces", activeWorkspace.id, "ideas", ideaId));
  };

  if (loading) return <div className="p-8 text-slate-400">Yükleniyor...</div>;

  return (
    <div className="p-4 md:p-8 h-full flex flex-col pb-20 md:pb-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-yellow-500" />
            Fikirler & Notlar
          </h2>
          <p className="text-sm text-slate-500 mt-1">Gelecekteki projeleri ve notları burada saklayın.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAIModalOpen(true)}
            className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-100 transition-colors border border-indigo-100"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">AI İlham Al</span>
          </button>
          <button 
            onClick={() => openModal()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Yeni Fikir</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-10">
        {ideas.map(idea => (
          <div key={idea.id} className="bg-yellow-50 border border-yellow-100 rounded-2xl p-5 shadow-sm flex flex-col relative group hover:shadow-md transition-shadow">
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button onClick={() => openModal(idea)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white/50 rounded-md">
                <Edit2 className="w-3 h-3" />
              </button>
              <button onClick={() => handleDelete(idea.id)} className="p-1.5 text-slate-400 hover:text-rose-600 bg-white/50 rounded-md">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            
            <div className="flex justify-between items-start mb-3 pr-8">
              <h3 className="font-bold text-slate-800 leading-tight">{idea.title}</h3>
            </div>
            
            <p className="text-sm text-slate-700 flex-1 whitespace-pre-wrap">{idea.content}</p>
            
            <div className="mt-4 pt-3 border-t border-yellow-200/50 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-medium">
                {format(idea.createdAt, 'dd MMM yyyy', { locale: tr })}
              </span>
              <span className={clsx(
                "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                idea.status === 'new' ? 'bg-blue-100 text-blue-700' :
                idea.status === 'discussed' ? 'bg-purple-100 text-purple-700' :
                'bg-slate-200 text-slate-600'
              )}>
                {idea.status === 'new' ? 'Yeni' : idea.status === 'discussed' ? 'Tartışıldı' : 'Arşiv'}
              </span>
            </div>
          </div>
        ))}
        {ideas.length === 0 && (
          <div className="col-span-full p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">
            Henüz hiç fikir eklenmemiş. Yeni bir fikir ekleyerek başlayın.
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
              <h2 className="text-xl font-bold mb-6">{editingIdea ? 'Fikri Düzenle' : 'Yeni Fikir'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Başlık</label>
                  <input type="text" required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all font-medium text-sm"
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">İçerik & Notlar</label>
                  <textarea rows={5} required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all text-sm resize-none"
                    value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}
                  />
                </div>
                
                {editingIdea && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Durum</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all text-sm"
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as IdeaStatus})}
                    >
                      <option value="new">Yeni</option>
                      <option value="discussed">Tartışıldı</option>
                      <option value="archived">Arşivlendi</option>
                    </select>
                  </div>
                )}
                
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">İptal</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">Kaydet</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Inspiration Modal */}
      <AnimatePresence>
        {isAIModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border-2 border-indigo-100"
            >
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-indigo-700">
                <Sparkles className="w-5 h-5" />
                AI ile İlham Al
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Gemini yapay zekası, belirteceğiniz sektöre yönelik yenilikçi fikirler, rakip analizleri ve özellik önerileri sunar.
              </p>
              
              <form onSubmit={handleAIGenerate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sektör veya Konu</label>
                  <input type="text" required placeholder="Örn: Sağlık teknolojileri, E-ticaret..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all font-medium text-sm"
                    value={aiTopic} onChange={e => setAiTopic(e.target.value)}
                    disabled={isAIGenerating}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsAIModalOpen(false)} disabled={isAIGenerating} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50">İptal</button>
                  <button type="submit" disabled={isAIGenerating} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {isAIGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Üretiliyor...
                      </>
                    ) : (
                      "Fikir Üret"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
