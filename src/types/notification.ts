export type NotificationType =
  | "ASSIGNMENT_POSTED"
  | "ASSIGNMENT_GRADED"
  | "SUBMISSION_RECEIVED"
  | "LESSON_UPDATED"
  | "ANNOUNCEMENT"
  | "PAYMENT_RECEIVED"
  | "QUIZ_GRADED"
  | "LIVE_CLASS_STARTED"
  | "LIVE_CLASS_REMINDER"
  | "MESSAGE_RECEIVED";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface LiveClass {
  id: string;
  classId: string;
  termId: string | null;
  title: string;
  description: string | null;
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  roomName: string | null;
  joinUrl: string | null;
  recordingUrl: string | null;
  duration: number | null;
  attendance?: {
    id: string;
    user: { id: string; firstName: string; lastName: string };
    joinedAt: string;
    leftAt: string | null;
    durationSeconds: number | null;
  }[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  targetRoles: string[];
  classId: string | null;
  endDate: string | null;
  createdAt: string;
}

export interface Message {
  id: string;
  sender: { id: string; firstName: string; lastName: string };
  content: string;
  attachments: string[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: { id: string; firstName: string; lastName: string }[];
  lastMessage: Message | null;
  unreadCount: number;
  createdAt: string;
}
