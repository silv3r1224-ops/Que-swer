export type Role = 'STUDENT' | 'MODERATOR' | 'ADMIN';

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  reputation: number;
  avatarUrl?: string | null;
  role?: Role;
}

export interface Me extends UserSummary {
  email: string;
  bio?: string | null;
  createdAt: string;
}

export interface Department {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  _count?: { courses: number; papers: number };
}

export interface Course {
  id: string;
  code: string;
  name: string;
  departmentId: string;
}

export interface Tag {
  slug: string;
  name: string;
  usageCount?: number;
}

export interface QuestionListItem {
  id: string;
  title: string;
  body: string;
  score: number;
  views: number;
  status: 'OPEN' | 'CLOSED' | 'HIDDEN';
  createdAt: string;
  updatedAt: string;
  department?: Pick<Department, 'id' | 'name' | 'slug'> | null;
  course?: Pick<Course, 'id' | 'code' | 'name'> | null;
  tags: Tag[];
  author: UserSummary;
  _count: { answers: number; comments: number };
}

export interface QuestionDetail extends QuestionListItem {
  bookmarked: boolean;
  myVote: 'UP' | 'DOWN' | null;
}

export interface Answer {
  id: string;
  body: string;
  isAccepted: boolean;
  score: number;
  createdAt: string;
  updatedAt: string;
  author: UserSummary;
  _count: { comments: number };
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: Pick<UserSummary, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
}

export interface Paper {
  id: string;
  title: string;
  description?: string | null;
  year: number;
  semester: number;
  examType?: string | null;
  createdAt: string;
  department: Pick<Department, 'id' | 'name' | 'slug'>;
  course?: Pick<Course, 'id' | 'code' | 'name'> | null;
  _count?: { pages: number };
}

export interface PaperDetail extends Paper {
  uploadedBy: Pick<UserSummary, 'id' | 'username' | 'displayName'>;
  pages: { id: string; pageNo: number; fileKey: string; mimeType: string; sizeBytes: number }[];
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  actor?: Pick<UserSummary, 'id' | 'username' | 'displayName'> | null;
  question?: { id: string; title: string } | null;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
