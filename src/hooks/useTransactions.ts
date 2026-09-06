import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { Transaction } from "../types";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { tr } from "date-fns/locale";

export function useTransactions() {
  const { activeWorkspace } = useWorkspace();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    if (!activeWorkspace) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const start = startOfMonth(selectedMonth).getTime();
    const end = endOfMonth(selectedMonth).getTime();

    const q = query(
      collection(db, "workspaces", activeWorkspace.id, "transactions"),
      where("date", ">=", start),
      where("date", "<=", end)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(fetched.sort((a, b) => b.date - a.date));
      setLoading(false);
    });

    return unsubscribe;
  }, [activeWorkspace, selectedMonth]);

  return { transactions, loading, selectedMonth, setSelectedMonth };
}
