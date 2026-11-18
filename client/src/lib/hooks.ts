import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPost } from './api';
import type {
  Answer,
  Comment,
  Department,
  Notification,
  Paper,
  PaperDetail,
  QuestionDetail,
  QuestionListItem,
  Tag,
} from './types';

/* ------------------------------------------------------------- Catalog */

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => apiGet<{ departments: Department[] }>('/api/v1/departments'),
  });
}

export function useCourses(departmentId?: string) {
  return useQuery({
    queryKey: ['courses', departmentId ?? 'all'],
    queryFn: () =>
      apiGet<{ courses: { id: string; code: string; name: string; departmentId: string }[] }>(
        '/api/v1/courses',
        { departmentId },
      ),
    enabled: Boolean(departmentId),
  });
}

export function useTags() {
  return useQuery({ queryKey: ['tags'], queryFn: () => apiGet<{ tags: Tag[] }>('/api/v1/tags') });
}

/* ---------------------------------------------------------- Questions */

export interface QuestionFilters {
  page?: number;
  pageSize?: number;
  sort?: 'new' | 'top' | 'unanswered' | 'old';
  departmentId?: string;
  courseId?: string;
  tag?: string;
  q?: string;
}

export function useQuestions(filters: QuestionFilters) {
  return useQuery({
    queryKey: ['questions', filters],
    queryFn: () =>
      apiGet<{
        questions: QuestionListItem[];
        meta: { totalPages: number; page: number; total: number };
      }>('/api/v1/questions', { ...filters }),
  });
}

export function useQuestion(id: string) {
  return useQuery({
    queryKey: ['question', id],
    queryFn: () => apiGet<{ question: QuestionDetail }>(`/api/v1/questions/${id}`),
    enabled: Boolean(id),
  });
}

export function useAnswers(questionId: string, sort: 'new' | 'top' | 'old' = 'new') {
  return useQuery({
    queryKey: ['answers', questionId, sort],
    queryFn: () =>
      apiGet<{ answers: Answer[]; meta: { total: number; totalPages: number; page: number } }>(
        `/api/v1/questions/${questionId}/answers`,
        { sort, pageSize: 50 },
      ),
    enabled: Boolean(questionId),
  });
}

export function useVote(elType: 'QUESTION' | 'ANSWER') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, direction }: { itemId: string; direction: 'UP' | 'DOWN' }) =>
      apiPost<{ score: number; direction: 'UP' | 'DOWN' | null }>(
        `/api/v1/votes/${elType}/${itemId}`,
        { direction },
      ),
    onSuccess: (data, variables) => {
      if (elType === 'QUESTION') {
        qc.setQueryData(['question', variables.itemId], (old?: { question: QuestionDetail }) =>
          old
            ? { ...old, question: { ...old.question, score: data.score, myVote: data.direction } }
            : old,
        );
        qc.invalidateQueries({ queryKey: ['questions'] });
      }
    },
  });
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) =>
      apiPost<{ bookmarked: boolean }>(`/api/v1/users/@me/bookmarks/${questionId}`),
    onSuccess: (_data, questionId) => {
      qc.setQueryData(['question', questionId], (old?: { question: QuestionDetail }) =>
        old ? { ...old, question: { ...old.question, bookmarked: !old.question.bookmarked } } : old,
      );
    },
  });
}

export const useAskQuestion = () =>
  useMutation({
    mutationFn: (body: {
      title: string;
      body: string;
      departmentId?: string;
      courseId?: string;
      tags: string[];
    }) => apiPost<{ question: { id: string } }>('/api/v1/questions', body),
  });

export const useAnswerQuestion = (questionId: string) =>
  useMutation({
    mutationFn: (body: string) =>
      apiPost<{ answer: { id: string } }>(`/api/v1/questions/${questionId}/answers`, { body }),
  });

export const useAcceptAnswer = () =>
  useMutation({
    mutationFn: (answerId: string) =>
      apiPost<{ accepted: boolean }>(`/api/v1/answers/${answerId}/accept`),
  });

export const useCommentOnAnswer = (answerId: string) =>
  useMutation({
    mutationFn: (body: string) =>
      apiPost<{ comment: { id: string } }>(`/api/v1/answers/${answerId}/comments`, { body }),
  });

export function useAnswerComments(answerId: string) {
  return useQuery({
    queryKey: ['answer-comments', answerId],
    queryFn: () => apiGet<{ comments: Comment[] }>(`/api/v1/answers/${answerId}/comments`),
    enabled: Boolean(answerId),
  });
}

export const useDeleteQuestion = () =>
  useMutation({ mutationFn: (questionId: string) => apiDelete(`/api/v1/questions/${questionId}`) });

export const useDeleteAnswer = () =>
  useMutation({ mutationFn: (answerId: string) => apiDelete(`/api/v1/answers/${answerId}`) });

export const useDeleteComment = () =>
  useMutation({ mutationFn: (commentId: string) => apiDelete(`/api/v1/comments/${commentId}`) });

export const useReportItem = () =>
  useMutation({
    mutationFn: (body: {
      itemType: 'QUESTION' | 'ANSWER' | 'COMMENT' | 'USER';
      itemId: string;
      reason: string;
    }) => apiPost('/api/v1/reports', body),
  });

/* ------------------------------------------------------------ Papers */

export interface PaperFilters {
  page?: number;
  pageSize?: number;
  departmentId?: string;
  courseId?: string;
  year?: number;
  semester?: number;
  sort?: 'new' | 'old';
}

export function usePapers(filters: PaperFilters) {
  return useQuery({
    queryKey: ['papers', filters],
    queryFn: () =>
      apiGet<{ papers: Paper[]; meta: { totalPages: number; page: number; total: number } }>(
        '/api/v1/papers',
        { ...filters },
      ),
  });
}

export function usePaper(id: string) {
  return useQuery({
    queryKey: ['paper', id],
    queryFn: () => apiGet<{ paper: PaperDetail }>(`/api/v1/papers/${id}`),
    enabled: Boolean(id),
  });
}

export function useDeletePaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paperId: string) => apiDelete(`/api/v1/papers/${paperId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['papers'] }),
  });
}

/* ---------------------------------------------------- Notifications */

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      apiGet<{
        notifications: Notification[];
        unread: number;
        meta: { totalPages: number; page: number };
      }>('/api/v1/notifications', { pageSize: 50 }),
  });
}

export const useMarkAllRead = () =>
  useMutation({ mutationFn: () => apiPost<{ ok: boolean }>('/api/v1/notifications/read-all') });

/* ------------------------------------------------------- User stuff */

export function useMyBookmarks() {
  return useQuery({
    queryKey: ['bookmarks'],
    queryFn: () =>
      apiGet<{ bookmarks: { id: string; createdAt: string; question: QuestionListItem }[] }>(
        '/api/v1/users/@me/bookmarks',
        { pageSize: 50 },
      ),
  });
}

export function useMyActivity() {
  return useQuery({
    queryKey: ['my-activity'],
    queryFn: () =>
      apiGet<{
        questions: {
          id: string;
          title: string;
          createdAt: string;
          score: number;
          status: string;
        }[];
        answers: {
          id: string;
          createdAt: string;
          score: number;
          isAccepted: boolean;
          question: { id: string; title: string };
        }[];
      }>('/api/v1/users/@me/activity'),
  });
}
