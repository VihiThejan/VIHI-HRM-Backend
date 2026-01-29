import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export interface Leave {
  _id: string;
  employeeId: {
    _id: string;
    name: string;
    email: string;
    department: string;
    position: string;
  };
  type: 'sick' | 'casual' | 'annual' | 'unpaid';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  approvedDate?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  sick: { used: number; total: number };
  casual: { used: number; total: number };
  annual: { used: number; total: number };
  unpaid: { used: number; total: number };
}

export const useLeaves = () => {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaves = async (filters?: { status?: string; type?: string; page?: number; limit?: number }) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response: any = await apiClient.get(`/leaves${params.toString() ? `?${params.toString()}` : ''}`);
      setLeaves(response.data.data);
      return response.data;
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch leaves');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getLeave = async (id: string) => {
    try {
      const response: any = await apiClient.get(`/leaves/${id}`);
      return response.data.data;
    } catch (err: any) {
      throw err?.response?.data?.message || 'Failed to fetch leave';
    }
  };

  const createLeave = async (data: {
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) => {
    try {
      const response: any = await apiClient.post('/leaves', data);
      await fetchLeaves(); // Refresh list
      return response.data.data;
    } catch (err: any) {
      throw err?.response?.data?.message || 'Failed to create leave request';
    }
  };

  const updateLeave = async (id: string, data: {
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) => {
    try {
      const response: any = await apiClient.put(`/leaves/${id}`, data);
      await fetchLeaves(); // Refresh list
      return response.data.data;
    } catch (err: any) {
      throw err?.response?.data?.message || 'Failed to update leave';
    }
  };

  const approveLeave = async (id: string) => {
    try {
      const response: any = await apiClient.put(`/leaves/${id}/approve`);
      await fetchLeaves(); // Refresh list
      return response.data.data;
    } catch (err: any) {
      throw err?.response?.data?.message || 'Failed to approve leave';
    }
  };

  const rejectLeave = async (id: string, rejectionReason: string) => {
    try {
      const response: any = await apiClient.put(`/leaves/${id}/reject`, { rejectionReason });
      await fetchLeaves(); // Refresh list
      return response.data.data;
    } catch (err: any) {
      throw err?.response?.data?.message || 'Failed to reject leave';
    }
  };

  const deleteLeave = async (id: string) => {
    try {
      await apiClient.delete(`/leaves/${id}`);
      await fetchLeaves(); // Refresh list
    } catch (err: any) {
      throw err?.response?.data?.message || 'Failed to delete leave';
    }
  };

  const getLeaveBalance = async (employeeId?: string) => {
    try {
      const params = employeeId ? `?employeeId=${employeeId}` : '';
      const response: any = await apiClient.get(`/leaves/balance${params}`);
      return response.data.data as LeaveBalance;
    } catch (err: any) {
      throw err?.response?.data?.message || 'Failed to fetch leave balance';
    }
  };

  return {
    leaves,
    loading,
    error,
    fetchLeaves,
    getLeave,
    createLeave,
    updateLeave,
    approveLeave,
    rejectLeave,
    deleteLeave,
    getLeaveBalance,
  };
};
