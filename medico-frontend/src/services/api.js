const API_BASE_URL = '/api';
const jsonHeaders = {
  'Content-Type': 'application/json',
};

const buildParams = (limit, offset, search) => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  if (search) params.append('search', search);
  return params.toString();
};

export const api = {
  // Dashboard
  getDashboardStats: async (date = null) => {
    const url = date 
      ? `${API_BASE_URL}/dashboard/stats?date=${date}`
      : `${API_BASE_URL}/dashboard/stats`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch dashboard stats');
    return response.json();
  },

  getRecentActivities: async (date = null) => {
    const url = date 
      ? `${API_BASE_URL}/dashboard/recent-activities?date=${date}`
      : `${API_BASE_URL}/dashboard/recent-activities`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch recent activities');
    return response.json();
  },

  // Patients
  getPatients: async (params = {}) => {
    // Support both old format (limit, offset, search) and new format (params object)
    let queryParams;
    
    // Check if it's the new format (object with page, limit, search, sort, filters)
    if (typeof params === 'object' && !Array.isArray(params) && (params.page || params.limit || params.search || params.sort || params.filters)) {
      // New format: params object
      queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.search) queryParams.append('q', params.search);
      if (params.sort) queryParams.append('sort', params.sort);
      if (params.direction) queryParams.append('direction', params.direction);
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (value) queryParams.append(key, value);
        });
      }
      queryParams = queryParams.toString();
    } else if (typeof params === 'number' || typeof params === 'string' || (params && params.limit && params.offset !== undefined)) {
      // Old format: (limit, offset, search) - handle as separate arguments or object with limit/offset
      const limit = typeof params === 'number' ? params : (params.limit || 100);
      const offset = typeof params === 'number' ? 0 : (params.offset || 0);
      const search = typeof params === 'string' ? params : (params.search || '');
      queryParams = buildParams(limit, offset, search);
    } else {
      // Default: empty params
      queryParams = '';
    }
    
    const url = queryParams ? `${API_BASE_URL}/patients/?${queryParams}` : `${API_BASE_URL}/patients/`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const error = await response.json();
          throw new Error(error.error || 'Failed to fetch patients');
        } catch (e) {
          if (e.message) throw e;
          throw new Error(`Backend server error: ${response.status} ${response.statusText}. Make sure the Flask backend is running on port 5000.`);
        }
      } else {
        throw new Error(`Backend server error: ${response.status} ${response.statusText}. Make sure the Flask backend is running on port 5000.`);
      }
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Backend returned non-JSON response. Make sure the Flask backend is running on port 5000.');
    }
    
    return response.json();
  },
  createPatient: async (patientData) => {
    const response = await fetch(`${API_BASE_URL}/patients/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientData),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create patient');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to create patient: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  updatePatient: async (id, patientData) => {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientData),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update patient');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to update patient: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  deletePatient: async (patientId) => {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete patient');
    }
    return response.json();
  },

  getPatientById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch patient');
    }
    return response.json();
  },
  getPatientsOptions: async (search = '', limit = 100) => {
    // Use encounters/options/patients endpoint for encounter forms
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (limit) params.append('limit', limit.toString());
      const response = await fetch(`${API_BASE_URL}/encounters/options/patients?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch patients options' }));
        throw new Error(error.error || 'Failed to fetch patients options');
      }
      const data = await response.json();
      // Backend returns array directly
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching patients options:', err);
      return [];
    }
  },

  getInsurers: async () => {
    // Try both endpoints - some backends use /patients/options/insurers, others use /insurers/
    try {
      const response = await fetch(`${API_BASE_URL}/patients/options/insurers`);
      if (response.ok) {
        return response.json();
      }
    } catch {
      // Fall through to try /insurers/
    }
    
    const response = await fetch(`${API_BASE_URL}/insurers/`);
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch insurers');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to fetch insurers: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },

  // Claims
  // Claims - support both old and new format
  getClaims: async (limit = 100, offset = 0, search = '') => {
    const response = await fetch(`${API_BASE_URL}/claims/?${buildParams(limit, offset, search)}`);
    if (!response.ok) throw new Error('Failed to fetch claims');
    return response.json();
  },
  getClaimsList: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('q', params.search);
    if (params.sort) queryParams.append('sort', params.sort);
    if (params.direction) queryParams.append('direction', params.direction);
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value);
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/claims/?${queryParams}`);
    if (!response.ok) {
      let errorMessage = 'Failed to fetch claims';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } else {
          errorMessage = `Backend error: ${response.status} ${response.statusText}`;
        }
      } catch {
        errorMessage = `Backend error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Backend returned non-JSON response. Make sure the Flask backend is running on port 5000.');
    }
    const text = await response.text();
    if (!text) {
      throw new Error('Backend returned empty response');
    }
    try {
      return JSON.parse(text);
    } catch {
      console.error('JSON parse error:', text);
      throw new Error('Failed to parse JSON response from backend');
    }
  },
  createClaim: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/claims/`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create claim');
      } catch (e) {
        if (e.message) throw e;
        throw new Error('Failed to create claim');
      }
    }
    return response.json();
  },
  updateClaim: async (billingId, payload) => {
    const response = await fetch(`${API_BASE_URL}/claims/${billingId}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update claim');
      } catch (e) {
        if (e.message) throw e;
        throw new Error('Failed to update claim');
      }
    }
    return response.json();
  },
  deleteClaim: async (billingId) => {
    const response = await fetch(`${API_BASE_URL}/claims/${billingId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete claim');
      } catch (e) {
        if (e.message) throw e;
        throw new Error('Failed to delete claim');
      }
    }
    return response.json();
  },

  getClaimById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/claims/${id}`);
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch claim');
      } catch (err) {
        if (err.message) throw err;
        throw new Error('Failed to fetch claim');
      }
    }
    return response.json();
  },

  getClaimsByPatient: async (patientId) => {
    const response = await fetch(`${API_BASE_URL}/claims/patient/${patientId}`);
    if (!response.ok) throw new Error('Failed to fetch patient claims');
    return response.json();
  },

  getEncountersOptions: async (search = '', limit = 50) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('limit', limit);
    const response = await fetch(`${API_BASE_URL}/claims/options/encounters?${params}`);
    if (!response.ok) throw new Error('Failed to fetch encounters options');
    return response.json();
  },

  // Encounters
  getEncounters: async (params = {}) => {
    // Support both old format (limit, offset, search) and new format (params object)
    let queryParams;
    
    // Check if it's the new format (object with page, limit, search, sort, filters)
    if (typeof params === 'object' && !Array.isArray(params) && (params.page || params.limit || params.search || params.sort || params.filters)) {
      // New format: params object
      queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.search) queryParams.append('q', params.search);
      if (params.sort) queryParams.append('sort', params.sort);
      if (params.direction) queryParams.append('direction', params.direction);
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (value) queryParams.append(key, value);
        });
      }
      queryParams = queryParams.toString();
    } else if (typeof params === 'number' || typeof params === 'string' || (params && params.limit && params.offset !== undefined)) {
      // Old format: (limit, offset, search) - handle as separate arguments or object with limit/offset
      const limit = typeof params === 'number' ? params : (params.limit || 100);
      const offset = typeof params === 'number' ? 0 : (params.offset || 0);
      const search = typeof params === 'string' ? params : (params.search || '');
      queryParams = buildParams(limit, offset, search);
    } else {
      // Default: empty params
      queryParams = '';
    }
    
    const url = queryParams ? `${API_BASE_URL}/encounters/?${queryParams}` : `${API_BASE_URL}/encounters/`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch encounters');
    return response.json();
  },
  getEncounterById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/encounters/${id}`);
    if (!response.ok) throw new Error('Failed to fetch encounter');
    return response.json();
  },
  getEncounterRelated: async (id) => {
    const response = await fetch(`${API_BASE_URL}/encounters/${id}/related`);
    if (!response.ok) throw new Error('Failed to fetch related data');
    return response.json();
  },
  createEncounter: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/encounters/`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create encounter');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to create encounter: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  updateEncounter: async (encounterId, payload) => {
    const response = await fetch(`${API_BASE_URL}/encounters/${encounterId}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update encounter');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to update encounter: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  deleteEncounter: async (encounterId) => {
    const response = await fetch(`${API_BASE_URL}/encounters/${encounterId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete encounter');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to delete encounter: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  // Providers
  getProvidersList: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('q', params.search);
    if (params.sort) queryParams.append('sort', params.sort);
    if (params.direction) queryParams.append('direction', params.direction);
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value);
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/providers/?${queryParams}`);
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch providers');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to fetch providers: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  getProviderById: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/providers/${id}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch provider' }));
        throw new Error(error.error || 'Failed to fetch provider');
      }
      return response.json();
    } catch (err) {
      console.error('Error fetching provider:', err);
      throw err;
    }
  },
  createProvider: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/providers/`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create provider');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to create provider: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  updateProvider: async (providerId, payload) => {
    const response = await fetch(`${API_BASE_URL}/providers/${providerId}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update provider');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to update provider: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  deleteProvider: async (providerId) => {
    const response = await fetch(`${API_BASE_URL}/providers/${providerId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete provider');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to delete provider: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  getProvidersDepartmentHeadsOptions: async (search = '', limit = 50, department = '') => {
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (limit) queryParams.append('limit', limit);
      if (department) queryParams.append('department', department);
      const response = await fetch(`${API_BASE_URL}/providers/options/department-heads?${queryParams}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch department heads' }));
        throw new Error(error.error || 'Failed to fetch department heads');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching department heads:', err);
      return [];
    }
  },
  getProvidersDepartments: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/providers/options/departments`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch departments' }));
        throw new Error(error.error || 'Failed to fetch departments');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching departments:', err);
      return [];
    }
  },
  getProvidersSpecialties: async (department = '') => {
    try {
      const queryParams = new URLSearchParams();
      if (department) queryParams.append('department', department);
      const response = await fetch(`${API_BASE_URL}/providers/options/specialties?${queryParams}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch specialties' }));
        throw new Error(error.error || 'Failed to fetch specialties');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching specialties:', err);
      return [];
    }
  },
  getProvidersOptions: async (search = '', limit = 100) => {
    // Use encounters/options/providers endpoint for encounter forms
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (limit) params.append('limit', limit.toString());
      const response = await fetch(`${API_BASE_URL}/encounters/options/providers?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch providers options' }));
        throw new Error(error.error || 'Failed to fetch providers options');
      }
      const data = await response.json();
      // Backend returns array directly
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching providers options:', err);
      return [];
    }
  },
  getDepartmentsOptions: async () => {
    // Use encounters/options/departments endpoint
    try {
      const response = await fetch(`${API_BASE_URL}/encounters/options/departments`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch departments options' }));
        throw new Error(error.error || 'Failed to fetch departments options');
      }
      const data = await response.json();
      // Backend returns array of strings directly
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching departments:', err);
      return [];
    }
  },

  // Procedures
  getProcedures: async (limit = 100, offset = 0, search = '') => {
    const response = await fetch(`${API_BASE_URL}/procedures/?${buildParams(limit, offset, search)}`);
    if (!response.ok) throw new Error('Failed to fetch procedures');
    return response.json();
  },
  getProceduresList: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('q', params.search);
    if (params.sort) queryParams.append('sort', params.sort);
    if (params.direction) queryParams.append('direction', params.direction);
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value);
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/procedures/?${queryParams}`);
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch procedures');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to fetch procedures: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  getProceduresEncounterOptions: async (search = '', limit = 50) => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', limit);
      const response = await fetch(`${API_BASE_URL}/procedures/options/encounters?${params}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch encounters options' }));
        throw new Error(error.error || 'Failed to fetch encounters options');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching encounters options:', err);
      return [];
    }
  },
  getProceduresProviderOptions: async (search = '', limit = 50) => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', limit);
      const response = await fetch(`${API_BASE_URL}/procedures/options/providers?${params}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch providers options' }));
        throw new Error(error.error || 'Failed to fetch providers options');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching providers options:', err);
      return [];
    }
  },
  getProcedureCodes: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/procedures/options/procedure-codes`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch procedure codes' }));
        throw new Error(error.error || 'Failed to fetch procedure codes');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching procedure codes:', err);
      return [];
    }
  },
  getProcedureById: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/procedures/${id}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch procedure' }));
        throw new Error(error.error || 'Failed to fetch procedure');
      }
      return response.json();
    } catch (err) {
      console.error('Error fetching procedure:', err);
      throw err;
    }
  },
  createProcedure: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/procedures/`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create procedure');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to create procedure: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  updateProcedure: async (procedureId, payload) => {
    const response = await fetch(`${API_BASE_URL}/procedures/${procedureId}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update procedure');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to update procedure: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  deleteProcedure: async (procedureId) => {
    const response = await fetch(`${API_BASE_URL}/procedures/${procedureId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete procedure');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to delete procedure: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },

  // Medications
  getMedications: async (limit = 100, offset = 0, search = '') => {
    const response = await fetch(`${API_BASE_URL}/medications/?${buildParams(limit, offset, search)}`);
    if (!response.ok) throw new Error('Failed to fetch medications');
    return response.json();
  },
  getMedicationsList: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('q', params.search);
    if (params.sort) queryParams.append('sort', params.sort);
    if (params.direction) queryParams.append('direction', params.direction);
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value);
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/medications/?${queryParams}`);
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch medications');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to fetch medications: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  getMedicationsEncounterOptions: async (search = '', limit = 50) => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', limit);
      const response = await fetch(`${API_BASE_URL}/medications/options/encounters?${params}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch encounters options' }));
        throw new Error(error.error || 'Failed to fetch encounters options');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching encounters options:', err);
      return [];
    }
  },
  getPrescribersOptions: async (search = '', limit = 50) => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', limit);
      const response = await fetch(`${API_BASE_URL}/medications/options/prescribers?${params}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch prescribers options' }));
        throw new Error(error.error || 'Failed to fetch prescribers options');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching prescribers options:', err);
      return [];
    }
  },
  getMedicationById: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/medications/${id}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch medication' }));
        throw new Error(error.error || 'Failed to fetch medication');
      }
      return response.json();
    } catch (err) {
      console.error('Error fetching medication:', err);
      throw err;
    }
  },
  createMedication: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/medications/`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create medication');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to create medication: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  updateMedication: async (medicationId, payload) => {
    const response = await fetch(`${API_BASE_URL}/medications/${medicationId}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update medication');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to update medication: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  deleteMedication: async (medicationId) => {
    const response = await fetch(`${API_BASE_URL}/medications/${medicationId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete medication');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to delete medication: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },

  // Denials
  getDenials: async (limit = 100, offset = 0, search = '') => {
    const response = await fetch(`${API_BASE_URL}/denials/?${buildParams(limit, offset, search)}`);
    if (!response.ok) throw new Error('Failed to fetch denials');
    return response.json();
  },
  getDenialsList: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('q', params.search);
    if (params.sort) queryParams.append('sort', params.sort);
    if (params.direction) queryParams.append('direction', params.direction);
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value);
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/denials/?${queryParams}`);
    if (!response.ok) {
      let errorMessage = 'Failed to fetch denials';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } else {
          errorMessage = `Backend error: ${response.status} ${response.statusText}`;
        }
      } catch {
        errorMessage = `Backend error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Backend returned non-JSON response. Make sure the Flask backend is running on port 5000.');
    }
    const text = await response.text();
    if (!text) {
      throw new Error('Backend returned empty response');
    }
    try {
      return JSON.parse(text);
    } catch {
      console.error('JSON parse error:', text);
      throw new Error('Failed to parse JSON response from backend');
    }
  },
  getDenialByClaimId: async (claimId) => {
    const response = await fetch(`${API_BASE_URL}/denials/claim/${claimId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch denial by claim ID');
    }
    return response.json();
  },
  getClaimsOptions: async (search = '', limit = 50) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('limit', limit);
    const response = await fetch(`${API_BASE_URL}/denials/options/claims?${params}`);
    if (!response.ok) throw new Error('Failed to fetch claims options');
    return response.json();
  },
  getDenialReasonCodes: async () => {
    const response = await fetch(`${API_BASE_URL}/denials/options/denial-reason-codes`);
    if (!response.ok) throw new Error('Failed to fetch denial reason codes');
    return response.json();
  },
  getBillingForDenial: async (search = '', limit = 50) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('limit', limit);
    const response = await fetch(`${API_BASE_URL}/denials/options/billing-for-denial?${params}`);
    if (!response.ok) throw new Error('Failed to fetch billing options for denial');
    return response.json();
  },
  createDenial: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/denials/`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to create denial');
    return response.json();
  },
  updateDenial: async (denialId, payload) => {
    const response = await fetch(`${API_BASE_URL}/denials/${denialId}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to update denial');
    return response.json();
  },
  deleteDenial: async (denialId) => {
    const response = await fetch(`${API_BASE_URL}/denials/${denialId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete denial');
    return response.json();
  },

  // Diagnoses
  getDiagnosesList: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('q', params.search);
    if (params.sort) queryParams.append('sort', params.sort);
    if (params.direction) queryParams.append('direction', params.direction);
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value);
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/diagnoses/?${queryParams}`);
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch diagnoses');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to fetch diagnoses: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  getDiagnosesEncounterOptions: async (search = '', limit = 50, availableOnly = false) => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', limit);
      if (availableOnly) params.append('available_only', 'true');
      const response = await fetch(`${API_BASE_URL}/diagnoses/options/encounters?${params}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch encounters options' }));
        throw new Error(error.error || 'Failed to fetch encounters options');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching encounters options:', err);
      return [];
    }
  },
  getDiagnosisCodes: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/diagnoses/options/diagnosis-codes`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch diagnosis codes' }));
        throw new Error(error.error || 'Failed to fetch diagnosis codes');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching diagnosis codes:', err);
      return [];
    }
  },
  getDiagnosisById: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/diagnoses/${id}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch diagnosis' }));
        throw new Error(error.error || 'Failed to fetch diagnosis');
      }
      return response.json();
    } catch (err) {
      console.error('Error fetching diagnosis:', err);
      throw err;
    }
  },
  createDiagnosis: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/diagnoses/`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create diagnosis');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to create diagnosis: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  updateDiagnosis: async (diagnosisId, payload) => {
    const response = await fetch(`${API_BASE_URL}/diagnoses/${diagnosisId}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update diagnosis');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to update diagnosis: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  deleteDiagnosis: async (diagnosisId) => {
    const response = await fetch(`${API_BASE_URL}/diagnoses/${diagnosisId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete diagnosis');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to delete diagnosis: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },

  // Lab Tests
  getLabTestsList: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('q', params.search);
    if (params.sort) queryParams.append('sort', params.sort);
    if (params.direction) queryParams.append('direction', params.direction);
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value);
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/lab-tests/?${queryParams}`);
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch lab tests');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to fetch lab tests: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  getLabTestsEncounterOptions: async (search = '', limit = 50) => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', limit);
      const response = await fetch(`${API_BASE_URL}/lab-tests/options/encounters?${params}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch encounters options' }));
        throw new Error(error.error || 'Failed to fetch encounters options');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching encounters options:', err);
      return [];
    }
  },
  getTestCodes: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/lab-tests/options/test-codes`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch test codes' }));
        throw new Error(error.error || 'Failed to fetch test codes');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching test codes:', err);
      return [];
    }
  },
  getLabIds: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/lab-tests/options/lab-ids`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch lab IDs' }));
        throw new Error(error.error || 'Failed to fetch lab IDs');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching lab IDs:', err);
      return [];
    }
  },
  getSpecimenTypes: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/lab-tests/options/specimen-types`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch specimen types' }));
        throw new Error(error.error || 'Failed to fetch specimen types');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching specimen types:', err);
      return [];
    }
  },
  getUnits: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/lab-tests/options/units`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch units' }));
        throw new Error(error.error || 'Failed to fetch units');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching units:', err);
      return [];
    }
  },
  getNormalRanges: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/lab-tests/options/normal-ranges`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch normal ranges' }));
        throw new Error(error.error || 'Failed to fetch normal ranges');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching normal ranges:', err);
      return [];
    }
  },
  getTestResults: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/lab-tests/options/test-results`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch test results' }));
        throw new Error(error.error || 'Failed to fetch test results');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching test results:', err);
      return [];
    }
  },
  getLabTestById: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/lab-tests/${id}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch lab test' }));
        throw new Error(error.error || 'Failed to fetch lab test');
      }
      return response.json();
    } catch (err) {
      console.error('Error fetching lab test:', err);
      throw err;
    }
  },
  createLabTest: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/lab-tests/`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create lab test');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to create lab test: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  updateLabTest: async (labTestId, payload) => {
    const response = await fetch(`${API_BASE_URL}/lab-tests/${labTestId}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update lab test');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to update lab test: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  deleteLabTest: async (labTestId) => {
    const response = await fetch(`${API_BASE_URL}/lab-tests/${labTestId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete lab test');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to delete lab test: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },

  // Insurers
  getInsurersList: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('q', params.search);
    if (params.sort) queryParams.append('sort', params.sort);
    if (params.direction) queryParams.append('direction', params.direction);
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value);
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/insurers/?${queryParams}`);
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch insurers');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to fetch insurers: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  getInsurerById: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/insurers/${id}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch insurer' }));
        throw new Error(error.error || 'Failed to fetch insurer');
      }
      return response.json();
    } catch (err) {
      console.error('Error fetching insurer:', err);
      throw err;
    }
  },
  createInsurer: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/insurers/`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create insurer');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to create insurer: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  updateInsurer: async (insurerId, payload) => {
    const response = await fetch(`${API_BASE_URL}/insurers/${insurerId}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update insurer');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to update insurer: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  deleteInsurer: async (insurerId) => {
    const response = await fetch(`${API_BASE_URL}/insurers/${insurerId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete insurer');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to delete insurer: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },

  // Department Heads
  getDepartmentHeadsList: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('q', params.search);
    if (params.sort) queryParams.append('sort', params.sort);
    if (params.direction) queryParams.append('direction', params.direction);
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value);
        }
      });
    }
    const response = await fetch(`${API_BASE_URL}/department-heads/?${queryParams}`);
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch department heads');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to fetch department heads: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  getDepartmentHeadById: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/department-heads/${id}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch department head' }));
        throw new Error(error.error || 'Failed to fetch department head');
      }
      return response.json();
    } catch (err) {
      console.error('Error fetching department head:', err);
      throw err;
    }
  },
  createDepartmentHead: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/department-heads/`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create department head');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to create department head: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  updateDepartmentHead: async (headId, payload) => {
    const response = await fetch(`${API_BASE_URL}/department-heads/${headId}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update department head');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to update department head: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
  deleteDepartmentHead: async (headId) => {
    const response = await fetch(`${API_BASE_URL}/department-heads/${headId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete department head');
      } catch (e) {
        if (e.message) throw e;
        throw new Error(`Failed to delete department head: ${response.status} ${response.statusText}`);
      }
    }
    return response.json();
  },
};

