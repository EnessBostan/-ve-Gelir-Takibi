import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Wallet, CheckSquare, Lightbulb, Plus, ChevronDown, User, LogOut, Bell } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { activeWorkspace, workspaces, setActiveWorkspace, createWorkspace } = useWorkspace();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [memberAddError, setMemberAddError] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    let unsub = () => {};
    const fetchNotifications = async () => {
      const { collection, query, where, onSnapshot } = await import('firebase/firestore');
      const { db } = await import('../../lib/firebase');
      
      const q = query(collection(db, "notifications"), where("userId", "==", user.uid), where("read", "==", false));
      unsub = onSnapshot(q, (snap) => {
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    };
    fetchNotifications();
    return () => unsub();
  }, [user]);

  const markNotificationAsRead = async (id: string) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../../lib/firebase');
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch(err) {
      console.error(err);
    }
  };

  const handleCreatePartnership = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWorkspaceName.trim()) {
      createWorkspace(newWorkspaceName.trim(), "partnership");
      setNewWorkspaceName("");
      setIsCreateModalOpen(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberAddError("");
    if (!activeWorkspace || activeWorkspace.type !== 'partnership') return;
    
    try {
      const { collection, query, where, getDocs, updateDoc, arrayUnion, doc, addDoc } = await import('firebase/firestore');
      const { db } = await import('../../lib/firebase');
      
      const q = query(collection(db, "users"), where("email", "==", newMemberEmail.trim()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setMemberAddError("Bu e-posta adresine sahip bir kullanıcı bulunamadı. Lütfen sisteme kayıtlı bir e-posta girin.");
        return;
      }
      
      const newMemberUid = snap.docs[0].id;
      
      if (activeWorkspace.members.includes(newMemberUid)) {
        setMemberAddError("Bu kullanıcı zaten ortaklıkta bulunuyor.");
        return;
      }
      
      await updateDoc(doc(db, "workspaces", activeWorkspace.id), {
        members: arrayUnion(newMemberUid)
      });

      // Pop-up bildirim oluştur
      await addDoc(collection(db, "notifications"), {
        userId: newMemberUid,
        type: "workspace_invite",
        workspaceId: activeWorkspace.id,
        workspaceName: activeWorkspace.name,
        inviterName: user?.displayName || "Bir kullanıcı",
        read: false,
        createdAt: Date.now()
      });
      
      setNewMemberEmail("");
      setIsAddMemberModalOpen(false);
      alert("Kullanıcı ortaklığa başarıyla eklendi! Sisteme girdiğinde kendisine bildirim gösterilecek.");
    } catch (err) {
      console.error(err);
      setMemberAddError("Bir hata oluştu.");
    }
  };

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/finance", icon: Wallet, label: "Finans" },
    { to: "/tasks", icon: CheckSquare, label: "Görevler" },
    { to: "/ideas", icon: Lightbulb, label: "Fikirler" }
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F8F9FA] font-sans text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-slate-200 bg-white flex-col z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
            Ω
          </div>
          <span className="font-bold text-xl tracking-tight">SaaS.io</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium",
                  isActive
                    ? "bg-slate-100 text-indigo-700"
                    : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 relative">
          <button 
            className="w-full bg-slate-50 p-3 rounded-xl text-left hover:bg-slate-100 transition-colors"
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
          >
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Aktif Alan</p>
            <div className="flex items-center gap-2">
              <div className={clsx(
                "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold",
                activeWorkspace?.type === "personal" ? "bg-indigo-100 text-indigo-600" : "bg-orange-100 text-orange-600"
              )}>
                {activeWorkspace?.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium truncate flex-1">{activeWorkspace?.name}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </button>

          <AnimatePresence>
            {showWorkspaceMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden z-30"
              >
                <div className="max-h-48 overflow-y-auto p-2">
                  {workspaces.map(w => (
                    <button
                      key={w.id}
                      onClick={() => { setActiveWorkspace(w); setShowWorkspaceMenu(false); }}
                      className={clsx(
                        "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 mb-1",
                        w.id === activeWorkspace?.id ? "bg-slate-100 font-bold text-indigo-700" : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <div className={clsx(
                        "w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0",
                        w.type === "personal" ? "bg-indigo-100 text-indigo-600" : "bg-orange-100 text-orange-600"
                      )}>
                        {w.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{w.name}</span>
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t border-slate-100 bg-slate-50">
                  <button 
                    onClick={() => { setShowWorkspaceMenu(false); setIsCreateModalOpen(true); }}
                    className="w-full px-3 py-2 text-left text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Yeni Ortaklık Kur
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden md:flex h-20 border-b border-slate-200 bg-white px-8 items-center justify-between z-10 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {location.pathname === "/" ? `Hoş Geldin, ${user?.displayName?.split(" ")[0] || "Kullanıcı"}` : 
               location.pathname === "/finance" ? "Finans Yönetimi" : 
               location.pathname === "/ideas" ? "Fikirler" : "Görev Panosu"}
            </h1>
            <p className="text-sm text-slate-500">
              {location.pathname === "/" ? "İşte genel özetiniz." : `Aktif alan: ${activeWorkspace?.name}`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {activeWorkspace?.type === 'partnership' && (
              <button 
                onClick={() => setIsAddMemberModalOpen(true)}
                className="hidden sm:flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ortak Ekle
              </button>
            )}
            <button onClick={logout} className="text-slate-400 hover:text-rose-500 p-2 transition-colors" title="Çıkış Yap">
              <LogOut className="w-5 h-5" />
            </button>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center">
                <User className="w-5 h-5 text-slate-500" />
              </div>
            )}
          </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden flex h-16 border-b border-slate-200 bg-white px-4 items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-xs">
              Ω
            </div>
            <span className="font-bold text-lg tracking-tight">SaaS.io</span>
          </div>
          <div className="flex items-center gap-3">
             {activeWorkspace?.type === 'partnership' && (
               <button onClick={() => setIsAddMemberModalOpen(true)} className="flex items-center justify-center bg-indigo-50 text-indigo-700 w-8 h-8 rounded-full">
                 <Plus className="w-4 h-4" />
               </button>
             )}
             <button onClick={() => setShowWorkspaceMenu(true)} className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md text-xs font-medium">
               {activeWorkspace?.name}
               <ChevronDown className="w-3 h-3" />
             </button>
             {user?.photoURL && <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />}
          </div>
        </header>
        
        {/* Mobile Workspace Modal (simplified) */}
        {showWorkspaceMenu && (
          <div className="md:hidden fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4" onClick={() => setShowWorkspaceMenu(false)}>
             <motion.div 
               initial={{ y: "100%" }} animate={{ y: 0 }}
               className="bg-white w-full rounded-t-2xl p-4 flex flex-col gap-2 max-h-[80vh] overflow-y-auto"
               onClick={e => e.stopPropagation()}
             >
                <h3 className="font-bold text-lg mb-2">Çalışma Alanı Seç</h3>
                {workspaces.map(w => (
                    <button
                      key={w.id}
                      onClick={() => { setActiveWorkspace(w); setShowWorkspaceMenu(false); }}
                      className={clsx(
                        "w-full text-left px-4 py-3 rounded-xl text-sm flex items-center gap-3",
                        w.id === activeWorkspace?.id ? "bg-indigo-50 font-bold text-indigo-700" : "bg-slate-50 text-slate-700"
                      )}
                    >
                      <div className={clsx(
                        "w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0",
                        w.type === "personal" ? "bg-indigo-100 text-indigo-600" : "bg-orange-100 text-orange-600"
                      )}>
                        {w.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{w.name}</span>
                    </button>
                ))}
                <button 
                  onClick={() => { setShowWorkspaceMenu(false); setIsCreateModalOpen(true); }}
                  className="w-full px-4 py-3 text-left text-sm text-indigo-600 font-medium bg-indigo-50 rounded-xl flex items-center gap-2 mt-2 justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Yeni Ortaklık Kur
                </button>
             </motion.div>
          </div>
        )}

        <div className="flex-1 overflow-auto bg-[#F8F9FA]">
          <Outlet />
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around z-40 pb-safe">
        {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={clsx(
                  "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                  isActive
                    ? "text-indigo-600"
                    : "text-slate-400"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </NavLink>
            );
          })}
      </nav>

      {/* Create Workspace Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl"
            >
              <h2 className="text-xl font-bold mb-2">Yeni Ortaklık Kur</h2>
              <p className="text-sm text-slate-500 mb-6">Farklı bir isim belirleyerek ortak finans ve görev yönetimi için yeni bir alan oluşturun.</p>
              
              <form onSubmit={handleCreatePartnership} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Alan Adı</label>
                  <input type="text" required placeholder="Örn: Proje X, Aile Bütçesi..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all font-medium text-sm"
                    value={newWorkspaceName} onChange={e => setNewWorkspaceName(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">İptal</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">Oluştur</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Add Member Modal */}
        {isAddMemberModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl"
            >
              <h2 className="text-xl font-bold mb-2">Ortak Ekle</h2>
              <p className="text-sm text-slate-500 mb-6">Bu ortaklığa katılmasını istediğiniz kişinin sisteme kayıtlı Google e-posta adresini girin.</p>
              
              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">E-Posta Adresi</label>
                  <input type="email" required placeholder="Örn: ornek@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all font-medium text-sm"
                    value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)}
                  />
                </div>
                
                {memberAddError && (
                  <p className="text-xs font-bold text-rose-500 bg-rose-50 p-3 rounded-xl">{memberAddError}</p>
                )}
                
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setIsAddMemberModalOpen(false); setMemberAddError(""); }} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">İptal</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">Ekle</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Notifications Modal */}
        {notifications.length > 0 && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl flex flex-col gap-4"
            >
              <div className="flex items-center gap-3 text-indigo-600">
                <div className="bg-indigo-100 p-3 rounded-full">
                  <Bell className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Yeni Bildirim!</h2>
              </div>
              
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {notifications.map(notif => (
                  <div key={notif.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-3">
                    <p className="text-sm text-slate-700">
                      <span className="font-bold">{notif.inviterName}</span> sizi 
                      <span className="font-bold text-indigo-600"> {notif.workspaceName} </span> 
                      adlı ortak çalışma alanına ekledi! Artık sol menüden bu alana geçiş yapabilirsiniz.
                    </p>
                    <button 
                      onClick={() => markNotificationAsRead(notif.id)}
                      className="w-full bg-indigo-600 text-white font-bold py-2 rounded-xl text-sm hover:bg-indigo-700 transition-colors"
                    >
                      Tamam, Anladım
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
