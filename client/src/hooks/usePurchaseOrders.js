import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';

export const usePurchaseOrders = (params = {}) => {
  return useQuery({
    queryKey: ['purchase-orders', params],
    queryFn: async () => {
      const res = await api.get('/purchase-orders', { params });
      return res.data;
    },
    staleTime: 15000,
  });
};

export const usePurchaseOrder = (id) => {
  return useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
};

export const useSupplierStockAnalysis = (supplierId) => {
  return useQuery({
    queryKey: ['supplier-stock-analysis', supplierId],
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/supplier/${supplierId}/analysis`);
      return res.data;
    },
    enabled: !!supplierId,
    staleTime: 10000,
  });
};

export const useSupplierPurchaseHistory = (supplierId) => {
  return useQuery({
    queryKey: ['supplier-purchase-history', supplierId],
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/supplier/${supplierId}/history`);
      return res.data;
    },
    enabled: !!supplierId,
  });
};

export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/purchase-orders', data);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-stock-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-purchase-history'] });
      toast.success(res.message || 'Purchase order generated successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to generate purchase order.');
    },
  });
};

export const useCreateBulkPurchaseOrders = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/purchase-orders/bulk', data);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-stock-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-purchase-history'] });
      toast.success(res.message || 'Bulk purchase orders created successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create bulk purchase orders.');
    },
  });
};

export const useUpdatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.put(`/purchase-orders/${id}`, data);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
      toast.success(res.message || 'Purchase order updated successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update purchase order.');
    },
  });
};

export const useReceivePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.post(`/purchase-orders/${id}/receive`, data);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-stock-analysis'] });
      toast.success(res.message || 'Stock received and inventory updated!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to receive stock.');
    },
  });
};

export const useCancelPurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/purchase-orders/${id}/cancel`);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
      toast.success(res.message || 'Purchase order cancelled.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to cancel purchase order.');
    },
  });
};

export const usePurchaseOrderPdf = () => {
  return useMutation({
    mutationFn: async ({ id, poNumber }) => {
      const res = await api.get(`/purchase-orders/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${poNumber || 'purchase-order'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to generate Purchase Order PDF');
    },
  });
};

