import React, { useState } from "react";
import { useTransactions } from "../hooks/useTransactions";
import { Plus, ArrowDownRight, ArrowUpRight, Clock, Trash2, Search, Filter, Wallet, FileText, RotateCcw } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { tr } from "date-fns/locale";
import { db } from "../lib/firebase";
import { collection, addDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import { logAudit } from "../lib/audit";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Finance() {
  const { transactions, loading, selectedMonth, setSelectedMonth } = useTransactions();
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense" | "refund">("all");
  const [formData, setFormData] = useState({
    type: "expense",
    amount: "",
    category: "",
    description: "",
    isRecurring: false,
    recurringDay: "1"
  });

  const monthIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const monthExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const monthRefund = transactions.filter(t => t.type === 'refund').reduce((acc, t) => acc + t.amount, 0);
  const netBalance = monthIncome - monthExpense - monthRefund;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !user) return;
    
    try {
      await addDoc(collection(db, "workspaces", activeWorkspace.id, "transactions"), {
        workspaceId: activeWorkspace.id,
        type: formData.type,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        date: Date.now(),
        isRecurring: formData.isRecurring,
        recurringDay: formData.isRecurring ? parseInt(formData.recurringDay) : null,
        createdBy: user.uid,
        createdAt: Date.now()
      });
      
      if (activeWorkspace.type === "partnership") {
        await logAudit(activeWorkspace.id, user.uid, user.displayName || "Kullanıcı", "Ekleme", `Yeni bir ${formData.type === 'income' ? 'gelir' : formData.type === 'expense' ? 'gider' : 'alacak'} eklendi: ${formData.description}`);
      }
      
      setIsModalOpen(false);
      setFormData({ type: "expense", amount: "", category: "", description: "", isRecurring: false, recurringDay: "1" });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if(!activeWorkspace || !user || !confirm("Silmek istediğinize emin misiniz?")) return;
    try {
      const docRef = doc(db, "workspaces", activeWorkspace.id, "transactions", id);
      const snap = await getDoc(docRef);
      const data = snap.data();
      
      await deleteDoc(docRef);
      
      if (activeWorkspace.type === "partnership" && data) {
        await logAudit(activeWorkspace.id, user.uid, user.displayName || "Kullanıcı", "Silme", `Bir işlem silindi: ${data.description}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica");

    // Title
    doc.setFontSize(20);
    doc.text(`${activeWorkspace?.name || 'Çalışma Alanı'} - Finans Raporu`, 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Tarih: ${format(selectedMonth, 'MMMM yyyy', { locale: tr })}`, 14, 30);

    // Summary
    doc.setFontSize(12);
    doc.text("Aylik Ozet", 14, 45);
    
    const summaryData = [
      ["Toplam Gelir", `+ ${monthIncome.toLocaleString('tr-TR')} TL`],
      ["Toplam Gider", `- ${monthExpense.toLocaleString('tr-TR')} TL`],
      ["Toplam Iade/Iptal", `- ${monthRefund.toLocaleString('tr-TR')} TL`],
      ["Net Durum", `${netBalance >= 0 ? '+' : ''}${netBalance.toLocaleString('tr-TR')} TL`]
    ];

    if (activeWorkspace?.type === "partnership") {
      summaryData.push(["Ortak 1 ( %50 )", `${(netBalance / 2).toLocaleString('tr-TR')} TL`]);
      summaryData.push(["Ortak 2 ( %50 )", `${(netBalance / 2).toLocaleString('tr-TR')} TL`]);
    }

    autoTable(doc, {
      startY: 50,
      head: [["Kalem", "Tutar"]],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 50;

    // Transactions Table
    doc.text("Islem Detaylari", 14, finalY + 15);

    const tableData = transactions.map(t => [
      format(t.date, 'dd/MM/yyyy'),
      t.type === 'income' ? 'Gelir' : t.type === 'expense' ? 'Gider' : t.type === 'refund' ? 'Iade' : 'Alacak',
      t.category,
      t.description,
      `${t.type === 'expense' || t.type === 'refund' ? '-' : '+'}${t.amount.toLocaleString('tr-TR')} TL`
    ]);

    autoTable(doc, {
      startY: finalY + 20,
      head: [["Tarih", "Tip", "Kategori", "Aciklama", "Tutar"]],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`finans-raporu-${format(selectedMonth, 'MM-yyyy')}.pdf`);
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase()) || 
                          t.category.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterType === "all" || t.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-4 md:p-8 h-full flex flex-col pb-20 md:pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          <button onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))} className="text-slate-400 hover:text-slate-900">&lt;</button>
          <span className="font-bold min-w-[120px] text-center capitalize text-sm">{format(selectedMonth, 'MMMM yyyy', { locale: tr })}</span>
          <button onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))} className="text-slate-400 hover:text-slate-900">&gt;</button>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={generatePDF}
            className="bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-indigo-50 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Rapor PDF</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">İşlem Ekle</span>
          </button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
         <button onClick={() => setFilterType(filterType === 'income' ? 'all' : 'income')} className={clsx("text-left bg-white p-4 rounded-2xl border shadow-sm flex flex-col justify-between transition-all hover:border-emerald-300", filterType === 'income' ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-slate-200')}>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Aylık Gelir</p>
           <h3 className="text-xl font-bold text-emerald-600">₺{monthIncome.toLocaleString('tr-TR')}</h3>
         </button>
         <button onClick={() => setFilterType(filterType === 'expense' ? 'all' : 'expense')} className={clsx("text-left bg-white p-4 rounded-2xl border shadow-sm flex flex-col justify-between transition-all hover:border-rose-300", filterType === 'expense' ? 'ring-2 ring-rose-500 border-rose-500' : 'border-slate-200')}>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Aylık Gider</p>
           <h3 className="text-xl font-bold text-rose-600">₺{monthExpense.toLocaleString('tr-TR')}</h3>
         </button>
         <button onClick={() => setFilterType(filterType === 'refund' ? 'all' : 'refund')} className={clsx("text-left bg-white p-4 rounded-2xl border shadow-sm flex flex-col justify-between transition-all hover:border-orange-300", filterType === 'refund' ? 'ring-2 ring-orange-500 border-orange-500' : 'border-slate-200')}>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">İade/İptal</p>
           <h3 className="text-xl font-bold text-orange-500">₺{monthRefund.toLocaleString('tr-TR')}</h3>
         </button>
         <button onClick={() => setFilterType('all')} className={clsx("text-left p-4 rounded-2xl border shadow-sm flex flex-col justify-between transition-all hover:opacity-80", netBalance >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200", filterType === 'all' && 'ring-2 ring-indigo-500')}>
           <p className={clsx("text-[10px] font-bold uppercase tracking-wider mb-1", netBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>Net Durum</p>
           <h3 className={clsx("text-xl font-bold", netBalance >= 0 ? "text-emerald-700" : "text-rose-700")}>
             {netBalance >= 0 ? '+' : ''}₺{netBalance.toLocaleString('tr-TR')}
           </h3>
         </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 flex-1 overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
           <div className="flex-1 relative">
             <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
             <input type="text" placeholder="İşlemlerde ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-indigo-500 transition-colors" />
           </div>
           <button className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50">
             <Filter className="w-4 h-4" />
           </button>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-4 p-4 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50">
          <div className="col-span-2 md:col-span-2">Açıklama & Kategori</div>
          <div className="hidden md:block">Tarih</div>
          <div>Tip</div>
          <div className="text-right">Tutar</div>
          <div className="text-right"></div>
        </div>
        
        <div className="flex-1 overflow-y-auto relative">
          {loading ? (
            <div className="p-8 text-center text-slate-400 flex items-center justify-center h-full">Yükleniyor...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full">
               <Wallet className="w-10 h-10 text-slate-200 mb-3" />
               <p>Kayıt bulunamadı.</p>
            </div>
          ) : (
            filteredTransactions.map(t => (
              <div key={t.id} className="grid grid-cols-4 md:grid-cols-6 gap-4 p-4 border-b border-slate-50 items-center hover:bg-slate-50 transition-colors">
                <div className="col-span-2 md:col-span-2">
                  <p className="font-bold text-sm truncate text-slate-800">{t.description}</p>
                  <p className="text-[11px] font-medium text-slate-500">{t.category}</p>
                  {t.isRecurring && <span className="inline-flex items-center gap-1 text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded mt-1 font-bold"><Clock className="w-3 h-3"/> Her ayın {t.recurringDay}. günü</span>}
                </div>
                <div className="hidden md:block text-xs font-medium text-slate-500">
                  {format(t.date, 'dd MMM yyyy', { locale: tr })}
                </div>
                <div>
                   {t.type === 'income' ? <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md font-bold border border-emerald-100"><ArrowUpRight className="w-3 h-3"/> Gelir</span> : 
                    t.type === 'expense' ? <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-1 rounded-md font-bold border border-rose-100"><ArrowDownRight className="w-3 h-3"/> Gider</span> :
                    t.type === 'refund' ? <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-1 rounded-md font-bold border border-orange-100"><RotateCcw className="w-3 h-3"/> İade</span> :
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md font-bold border border-indigo-100"><Clock className="w-3 h-3"/> Alacak</span>}
                </div>
                <div className={clsx("text-right font-bold text-sm", t.type === 'expense' || t.type === 'refund' ? 'text-rose-600' : 'text-emerald-600')}>
                  {t.type === 'expense' || t.type === 'refund' ? '-' : '+'}₺{t.amount.toLocaleString('tr-TR')}
                </div>
                <div className="text-right">
                  <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl"
            >
              <h2 className="text-xl font-bold mb-6">Yeni İşlem Ekle</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div className="grid grid-cols-4 gap-2 bg-slate-50 p-1 rounded-xl">
                  {(['expense', 'income', 'refund', 'receivable'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({...formData, type})}
                      className={clsx(
                        "py-2 text-[10px] sm:text-xs font-bold rounded-lg capitalize transition-colors",
                        formData.type === type ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      {type === 'expense' ? 'Gider' : type === 'income' ? 'Gelir' : type === 'refund' ? 'İade/İptal' : 'Alacak'}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tutar (₺)</label>
                  <input type="number" required min="0" step="0.01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                    value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Kategori</label>
                    <input type="text" required placeholder="Örn: Kira, Maaş..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all text-sm"
                      value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Açıklama</label>
                    <input type="text" required placeholder="Kısa açıklama..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all text-sm"
                      value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <input type="checkbox" id="recurring" 
                    checked={formData.isRecurring} onChange={e => setFormData({...formData, isRecurring: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="recurring" className="text-sm font-medium">Bu işlemi her ay tekrarla</label>
                </div>

                {formData.isRecurring && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Her Ayın Kaçıncı Günü?</label>
                    <input type="number" required min="1" max="31"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all text-sm"
                      value={formData.recurringDay} onChange={e => setFormData({...formData, recurringDay: e.target.value})}
                    />
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
    </div>
  );
}
