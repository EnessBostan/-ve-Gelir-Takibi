import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";

export const logAudit = async (workspaceId: string, userId: string, userName: string, action: string, details: string) => {
  try {
    await addDoc(collection(db, "workspaces", workspaceId, "audit_logs"), {
      workspaceId,
      userId,
      userName,
      action,
      details,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error writing audit log:", error);
  }
};
