<template>
  <div>
    <div class="flex items-center mb-6">
      <router-link to="/users" class="text-east-bay-600 hover:text-east-bay-800 mr-4 p-1 rounded-full hover:bg-east-bay-100">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
        </svg>
      </router-link>
      <h1 class="text-2xl font-bold text-east-bay-800">Create Service Account User</h1>
    </div>
    
    <AlertMessage 
      v-if="alert.show" 
      :message="alert.message" 
      :type="alert.type" 
      @dismiss="alert.show = false"
      class="mb-6 rounded-lg"
    />
    
    <div class="bg-white p-6 rounded-lg shadow-xl">
      <LoadingSpinner v-if="loading.submit" message="Preparing form..." />
      
      <form v-else @submit.prevent="submitForm" class="space-y-8">
        <!-- User Info Section -->
        <section>
          <h2 class="text-lg font-medium text-east-bay-800 mb-4">User Information</h2>
          
          <div>
            <!-- Name Field -->
            <div>
              <label for="name" class="block text-sm font-medium text-east-bay-700 mb-1">
                Name <span class="text-red-500">*</span>
              </label>
              <input 
                id="name" 
                v-model="formData.name" 
                type="text" 
                required 
                @input="validateName"
                class="mt-1 block w-full px-3 py-2 border border-east-bay-300 rounded-md shadow-sm focus:outline-none focus:ring-east-bay-500 focus:border-east-bay-500 sm:text-sm"
                :class="{'border-red-500 focus:border-red-500 focus:ring-red-500': nameError}"
                placeholder="e.g. app-developer"
              />
              <p v-if="nameError" class="mt-1 text-sm text-red-600">{{ nameError }}</p>
              <p v-else class="mt-1 text-xs text-east-bay-500">
                Must consist of lowercase alphanumeric characters or "-", and must start and end with an alphanumeric character
              </p>
            </div>
          </div>
        </section>
        
        <!-- Permissions Section -->
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 class="text-lg font-medium text-east-bay-800 mb-4">Permissions</h2>
          
          <div class="mb-6">
            <p class="text-sm text-east-bay-600 mb-4">
              Choose what level of access this user will have. You can also assign additional custom roles after user creation.
            </p>
            
            <div class="space-y-4">
              <label class="flex items-start">
                <input
                  type="radio"
                  v-model="permissionType"
                  value="none"
                  class="mt-1 h-4 w-4 text-east-bay-600 focus:ring-east-bay-500 border-east-bay-300 rounded"
                />
                <div class="ml-3">
                  <span class="block text-sm font-medium text-east-bay-700">No special permissions</span>
                  <span class="block text-xs text-east-bay-500">User will only be able to authenticate but won't have access to resources.</span>
                </div>
              </label>
              
              <label class="flex items-start">
                <input
                  type="radio"
                  v-model="permissionType"
                  value="view"
                  class="mt-1 h-4 w-4 text-east-bay-600 focus:ring-east-bay-500 border-east-bay-300 rounded"
                />
                <div class="ml-3">
                  <span class="block text-sm font-medium text-east-bay-700">View Access</span>
                  <span class="block text-xs text-east-bay-500">Can view resources in the application namespace, but cannot modify anything.</span>
                </div>
              </label>
              
              <label class="flex items-start">
                <input
                  type="radio"
                  v-model="permissionType"
                  value="edit"
                  class="mt-1 h-4 w-4 text-east-bay-600 focus:ring-east-bay-500 border-east-bay-300 rounded"
                />
                <div class="ml-3">
                  <span class="block text-sm font-medium text-east-bay-700">Edit Access</span>
                  <span class="block text-xs text-east-bay-500">Can create, modify, and delete resources in the application namespace.</span>
                </div>
              </label>
              
              <label class="flex items-start">
                <input
                  type="radio"
                  v-model="permissionType"
                  value="custom"
                  class="mt-1 h-4 w-4 text-east-bay-600 focus:ring-east-bay-500 border-east-bay-300 rounded"
                />
                <div class="ml-3">
                  <span class="block text-sm font-medium text-east-bay-700">Custom Roles</span>
                  <span class="block text-xs text-east-bay-500">Select from existing roles to bind to this user.</span>
                </div>
              </label>
            </div>
          </div>
          
          <!-- Custom Role Selection -->
          <div v-if="permissionType === 'custom'" class="mb-6 border-t border-east-bay-200 pt-4">
            <div v-if="loading.roles" class="py-4 text-center">
              <LoadingSpinner message="Loading available roles..." />
            </div>
            
            <div v-else>
              <h3 class="text-sm font-medium text-east-bay-700 mb-2">Select Roles to Bind</h3>
              
              <div class="space-y-3">
                <!-- Namespaced Roles -->
                <div>
                  <h4 class="text-xs font-medium text-east-bay-600 mb-1">Namespace Roles (in application namespace)</h4>
                  <div v-if="availableRoles.length === 0" class="text-xs text-east-bay-500 italic">
                    No available roles found in the application namespace
                  </div>
                  <div v-else class="space-y-2 max-h-40 overflow-y-auto p-2 border border-east-bay-200 rounded-md">
                    <label v-for="role in availableRoles" :key="role.metadata.name" class="flex items-center">
                      <input
                        type="checkbox"
                        v-model="selectedRoles"
                        :value="{ kind: 'Role', name: role.metadata.name }"
                        class="h-4 w-4 text-east-bay-600 focus:ring-east-bay-500 border-east-bay-300 rounded"
                      />
                      <span class="ml-2 text-sm text-east-bay-700">{{ role.metadata.name }}</span>
                    </label>
                  </div>
                </div>
                
                <!-- Cluster Roles -->
                <div>
                  <h4 class="text-xs font-medium text-east-bay-600 mb-1">Cluster Roles</h4>
                  <div v-if="availableClusterRoles.length === 0" class="text-xs text-east-bay-500 italic">
                    No available cluster roles found
                  </div>
                  <div v-else class="space-y-2 max-h-40 overflow-y-auto p-2 border border-east-bay-200 rounded-md">
                    <label v-for="role in availableClusterRoles" :key="role.metadata.name" class="flex items-center">
                      <input
                        type="checkbox"
                        v-model="selectedRoles"
                        :value="{ kind: 'ClusterRole', name: role.metadata.name }"
                        class="h-4 w-4 text-east-bay-600 focus:ring-east-bay-500 border-east-bay-300 rounded"
                      />
                      <span class="ml-2 text-sm text-east-bay-700">{{ role.metadata.name }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end space-x-3 pt-6 border-t border-east-bay-200">
          <router-link to="/users" class="px-4 py-2 border border-east-bay-300 shadow-sm text-sm font-medium rounded-lg text-east-bay-700 bg-white hover:bg-east-bay-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-east-bay-500">
            Cancel
          </router-link>
          <button type="submit" 
            class="px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-east-bay-600 hover:bg-east-bay-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-east-bay-500 disabled:opacity-50 disabled:bg-east-bay-400"
            :disabled="loading.submit || !isFormValid">
            <span v-if="loading.submit" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating User...
            </span>
            <span v-else>Create User</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import apiService from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import AlertMessage from '@/components/AlertMessage.vue';

const router = useRouter();

const loading = reactive({
  submit: false,
  roles: true
});

const formData = reactive({
  name: '',
});

const permissionType = ref('none');
const selectedRoles = ref([]);
const availableRoles = ref([]);
const availableClusterRoles = ref([]);
const alert = ref({ show: false, message: '', type: 'info' });

const nameError = ref('');

// Form validation
const isFormValid = computed(() => {
  const isNameValid = formData.name && formData.name.trim().length > 0 && !nameError.value;
  return isNameValid;
});

// Validate service account name
const validateName = () => {
  const name = formData.name.trim();
  
  if (!name) {
    nameError.value = 'Name is required';
    return false;
  }
  
  // K8s service account naming rules (simplification): lowercase alphanumeric, '-', max 253 chars
  if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(name)) {
    nameError.value = 'Name must consist of lowercase alphanumeric characters or "-", and must start and end with an alphanumeric character';
    return false;
  }
  
  if (name.length > 253) {
    nameError.value = 'Name cannot exceed 253 characters';
    return false;
  }
  
  nameError.value = '';
  return true;
};

// Show alert message
const showAlert = (message, type = 'info', duration = 5000) => {
  alert.value = { show: true, message, type };
  if (duration > 0) {
    setTimeout(() => { alert.value.show = false; }, duration);
  }
};

// Fetch available roles
const fetchRoles = async () => {
  try {
    loading.roles = true;
    const data = await apiService.getAllRolesAndClusterRoles();
    
    if (data) {
      availableRoles.value = data.roles || [];
      availableClusterRoles.value = data.clusterRoles || [];
    }
  } catch (error) {
    console.error('Error fetching roles:', error);
    showAlert('Failed to load roles. ' + (error.message || ''), 'error');
  } finally {
    loading.roles = false;
  }
};

// Handle form submission
const submitForm = async () => {
  if (!validateName()) {
    return;
  }
  
  loading.submit = true;
  
  try {
    // Create user with basic options
    const userData = {
      name: formData.name,
      grantViewAccess: permissionType.value === 'view',
      grantEditAccess: permissionType.value === 'edit'
    };
    
    console.log('Creating user with options:', JSON.stringify(userData, null, 2));
    const userResult = await apiService.createUser(userData);
    const appNamespace = userResult.user.metadata.namespace; // Get the namespace where user was created
    
    // Display detailed success message based on permissions granted
    let successMessage = 'User created successfully!';
    if (permissionType.value === 'view') {
      successMessage = 'User created successfully with view permissions!';
    } else if (permissionType.value === 'edit') {
      successMessage = 'User created successfully with edit permissions!';
    }
    
    // Check if there was a warning in the response (user created but kubeconfig failed)
    if (userResult.warning) {
      showAlert(`${successMessage} Warning: ${userResult.warning}`, 'warning');
    } else {
      showAlert(successMessage, 'success');
    }
    
    // If custom roles are selected, create role bindings
    if (permissionType.value === 'custom' && selectedRoles.value.length > 0) {
      try {
        // Create role bindings for each selected role
        const bindingPromises = selectedRoles.value.map(async (role) => {
          const bindingName = `${formData.name}-${role.name}`;
          
          if (role.kind === 'Role') {
            return apiService.createRoleBinding(appNamespace, {
              name: bindingName,
              roleName: role.name,
              serviceAccountName: formData.name,
              serviceAccountNamespace: appNamespace
            });
          } else if (role.kind === 'ClusterRole') {
            return apiService.createClusterRoleBinding({
              name: bindingName,
              clusterRoleName: role.name,
              serviceAccountName: formData.name,
              serviceAccountNamespace: appNamespace
            });
          }
        });
        
        await Promise.all(bindingPromises);
      } catch (bindingError) {
        // Show warning if role binding creation fails, but continue navigation
        console.error('Error creating role bindings:', bindingError);
        showAlert(`User created successfully, but there was an error adding some role bindings: ${bindingError.message}`, 'warning');
      }
    }
    
    // Navigate to user detail page
    setTimeout(() => {
      router.push(`/users/${appNamespace}/${formData.name}`);
    }, 1500);
  } catch (error) {
    console.error('Error creating user:', error);
    
    // Check if the error response indicates the user was actually created
    if (error.response?.data?.user) {
      showAlert(`User was created but with errors: ${error.response.data.message || error.message}`, 'warning');
      setTimeout(() => {
        const namespace = error.response.data.user.metadata.namespace;
        const name = error.response.data.user.metadata.name;
        router.push(`/users/${namespace}/${name}`);
      }, 1500);
    } else {
      showAlert(`Failed to create user: ${error.response?.data?.message || error.message || 'Unknown error'}`, 'error');
    }
  } finally {
    loading.submit = false;
  }
};

onMounted(() => {
  fetchRoles();
});

</script>

<!-- No custom styles needed, all Tailwind --> 