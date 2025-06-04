<template>
  <div>
    <div class="flex items-center mb-6">
      <router-link to="/users" class="text-east-bay-600 hover:text-east-bay-800 mr-4 p-1 rounded-full hover:bg-east-bay-100">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
        </svg>
      </router-link>
      <h1 class="text-2xl font-bold text-east-bay-800">User Details</h1>
    </div>
    
    <AlertMessage 
      v-if="alert.show" 
      :message="alert.message" 
      :type="alert.type" 
      @dismiss="alert.show = false" 
      class="mb-6 rounded-lg"
    />
    
    <LoadingSpinner v-if="loading" message="Loading user details..." />
    
    <div v-else-if="!user" class="bg-white p-8 rounded-lg shadow-xl text-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-east-bay-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-xl font-semibold text-east-bay-700">User not found</p>
      <p class="mt-2 text-east-bay-500">The requested user ({{ namespace }}/{{ name }}) does not exist or you don't have permission to view it.</p>
      <router-link to="/users" 
        class="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-east-bay-600 hover:bg-east-bay-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-east-bay-500">
        Back to Users List
      </router-link>
    </div>
    
    <div v-else class="space-y-6">
      <!-- User Overview Card -->
      <div class="bg-white p-6 rounded-lg shadow-xl">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div class="mb-4 sm:mb-0">
            <h2 class="text-xl font-semibold text-east-bay-800">{{ user.metadata.name }}</h2>
            <p class="text-east-bay-500 text-sm">Service Account in namespace: {{ user.metadata.namespace }}</p>
          </div>
          <div class="flex space-x-3 flex-shrink-0">
            <button 
              @click="downloadKubeconfig" 
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-east-bay-600 hover:bg-east-bay-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-east-bay-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              Kubeconfig
            </button>
            <button 
              @click="confirmDelete" 
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              Delete
            </button>
          </div>
        </div>
        
        <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <p class="text-sm font-medium text-east-bay-500">Created</p>
            <p class="text-east-bay-900">{{ formatDate(user.metadata.creationTimestamp) }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-east-bay-500">UID</p>
            <p class="text-east-bay-900 break-all">{{ user.metadata.uid }}</p>
          </div>
        </div>
      </div>
      
      <!-- Permissions Card -->
      <ServiceAccountPermissions 
        v-if="user"
        :service-account-name="user.metadata.name"
        :service-account-namespace="user.metadata.namespace"
        @success="handlePermissionSuccess"
        @error="handlePermissionError"
      />
      
      <!-- Secrets Card -->
      <div class="bg-white p-6 rounded-lg shadow-xl">
        <h2 class="text-xl font-semibold text-east-bay-800 mb-4">Associated Secrets</h2>
        
        <LoadingSpinner v-if="loadingSecrets" message="Loading secrets..." />
        
        <div v-else-if="secrets.length === 0" class="text-center py-8 text-east-bay-500">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-east-bay-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p class="text-lg font-semibold text-east-bay-700">No secrets found</p>
          <p class="mt-1">No token secrets directly associated with this Service Account.</p>
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-east-bay-200">
            <thead class="bg-east-bay-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-east-bay-200">
              <tr v-for="secret in secrets" :key="secret.metadata.name" class="hover:bg-east-bay-100">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-east-bay-900">{{ secret.metadata.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-east-bay-600">{{ secret.type }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-east-bay-600">{{ formatDate(secret.metadata.creationTimestamp) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- Delete Confirmation Dialog -->
    <div v-if="deleteDialog.show" class="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" aria-hidden="true"></div>
      <div class="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full mx-4">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 class="text-lg leading-6 font-medium text-east-bay-900" id="modal-title">Delete User</h3>
              <div class="mt-2">
                <p class="text-sm text-east-bay-600">
                  Are you sure you want to delete the Service Account <strong class="font-semibold text-east-bay-700">{{ user?.metadata.name }}</strong> in namespace <strong class="font-semibold text-east-bay-700">{{ user?.metadata.namespace }}</strong>?
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-east-bay-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
          <button type="button" 
                  @click="deleteUserConfirmed" 
                  class="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  :disabled="deletingUser">
            {{ deletingUser ? 'Deleting...' : 'Delete' }}
          </button>
          <button type="button" 
                  @click="deleteDialog.show = false" 
                  class="mt-3 w-full inline-flex justify-center rounded-lg border border-east-bay-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-east-bay-700 hover:bg-east-bay-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-east-bay-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  :disabled="deletingUser">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import apiService from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import AlertMessage from '@/components/AlertMessage.vue';
import ServiceAccountPermissions from '@/components/ServiceAccountPermissions.vue';

const router = useRouter();
const route = useRoute();

const namespace = route.params.namespace;
const name = route.params.name;

const loading = ref(true);
const loadingSecrets = ref(true);
const deletingUser = ref(false);
const user = ref(null);
const secrets = ref([]);

const deleteDialog = ref({ show: false });
const alert = ref({ show: false, message: '', type: 'info' });

const showAlert = (message, type = 'info', duration = 5000) => {
  alert.value = { show: true, message, type };
  if (duration > 0) {
    setTimeout(() => { alert.value.show = false; }, duration);
  }
};

const fetchUserDetails = async () => {
  loading.value = true;
  loadingSecrets.value = true;
  
  try {
    const saPromise = apiService.getUser(namespace, name);

    const [saData] = await Promise.all([
      saPromise
    ]);
    user.value = saData;

    if (user.value.secrets) {
        secrets.value = user.value.secrets; // If SA object includes secrets
    }

    loading.value = false;
    loadingSecrets.value = false;

  } catch (error) {
    console.error(`Error fetching details for user ${name} in ${namespace}:`, error);
    showAlert(`Failed to load user details for ${name}. ${error.message || 'Server error'}`, 'error');
    user.value = null; // Set user to null so the 'not found' message appears
    
    // Reset all data
    secrets.value = [];
  } finally {
    loading.value = false;
    loadingSecrets.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

const downloadKubeconfig = async () => {
  try {
    const result = await apiService.downloadUserKubeconfig(namespace, name);
    if (result && result.success) {
      showAlert('Kubeconfig downloaded successfully.', 'success');
    } else {
      showAlert(result.message || 'Failed to download Kubeconfig.', 'error');
    }
  } catch (error) {
    console.error('Error downloading Kubeconfig:', error);
    showAlert(`Error downloading Kubeconfig: ${error.message || 'Server error'}`, 'error');
  }
};

const confirmDelete = () => {
  deleteDialog.value.show = true;
};

const deleteUserConfirmed = async () => {
  deletingUser.value = true;
  try {
    await apiService.deleteUser(namespace, name);
    showAlert(`User ${name} deleted successfully.`, 'success');
    router.push('/users');
  } catch (error) {
    console.error('Error deleting user:', error);
    showAlert(`Error deleting user ${name}: ${error.message || 'Server error'}. Please check if the user has dependent resources (like active RoleBindings not managed by this tool).`, 'error', 10000);
  } finally {
    deleteDialog.value.show = false;
    deletingUser.value = false;
  }
};

// Handle permission component events
const handlePermissionSuccess = (message) => {
  showAlert(message, 'success');
};

const handlePermissionError = (message) => {
  showAlert(message, 'error');
};

onMounted(() => {
  console.log('UserDetail component mounted');
  console.log('User namespace:', namespace);
  console.log('User name:', name);
  
  // Fetch user details
  fetchUserDetails();
});
</script>