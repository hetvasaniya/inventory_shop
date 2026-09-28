import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useBills = (params = {}) => {
  return useQuery({
    queryKey: ['bills', params],
    queryFn: async () => {
      const res = await api.get('/bills', { params });
      return res.data;
    },
    staleTime: 15000,
  });
};

export const useBill = (id) => {
  return useQuery({
    queryKey: ['bill', id],
    queryFn: async () => {
      const res = await api.get(`/bills/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
};

export const useCreateBill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/bills', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Bill created successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create bill');
    },
  });
};

export const useBillPdf = () => {
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.get(`/bills/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bill-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to generate PDF');
    },
  });
};

export const useDeleteDemoBills = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.delete('/bills/demo');
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['ai'] });
      toast.success(data?.message || 'Demo bills removed successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to remove demo bills');
    },
  });
};


