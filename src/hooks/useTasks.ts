import { useEffect, useState } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { Task } from "../types";

export function useTasks() {
  const { activeWorkspace } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "workspaces", activeWorkspace.id, "tasks")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(fetched.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });

    return unsubscribe;
  }, [activeWorkspace]);

  return { tasks, loading };
}
