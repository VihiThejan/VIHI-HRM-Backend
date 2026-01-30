"use client";

import { useState, useEffect } from "react";
import { useLeaves, Leave, LeaveBalance } from "@/hooks/use-leaves";
import { Calendar, Plus, Filter, CheckCircle, XCircle, Clock, Trash2, Edit, AlertCircle } from "lucide-react";

export default function LeavesPage() {
  const {
    leaves,
    loading,
    error,
    fetchLeaves,
    createLeave,
    updateLeave,
    approveLeave,
    rejectLeave,
    deleteLeave,
    getLeaveBalance,
  } = useLeaves();

  const [activeTab, setActiveTab] = useState<'my-leaves' | 'all-leaves' | 'new-request'>('my-leaves');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [userRole, setUserRole] = useState<string>('employee');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // New leave form state
  const [formData, setFormData] = useState({
    type: 'sick',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [editingLeave, setEditingLeave] = useState<Leave | null>(null);

  useEffect(() => {
    loadData();
    checkUserRole();
  }, []);

  useEffect(() => {
    loadLeaves();
  }, [statusFilter, typeFilter, activeTab]);

  const checkUserRole = () => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        setUserRole(userData.role || 'employee');
      }
    }
  };

  const loadData = async () => {
    try {
      const balanceData = await getLeaveBalance();
      setBalance(balanceData);
    } catch (err) {
      console.error('Failed to load balance:', err);
    }
  };

  const loadLeaves = async () => {
    try {
      const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (typeFilter !== 'all') filters.type = typeFilter;
      await fetchLeaves(filters);
    } catch (err) {
      console.error('Failed to load leaves:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLeave) {
        await updateLeave(editingLeave._id, formData);
        setSuccessMessage('Leave request updated successfully!');
      } else {
        await createLeave(formData);
        setSuccessMessage('Leave request submitted successfully!');
      }
      resetForm();
      loadData();
      setActiveTab('my-leaves');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err?.toString() || 'Failed to submit leave request');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleApprove = async (leave: Leave) => {
    if (!window.confirm('Are you sure you want to approve this leave request?')) return;
    
    try {
      await approveLeave(leave._id);
      setSuccessMessage('Leave approved successfully!');
      loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err?.toString() || 'Failed to approve leave');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const openRejectModal = (leave: Leave) => {
    setSelectedLeave(leave);
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!selectedLeave || !rejectionReason.trim()) {
      setErrorMessage('Please provide a rejection reason');
      return;
    }

    try {
      await rejectLeave(selectedLeave._id, rejectionReason);
      setSuccessMessage('Leave rejected successfully!');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedLeave(null);
      loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err?.toString() || 'Failed to reject leave');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleDelete = async (leave: Leave) => {
    if (!window.confirm('Are you sure you want to delete this leave request?')) return;
    
    try {
      await deleteLeave(leave._id);
      setSuccessMessage('Leave request deleted successfully!');
      loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err?.toString() || 'Failed to delete leave');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleEdit = (leave: Leave) => {
    setEditingLeave(leave);
    setFormData({
      type: leave.type,
      startDate: leave.startDate.split('T')[0],
      endDate: leave.endDate.split('T')[0],
      reason: leave.reason,
    });
    setActiveTab('new-request');
  };

  const resetForm = () => {
    setFormData({
      type: 'sick',
      startDate: '',
      endDate: '',
      reason: '',
    });
    setEditingLeave(null);
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return days;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: string) => {
    const colors = {
      sick: 'text-red-600',
      casual: 'text-blue-600',
      annual: 'text-green-600',
      unpaid: 'text-gray-600',
    };
    return colors[type as keyof typeof colors] || 'text-gray-600';
  };

  const canManageLeaves = ['admin', 'ceo', 'manager'].includes(userRole);

  // Ensure leaves is always an array
  const safeLeaves = leaves || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Leave Management</h1>
        <p className="text-gray-600">Manage your leave requests and track your leave balance</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
          <CheckCircle className="h-5 w-5" />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          {errorMessage}
        </div>
      )}

      {/* Leave Balance Cards */}
      {balance && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Object.entries(balance).map(([type, data]) => {
            const remaining = data.total - data.used;
            const percentage = data.total > 0 ? (data.used / data.total) * 100 : 0;
            
            return (
              <div key={type} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-700 capitalize">{type} Leave</h3>
                  <Calendar className={`h-5 w-5 ${getTypeColor(type)}`} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Used: {data.used} days</span>
                    <span className="text-gray-600">Total: {data.total > 0 ? data.total : 'Unlimited'}</span>
                  </div>
                  {data.total > 0 && (
                    <>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <p className="text-sm font-medium text-gray-700">
                        Remaining: {remaining} days
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('my-leaves')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'my-leaves'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            My Leaves
          </button>
          {canManageLeaves && (
            <button
              onClick={() => setActiveTab('all-leaves')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'all-leaves'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              All Leaves
            </button>
          )}
          <button
            onClick={() => {
              resetForm();
              setActiveTab('new-request');
            }}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'new-request'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            <Plus className="h-4 w-4 inline mr-2" />
            New Request
          </button>
        </div>

        <div className="p-6">
          {/* New Request Tab */}
          {activeTab === 'new-request' && (
            <form onSubmit={handleSubmit} className="max-w-2xl">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {editingLeave ? 'Edit Leave Request' : 'Submit New Leave Request'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="sick">Sick Leave</option>
                    <option value="casual">Casual Leave</option>
                    <option value="annual">Annual Leave</option>
                    <option value="unpaid">Unpaid Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {formData.startDate && formData.endDate && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Duration: {calculateDays(formData.startDate, formData.endDate)} day(s)
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Please provide a reason for your leave request..."
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    {editingLeave ? 'Update Request' : 'Submit Request'}
                  </button>
                  {editingLeave && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}

          {/* Leave List Tab */}
          {(activeTab === 'my-leaves' || activeTab === 'all-leaves') && (
            <div>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Types</option>
                    <option value="sick">Sick Leave</option>
                    <option value="casual">Casual Leave</option>
                    <option value="annual">Annual Leave</option>
                    <option value="unpaid">Unpaid Leave</option>
                  </select>
                </div>
              </div>

              {/* Leave List */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading leaves...</p>
                </div>
              ) : safeLeaves.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No leave requests found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {safeLeaves.map((leave) => (
                    <div
                      key={leave._id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className={`font-semibold text-lg capitalize ${getTypeColor(leave.type)}`}>
                              {leave.type} Leave
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(leave.status)}`}>
                              {leave.status.toUpperCase()}
                            </span>
                          </div>

                          {activeTab === 'all-leaves' && (
                            <p className="text-sm text-gray-600 mb-2">
                              Employee: <span className="font-medium">{leave.employeeId.name}</span>
                              {' '}- {leave.employeeId.department} ({leave.employeeId.position})
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                            <div>
                              <span className="font-medium">Start:</span>{' '}
                              {new Date(leave.startDate).toLocaleDateString()}
                            </div>
                            <div>
                              <span className="font-medium">End:</span>{' '}
                              {new Date(leave.endDate).toLocaleDateString()}
                            </div>
                            <div>
                              <span className="font-medium">Duration:</span>{' '}
                              {calculateDays(leave.startDate, leave.endDate)} day(s)
                            </div>
                            <div>
                              <span className="font-medium">Requested:</span>{' '}
                              {new Date(leave.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          <div className="text-sm text-gray-700 mb-2">
                            <span className="font-medium">Reason:</span> {leave.reason}
                          </div>

                          {leave.status === 'approved' && leave.approvedBy && (
                            <div className="text-sm text-green-600">
                              <CheckCircle className="h-4 w-4 inline mr-1" />
                              Approved by {leave.approvedBy.name} on{' '}
                              {new Date(leave.approvedDate!).toLocaleDateString()}
                            </div>
                          )}

                          {leave.status === 'rejected' && leave.rejectionReason && (
                            <div className="text-sm text-red-600">
                              <XCircle className="h-4 w-4 inline mr-1" />
                              Rejected: {leave.rejectionReason}
                              {leave.approvedBy && ` by ${leave.approvedBy.name}`}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 ml-4">
                          {leave.status === 'pending' && activeTab === 'my-leaves' && (
                            <>
                              <button
                                onClick={() => handleEdit(leave)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(leave)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </>
                          )}

                          {leave.status === 'pending' && activeTab === 'all-leaves' && canManageLeaves && (
                            <>
                              <button
                                onClick={() => handleApprove(leave)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-1"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Approve
                              </button>
                              <button
                                onClick={() => openRejectModal(leave)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-1"
                              >
                                <XCircle className="h-4 w-4" />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reject Leave Request</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this leave request:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              placeholder="Enter rejection reason..."
            />
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Reject Leave
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedLeave(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
