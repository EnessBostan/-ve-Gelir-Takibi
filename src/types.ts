export type Workspace = {
  id: string;
  name: string;
  type: "personal" | "partnership";
  ownerId: string;
  members: string[]; // array of UIDs
  createdAt: number;
};

export type TransactionType = "income" | "expense" | "receivable" | "refund";

export type Transaction = {
  id: string;
  workspaceId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: number; // timestamp
  isRecurring?: boolean;
  recurringDay?: number; // 1-31
  createdBy: string;
  createdAt: number;
};

export type TaskStatus = "todo" | "in_progress" | "done";

export type Task = {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  clientName: string;
  status: TaskStatus;
  attachmentUrl?: string;
  createdBy: string;
  createdAt: number;
};

export type AuditLog = {
  id: string;
  workspaceId: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: number;
};

export type IdeaStatus = "new" | "discussed" | "archived";

export type Idea = {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  status: IdeaStatus;
  createdBy: string;
  createdAt: number;
};
