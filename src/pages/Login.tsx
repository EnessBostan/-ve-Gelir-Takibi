import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { LogIn } from "lucide-react";

export default function Login() {
  const { user, signInWithGoogle } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6">
          Ω
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">SaaS.io'ya Hoş Geldin</h1>
        <p className="text-sm text-slate-500 mb-8">
          Kişisel ve ortak finans & görev yönetimin için giriş yap.
        </p>
        
        <button 
          onClick={signInWithGoogle}
          className="w-full bg-white border-2 border-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-colors"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Google ile Giriş Yap
        </button>
      </div>
    </div>
  );
}
