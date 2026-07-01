import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useProducts = (params = {}) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const res = await api.get('/products', { params });
      return res.data;
    },
    staleTime: 30000,
  });
};

export const useProduct = (id) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await api.get(`/products/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/products', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create product');
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.put(`/products/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update product');
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/products/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    },
  });
};

export const useProductByBarcode = (barcode) => {
  return useQuery({
    queryKey: ['product-barcode', barcode],
    queryFn: async () => {
      const res = await api.get(`/products/barcode/${barcode}`);
      return res.data?.data || null;
    },
    enabled: !!barcode && barcode.length > 3,
    staleTime: 10000,
  });
};
