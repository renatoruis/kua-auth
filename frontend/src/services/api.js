import axios from 'axios';
import { saveAs } from 'file-saver';
import router from '../router'; // Import router for redirection
import { ref, computed } from 'vue'; // Import ref and computed from Vue

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const TOKEN_KEY = 'jwt_token';
const DEFAULT_APP_NAMESPACE = 'kube-user-admin'; // Adicionar constante para namespace padrão

// --- Reactive Token Management ---
const authToken = ref(localStorage.getItem(TOKEN_KEY));

const storeToken = (tokenValue) => {
  if (tokenValue) {
    localStorage.setItem(TOKEN_KEY, tokenValue);
    authToken.value = tokenValue;
  } else {
    // This case should ideally not be hit if storeToken is always called with a valid token
    // or removeToken is called for clearing.
    localStorage.removeItem(TOKEN_KEY);
    authToken.value = null;
  }
};

const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  authToken.value = null;
};

// isAuthenticated is now a computed property based on the reactive authToken
const isAuthenticatedComputed = computed(() => !!authToken.value);


// --- Axios API Client Setup ---
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Add JWT token to headers
apiClient.interceptors.request.use(
  (config) => {
    // Use the reactive authToken.value
    if (authToken.value && config.url !== '/auth/login') {
      config.headers['Authorization'] = `Bearer ${authToken.value}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      console.error('Unauthorized access - 401. Logging out.');
      removeToken(); // This will now update the reactive authToken
      // Check if already on login page to prevent redirect loop
      if (router.currentRoute.value.path !== '/login') {
        router.push('/login').catch(err => {
          if (err.name !== 'NavigationDuplicated') {
            console.error('Redirect to login failed:', err);
          }
        });
      }
    }
    return Promise.reject(error);
  }
);


// --- Authentication Endpoints ---
const login = async (password) => {
  try {
    const response = await apiClient.post('/auth/login', { password });
    if (response.data && response.data.token) {
      storeToken(response.data.token); // storeToken now updates the ref
    }
    return response.data;
  } catch (error) {
    console.error('Login failed:', error.response ? error.response.data : error.message);
    removeToken(); // Ensure reactive state is also cleared
    throw error;
  }
};

const logout = () => {
  removeToken(); // This updates the ref and localStorage
  // The component calling logout should handle the redirect to /login
  // e.g., router.push('/login'); in the component.
};


// --- API Methods ---
export default {
  // Auth methods
  login,
  logout,
  getToken: () => authToken.value, // Provide a way to get current token value if needed
  isAuthenticated: () => isAuthenticatedComputed.value, // Expose the computed value
  // removed removeToken and storeToken from export as they are internal helpers now
  
  // Application constants
  DEFAULT_APP_NAMESPACE,
  
  // User endpoints
  async getUsers() {
    const response = await apiClient.get('/users');
    return response.data;
  },
  
  async getUser(namespace, name) {
    const response = await apiClient.get(`/users/${namespace}/${name}`);
    return response.data;
  },
  
  async createUser(userData) {
    const response = await apiClient.post('/users', userData);
    return response.data;
  },
  
  async deleteUser(namespace, name) {
    const response = await apiClient.delete(`/users/${namespace}/${name}`);
    return response.data;
  },
  
  async downloadUserKubeconfig(namespace, name) {
    try {
      const response = await apiClient({
        url: `/users/${namespace}/${name}/kubeconfig`,
        method: 'GET',
        responseType: 'blob',
      });
      
      const filename = `${name}-kubeconfig.yaml`;
      
      const blob = new Blob([response.data], { type: 'application/x-yaml' });
      saveAs(blob, filename);
      
      return { success: true };
    } catch (error) {
      console.error('Error downloading kubeconfig:', error.response ? error.response.data : error.message);
      if (error.response && error.response.status !== 401) {
         throw error;
      }
      return { 
        success: false, 
        message: (error.response && error.response.data && error.response.data.message) || 'Failed to download kubeconfig' 
      };
    }
  },
  
  // Role & ClusterRole endpoints
  async getAllRolesAndClusterRoles() {
    const response = await apiClient.get('/roles');
    return response.data;
  },
  async getNamespaceRoles(namespace) {
    const response = await apiClient.get(`/roles/namespace/${namespace}`);
    return response.data;
  },
  async getRoleBindingsForServiceAccount(namespace, name) {
    const response = await apiClient.get(`/roles/bindings/${namespace}/${name}`);
    return response.data;
  },
  async createRole(namespace, roleData) {
    const response = await apiClient.post(`/roles/namespace/${namespace}/role`, roleData);
    return response.data;
  },
  async updateRole(namespace, roleName, roleData) {
    const response = await apiClient.put(`/roles/namespace/${namespace}/role/${roleName}`, roleData);
    return response.data;
  },
  async deleteRole(namespace, roleName) {
    const response = await apiClient.delete(`/roles/namespace/${namespace}/role/${roleName}`);
    return response.data;
  },
  async createOrUpdateClusterRole(clusterRoleName, clusterRoleData) {
    if (clusterRoleData.name && clusterRoleData.name !== clusterRoleName) {
        console.warn("ClusterRole name in body differs from URL, URL name will be used for PUT endpoint in controller if applicable or body for POST.");
    }
    if (clusterRoleName) { 
        const response = await apiClient.put(`/roles/clusterrole/${clusterRoleName}`, clusterRoleData);
        return response.data;
    } else { 
        const response = await apiClient.post('/roles/clusterrole', clusterRoleData);
        return response.data;
    }
  },
  async deleteClusterRole(clusterRoleName) {
    const response = await apiClient.delete(`/roles/clusterrole/${clusterRoleName}`);
    return response.data;
  },

  // RoleBinding endpoints
  async createRoleBinding(namespace, bindingData) {
    const response = await apiClient.post(`/roles/namespace/${namespace}/rolebinding`, bindingData);
    return response.data;
  },
  async updateRoleBinding(namespace, bindingName, bindingData) {
    const response = await apiClient.put(`/roles/namespace/${namespace}/rolebinding/${bindingName}`, bindingData);
    return response.data;
  },
  async deleteRoleBinding(namespace, bindingName) {
    const response = await apiClient.delete(`/roles/namespace/${namespace}/rolebinding/${bindingName}`);
    return response.data;
  },

  // ClusterRoleBinding endpoints
  async createClusterRoleBinding(bindingData) {
    const response = await apiClient.post('/roles/clusterrolebinding', bindingData);
    return response.data;
  },
  async updateClusterRoleBinding(bindingName, bindingData) {
    const response = await apiClient.put(`/roles/clusterrolebinding/${bindingName}`, bindingData);
    return response.data;
  },
  async deleteClusterRoleBinding(bindingName) {
    const response = await apiClient.delete(`/roles/clusterrolebinding/${bindingName}`);
    return response.data;
  },
  
  async getPermissionTemplates() {
    const response = await apiClient.get('/roles/templates');
    return response.data;
  },
  
  // Config endpoints
  async getClusterInfo() {
    const response = await apiClient.get('/configs/cluster/info');
    return response.data;
  },

  async getNodes() {
    const response = await apiClient.get('/configs/nodes');
    return response.data;
  },
  
  async getNamespaces() {
    const response = await apiClient.get('/configs/namespaces');
    return response.data;
  },

  async getAllRoleBindingsAndClusterRoleBindings() {
    const response = await apiClient.get('/roles/bindings');
    return response.data;
  },
};

// Multi-namespace role management
export const addRoleToServiceAccountMultiNamespace = (data) => {
  return apiClient.post('/roles/serviceaccount/add-role', data);
};

export const getServiceAccountPermissions = (serviceAccountNamespace, serviceAccountName) => {
  return apiClient.get(`/roles/serviceaccount/${serviceAccountNamespace}/${serviceAccountName}/permissions`);
};

export const removeRoleFromServiceAccount = (serviceAccountNamespace, serviceAccountName, roleName) => {
  return apiClient.delete(`/roles/serviceaccount/${serviceAccountNamespace}/${serviceAccountName}/role/${roleName}`);
};

// Individual exports for component imports
export const getClusterRoles = async () => {
  const response = await apiClient.get('/roles');
  return { data: { items: response.data.clusterRoles || [] } };
};

export const getRoles = async () => {
  const response = await apiClient.get('/roles');
  return { data: { items: response.data.roles || [] } };
};

export const getNamespaces = async () => {
  const response = await apiClient.get('/configs/namespaces');
  return response;
}; 