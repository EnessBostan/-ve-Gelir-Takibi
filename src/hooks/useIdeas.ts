import { useEffect, useState } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { Idea } from "../types";

export function useIdeas() {
  const { activeWorkspace } = useWorkspace();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace) {
      setIdeas([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "workspaces", activeWorkspace.id, "ideas"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Idea[];
      setIdeas(fetched);
      setLoading(false);
    });

    return unsubscribe;
  }, [activeWorkspace]);

  return { ideas, loading };
}
