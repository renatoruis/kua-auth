<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Users</h1>
      <router-link to="/users/create" class="btn-primary">Create User</router-link>
    </div>
    
    <AlertMessage 
      v-if="alert.show" 
      :message="alert.message" 
      :type="alert.type" 
      @dismiss="alert.show = false" 
    />
    
    <div class="card">
      <LoadingSpinner v-if="loading" message="Loading users..." />
      
      <div v-else-if="users.length === 0" class="text-center py-8 text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <p class="text-lg">No users found</p>
        <p class="mt-2">Create a new user to get started</p>
        <router-link to="/users/create" class="btn-primary mt-4 inline-block">Create User</router-link>
      </div>
      
      <div v-else>
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Namespace</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="user in users" :key="user.metadata.uid" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ user.metadata.name }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">{{ user.metadata.namespace }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">{{ formatDate(user.metadata.creationTimestamp) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <router-link 
                  :to="`/users/${user.metadata.namespace}/${user.metadata.name}`"
                  class="text-indigo-600 hover:text-indigo-900"
                  title="View details"
                >
                  <p>View details</p>
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Delete Confirmation Dialog -->
    <div v-if="deleteDialog.show" class="fixed inset-0 z-10 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 class="text-lg leading-6 font-medium text-gray-900">Delete User</h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    Are you sure you want to delete the user <span class="font-semibold">{{ deleteDialog.name }}</span>? 
                    This action cannot be undone and will remove all associated roles and permissions.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button 
              @click="deleteUser" 
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Delete
            </button>
            <button 
              @click="deleteDialog.show = false" 
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import AlertMessage from '@/components/AlertMessage.vue';

// State
const users = ref([]);
const loading = ref(true);
const alert = ref({
  show: false,
  message: '',
  type: 'info'
});
const deleteDialog = ref({
  show: false,
  namespace: '',
  name: ''
});

// Fetch users
const fetchUsers = async () => {
  loading.value = true;
  try {
    users.value = await api.getUsers();
  } catch (error) {
    console.error('Error fetching users:', error);
    showAlert('Failed to load users', 'error');
  } finally {
    loading.value = false;
  }
};

// Format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

// Show alert
const showAlert = (message, type = 'info') => {
  alert.value = {
    show: true,
    message,
    type
  };
};

// Download kubeconfig
const downloadKubeconfig = async (namespace, name) => {
  try {
    const success = await api.downloadKubeconfig(namespace, name);
    if (success) {
      showAlert(`Kubeconfig for ${name} downloaded successfully`, 'success');
    } else {
      showAlert(`Failed to download kubeconfig for ${name}`, 'error');
    }
  } catch (error) {
    console.error('Error downloading kubeconfig:', error);
    showAlert(`Failed to download kubeconfig for ${name}`, 'error');
  }
};

// Confirm delete
const confirmDelete = (namespace, name) => {
  deleteDialog.value = {
    show: true,
    namespace,
    name
  };
};

// Delete user
const deleteUser = async () => {
  try {
    await api.deleteUser(deleteDialog.value.namespace, deleteDialog.value.name);
    showAlert(`User ${deleteDialog.value.name} deleted successfully`, 'success');
    deleteDialog.value.show = false;
    fetchUsers(); // Refresh the user list
  } catch (error) {
    console.error('Error deleting user:', error);
    showAlert(`Failed to delete user ${deleteDialog.value.name}`, 'error');
  }
};

// Load data on component mount
onMounted(() => {
  fetchUsers();
});
</script> 