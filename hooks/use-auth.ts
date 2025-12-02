import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';

export function useAuth() {
  const { data, error, mutate } = useSWR('/auth/me', () => 
    apiClient.get('/auth/me')
  );

  return {
    user: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

export async function login(email: string, password: string) {
  return apiClient.post('/auth/login', { email, password });
}

export async function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
  return apiClient.post('/auth/logout');
}
