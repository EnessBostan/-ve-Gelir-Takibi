import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, query, where, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";
import { Workspace } from "../types";

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspace: Workspace) => void;
  createWorkspace: (name: string, type: "personal" | "partnership") => Promise<void>;
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "workspaces"),
      where("members", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedWorkspaces = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Workspace[];
      
      setWorkspaces(fetchedWorkspaces);
      
      if (fetchedWorkspaces.length > 0) {
        // Ensure personal workspace exists
        const personal = fetchedWorkspaces.find(w => w.type === "personal" && w.ownerId === user.uid);
        
        if (personal) {
          if (!activeWorkspace) {
            setActiveWorkspace(personal);
          } else {
             // update active workspace if its details changed
             const updatedActive = fetchedWorkspaces.find(w => w.id === activeWorkspace.id);
             if (updatedActive) setActiveWorkspace(updatedActive);
          }
        }
      } else {
        // Auto-create personal workspace if none exists
        createWorkspace("Kişisel", "personal");
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const createWorkspace = async (name: string, type: "personal" | "partnership") => {
    if (!user) return;
    
    try {
      const newWorkspace = {
        name,
        type,
        ownerId: user.uid,
        members: [user.uid],
        createdAt: Date.now()
      };
      
      const docRef = await addDoc(collection(db, "workspaces"), newWorkspace);
      if (type === "personal") {
         setActiveWorkspace({ id: docRef.id, ...newWorkspace } as Workspace);
      }
    } catch (error) {
      console.error("Error creating workspace:", error);
    }
  };

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, setActiveWorkspace, createWorkspace, loading }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
