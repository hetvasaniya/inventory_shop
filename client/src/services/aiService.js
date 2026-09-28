import api from './api';

export const getAiDashboard = async () => {
  const response = await api.get('/ai/dashboard');
  return response.data;
};

export const getNumericalAnalysis = async (variable = 'sales') => {
  const response = await api.get('/ai/numerical-analysis', {
    params: { variable },
  });
  return response.data;
};

export const getCategoryAnalysis = async (startDate, endDate) => {
  const response = await api.get('/ai/category-analysis', {
    params: { startDate, endDate },
  });
  return response.data;
};

export const getDemandForecast = async (productId, horizon = 7, model = 'randomForest') => {
  const response = await api.get('/ai/demand-forecast', {
    params: { productId, horizon, model },
  });
  return response.data;
};

export const getStockRisk = async (model = 'randomForest') => {
  const response = await api.get('/ai/stock-risk', {
    params: { model },
  });
  return response.data;
};

export const getProductSegmentation = async (k = 3) => {
  const response = await api.get('/ai/segmentation', {
    params: { k },
  });
  return response.data;
};

export const getProductRecommendations = async (minSupport, minConfidence, basket) => {
  const response = await api.get('/ai/recommendations', {
    params: { minSupport, minConfidence, basket },
  });
  return response.data;
};

export const getModelComparison = async () => {
  const response = await api.get('/ai/model-comparison');
  return response.data;
};

export const deleteAiDemoData = async () => {
  const response = await api.delete('/ai/delete-demo-data');
  return response.data;
};
