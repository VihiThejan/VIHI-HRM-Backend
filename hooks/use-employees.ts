import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import { Employee, PaginatedResponse } from '@/types';

interface UseEmployeesOptions {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
}

export function useEmployees(options: UseEmployeesOptions = {}) {
  const { page = 1, limit = 10, search, department } = options;
  
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(department && { department }),
  });

  const { data, error, mutate } = useSWR<PaginatedResponse<Employee>>(
    `/employees?${params.toString()}`,
    (url) => apiClient.get(url)
  );

  return {
    employees: data?.data || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 0,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

export function useEmployee(id: string) {
  const { data, error, mutate } = useSWR<Employee>(
    id ? `/employees/${id}` : null,
    (url) => apiClient.get(url)
  );

  return {
    employee: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

export async function createEmployee(data: Partial<Employee>) {
  return apiClient.post('/employees', data);
}

export async function updateEmployee(id: string, data: Partial<Employee>) {
  return apiClient.put(`/employees/${id}`, data);
}

export async function deleteEmployee(id: string) {
  return apiClient.delete(`/employees/${id}`);
}
