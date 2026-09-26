const BASE_URL = '/api';

export function getAuthToken() {
  return localStorage.getItem('billgst_token') || '';
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('billgst_token', token);
  } else {
    localStorage.removeItem('billgst_token');
  }
}

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, config);
    
    // Safely parse JSON or handle plain text responses
    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch {
        data = { message: 'Invalid JSON response from server' };
      }
    } else {
      const text = await res.text();
      data = { message: text || `Server responded with HTTP ${res.status}` };
    }

    if (!res.ok) {
      if (res.status === 401) {
        // Clear token on unauthorized session expiration
        setAuthToken('');
      }
      const errorMsg = data.message || `Request failed with HTTP status ${res.status}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error('Unable to connect to GST server. Please verify the server is running on port 5000.');
    }
    throw err;
  }
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),

  // Business Profile
  getBusiness: () => request('/business'),
  updateBusiness: (data) => request('/business', { method: 'PUT', body: JSON.stringify(data) }),

  // Customers
  getCustomers: () => request('/customers'),
  getCustomer: (id) => request(`/customers/${id}`),
  createCustomer: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id, data) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),

  // Catalog Items
  getCatalog: () => request('/catalog'),
  getCatalogItem: (id) => request(`/catalog/${id}`),
  createCatalogItem: (data) => request('/catalog', { method: 'POST', body: JSON.stringify(data) }),
  updateCatalogItem: (id, data) => request(`/catalog/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCatalogItem: (id) => request(`/catalog/${id}`, { method: 'DELETE' }),

  // Invoices
  getInvoices: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    const qs = query.toString();
    return request(`/invoices${qs ? `?${qs}` : ''}`);
  },
  getInvoice: (id) => request(`/invoices/${id}`),
  createInvoice: (data) => request('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoice: (id, data) => request(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  recordPayment: (id, paymentData) => request(`/invoices/${id}/payment`, { method: 'PATCH', body: JSON.stringify(paymentData) }),
  deleteInvoice: (id) => request(`/invoices/${id}`, { method: 'DELETE' }),

  // Email with Resend / Centralized SaaS Mailer
  sendInvoiceEmail: (id, email) => request(`/invoices/${id}/send-email`, { method: 'POST', body: JSON.stringify({ email }) }),
  getQueueStatus: () => request('/email/queue-status'),

  // Dashboard Analytics
  getDashboard: () => request('/dashboard')
};
