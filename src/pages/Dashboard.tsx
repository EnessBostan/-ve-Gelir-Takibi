import { useTransactions } from "../hooks/useTransactions";
import { useTasks } from "../hooks/useTasks";
import { useIdeas } from "../hooks/useIdeas";
import { Download, Plus, Wallet, Search, Lightbulb, Clock, CheckCircle2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";

export default function Dashboard() {
  const { transactions, loading: txLoading, selectedMonth } = useTransactions();
  const { tasks, loading: tasksLoading } = useTasks();
  const { ideas } = useIdeas();
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const totalReceivable = transactions.filter(t => t.type === 'receivable').reduce((acc, t) => acc + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const pieData = [
    { name: "Gelir", value: totalIncome, color: "#10b981" },
    { name: "Gider", value: totalExpense, color: "#f43f5e" }
  ].filter(d => d.value > 0);

  const exportCSV = () => {
    const headers = "Tarih,Tip,Kategori,Tutar,Aciklama\n";
    const rows = transactions.map(t => 
      `${format(t.date, 'yyyy-MM-dd')},${t.type},${t.category},${t.amount},"${t.description}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `finans_${format(selectedMonth, 'yyyy_MM')}.csv`;
    link.click();
  };

  if (txLoading || tasksLoading) {
    return <div className="p-8 text-slate-500 flex justify-center items-center h-full">Yükleniyor...</div>;
  }

  return (
    <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 h-full pb-20 md:pb-8 overflow-y-auto">
      <div className="md:col-span-8 space-y-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase">Toplam Gelir</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">₺{totalIncome.toLocaleString('tr-TR')}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase">Toplam Gider</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">₺{totalExpense.toLocaleString('tr-TR')}</h3>
            </div>
          </div>
          <div className={clsx("p-5 rounded-2xl border shadow-sm flex flex-col justify-between", netBalance >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100")}>
            <div>
              <p className={clsx("text-xs font-bold uppercase", netBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>Net Durum</p>
              <h3 className={clsx("text-2xl font-bold mt-1", netBalance >= 0 ? "text-emerald-700" : "text-rose-700")}>
                {netBalance >= 0 ? '+' : ''}₺{netBalance.toLocaleString('tr-TR')}
              </h3>
            </div>
          </div>
        </div>

        {/* Dashboard Main Visuals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col min-h-[300px] shadow-sm">
            <h2 className="font-bold text-lg mb-4">Finansal Dağılım</h2>
            <div className="flex-1 min-h-[200px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} stroke="none">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `₺${value.toLocaleString('tr-TR')}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-sm text-slate-400">
                   <Wallet className="w-10 h-10 text-slate-200 mb-2" />
                   Veri yok
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col h-[300px] shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Son Görevler</h2>
              <button onClick={() => navigate('/tasks')} className="text-xs text-indigo-600 font-bold hover:underline">Tümünü Gör</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {tasks.slice(0,4).map(task => (
                <div key={task.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
                  {task.status === 'done' ? (
                     <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : task.status === 'in_progress' ? (
                     <Clock className="w-5 h-5 text-indigo-400 shrink-0" />
                  ) : (
                     <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={clsx("text-sm font-bold truncate", task.status === 'done' && "line-through text-slate-500")}>{task.title}</p>
                    <p className="text-[11px] font-medium text-slate-500 truncate">{task.clientName}</p>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && <p className="text-sm text-slate-400 text-center mt-8">Henüz görev yok.</p>}
            </div>
          </div>
        </div>
        
        {/* Ideas Widget */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Son Fikirler
              </h2>
              <button onClick={() => navigate('/ideas')} className="text-xs text-indigo-600 font-bold hover:underline">Tümünü Gör</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {ideas.slice(0,3).map(idea => (
                 <div key={idea.id} className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-xl flex flex-col gap-2">
                    <h3 className="font-bold text-sm line-clamp-1">{idea.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2 flex-1">{idea.content}</p>
                 </div>
               ))}
               {ideas.length === 0 && <p className="text-sm text-slate-400 col-span-full">Henüz fikir eklenmemiş.</p>}
            </div>
        </div>

      </div>

      <div className="md:col-span-4 flex flex-col gap-6">
        
        {/* Quick Actions */}
        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-sm">
          <h3 className="text-sm font-bold opacity-70 uppercase tracking-widest">Hızlı İşlemler</h3>
          <p className="text-xs text-slate-400 mt-2">Finans verilerini raporla.</p>
          <button 
            onClick={exportCSV}
            className="w-full bg-white/10 hover:bg-white/20 transition-colors py-3 rounded-xl mt-4 text-xs font-bold border border-white/10 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            CSV Olarak Dışa Aktar
          </button>
          <button 
            onClick={() => navigate('/finance')}
            className="w-full bg-indigo-600 hover:bg-indigo-500 transition-colors py-3 rounded-xl mt-3 text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-indigo-900"
          >
            <Plus className="w-4 h-4" />
            Yeni İşlem Ekle
          </button>
        </div>

        {/* Audit Logs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex-1 overflow-hidden flex flex-col min-h-[300px] shadow-sm">
          <h2 className="font-bold text-lg mb-4">İşlem Geçmişi (Audit)</h2>
          <div className="space-y-4 overflow-y-auto pr-2 flex-1">
            {activeWorkspace?.type === 'personal' ? (
              <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl text-center">Kişisel alanda denetim kayıtları gizlidir.</p>
            ) : (
              <AuditLogsList workspaceId={activeWorkspace?.id} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Added AuditLogsList component
import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { AuditLog } from "../types";

function AuditLogsList({ workspaceId }: { workspaceId?: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  
  useEffect(() => {
    if (!workspaceId) return;
    const q = query(
      collection(db, "workspaces", workspaceId, "audit_logs"),
      orderBy("timestamp", "desc"),
      limit(20)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AuditLog[]);
    });
    
    return unsubscribe;
  }, [workspaceId]);

  if (logs.length === 0) {
    return <p className="text-xs text-slate-400 text-center mt-4">Henüz kayıt yok.</p>;
  }

  return (
    <>
      {logs.map(log => (
        <div key={log.id} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0 border border-indigo-100">
            {log.userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-slate-900"><span className="font-bold">{log.userName}</span> {log.action.toLowerCase()} yaptı.</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{format(log.timestamp, "dd MMM HH:mm", { locale: tr })} • {log.details}</p>
          </div>
        </div>
      ))}
    </>
  );
}
