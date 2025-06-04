<template>
  <div>
    <div class="flex items-center mb-6">
      <router-link to="/roles" class="text-east-bay-600 hover:text-east-bay-800 mr-4 p-1 rounded-full hover:bg-east-bay-100">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
        </svg>
      </router-link>
      <h1 class="text-2xl font-bold text-east-bay-800">Create Custom Role</h1>
    </div>
    
    <AlertMessage 
      v-if="alert.show" 
      :message="alert.message" 
      :type="alert.type" 
      @dismiss="alert.show = false"
      class="mb-6 rounded-lg"
    />
    
    <div class="bg-white p-6 rounded-lg shadow-xl">
      <LoadingSpinner v-if="loading" message="Preparing form..." />
      
      <form v-else @submit.prevent="createRoleHandler" class="space-y-8">
        <!-- Role Info Section -->
        <section>
          <h2 class="text-lg font-semibold text-east-bay-900 mb-1">Role Details</h2>
          <p class="text-sm text-east-bay-600 mb-4">
            Define the name and scope for the new Role.
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label for="name" class="block text-sm font-medium text-east-bay-700 mb-1">Role Name</label>
              <input 
                id="name" 
                v-model="form.name" 
                type="text" 
                required 
                placeholder="e.g., custom-viewer"
                class="block w-full px-3 py-2 border border-east-bay-300 rounded-md shadow-sm focus:outline-none focus:ring-east-bay-500 focus:border-east-bay-500 sm:text-sm text-east-bay-900 placeholder-east-bay-400"
              />
            </div>
            <div>
              <label for="roleType" class="block text-sm font-medium text-east-bay-700 mb-1">Role Type</label>
              <div class="mt-1">
                <select 
                  id="roleType" 
                  v-model="form.roleType" 
                  required
                  class="block w-full px-3 py-2 border border-east-bay-300 rounded-md shadow-sm focus:outline-none focus:ring-east-bay-500 focus:border-east-bay-500 sm:text-sm text-east-bay-900"
                >
                  <option value="namespace">Namespaced Role</option>
                  <option value="cluster">ClusterRole</option>
                </select>
              </div>
            </div>
          </div>
          
          <div v-if="form.roleType === 'namespace'" class="mt-4">
            <label for="namespace" class="block text-sm font-medium text-east-bay-700 mb-1">Namespace</label>
            <select 
              id="namespace" 
              v-model="form.namespace" 
              required
              class="block w-full px-3 py-2 border border-east-bay-300 rounded-md shadow-sm focus:outline-none focus:ring-east-bay-500 focus:border-east-bay-500 sm:text-sm text-east-bay-900"
            >
              <option v-for="ns in availableNamespaces" :key="ns" :value="ns">{{ ns }}</option>
            </select>
          </div>
        </section>
        
        <!-- Permission Templates Section -->
        <section>
          <h2 class="text-lg font-semibold text-east-bay-900 mb-1">Use Template</h2>
          <p class="text-sm text-east-bay-600 mb-4">Optionally select a permission template as a starting point.</p>
          
          <div class="space-y-4">
            <select 
              v-model="selectedTemplate"
              @change="applyTemplate" 
              class="block w-full px-3 py-2 border border-east-bay-300 rounded-md shadow-sm focus:outline-none focus:ring-east-bay-500 focus:border-east-bay-500 sm:text-sm text-east-bay-900"
            >
              <option value="">-- Select a template --</option>
              <option v-for="template in permissionTemplates" :key="template.name" :value="template">
                {{ template.name }} - {{ template.description }}
              </option>
            </select>
          </div>
        </section>
        
        <!-- Rules Section -->
        <section>
          <div class="flex justify-between items-center mb-2">
            <h2 class="text-lg font-semibold text-east-bay-900">Permission Rules</h2>
            <button 
              type="button"
              @click="addRule"
              class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-east-bay-600 hover:bg-east-bay-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-east-bay-500"
            >
              <span class="mr-1">+</span> Add Rule
            </button>
          </div>
          <p class="text-sm text-east-bay-600 mb-4">Define the permissions for this role.</p>
          
          <div v-if="form.rules.length === 0" class="text-center py-6 border-2 border-dashed border-east-bay-300 rounded-lg">
            <p class="text-east-bay-500">No rules defined yet. Add a rule to define permissions.</p>
          </div>
          
          <div v-else class="space-y-6">
            <div v-for="(rule, index) in form.rules" :key="index" class="p-4 border border-east-bay-200 rounded-lg bg-east-bay-50">
              <div class="flex justify-between items-start mb-3">
                <h3 class="text-md font-medium text-east-bay-700">Rule #{{ index + 1 }}</h3>
                <button 
                  type="button"
                  @click="removeRule(index)"
                  class="text-east-bay-600 hover:text-east-bay-800 p-1 rounded-full hover:bg-east-bay-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label :for="`apiGroups-${index}`" class="block text-sm font-medium text-east-bay-700 mb-1">
                    API Groups <span class="text-xs text-east-bay-500">(comma-separated, use "*" for all)</span>
                  </label>
                  <input 
                    :id="`apiGroups-${index}`" 
                    v-model="rule.apiGroupsText" 
                    @input="updateApiGroups(index)"
                    type="text" 
                    required 
                    placeholder="e.g., apps,extensions,*"
                    class="block w-full px-3 py-2 border border-east-bay-300 rounded-md shadow-sm focus:outline-none focus:ring-east-bay-500 focus:border-east-bay-500 sm:text-sm text-east-bay-900 placeholder-east-bay-400"
                  />
                </div>
                <div>
                  <label :for="`resources-${index}`" class="block text-sm font-medium text-east-bay-700 mb-1">
                    Resources <span class="text-xs text-east-bay-500">(comma-separated, use "*" for all)</span>
                  </label>
                  <input 
                    :id="`resources-${index}`" 
                    v-model="rule.resourcesText" 
                    @input="updateResources(index)"
                    type="text" 
                    required 
                    placeholder="e.g., pods,deployments,services"
                    class="block w-full px-3 py-2 border border-east-bay-300 rounded-md shadow-sm focus:outline-none focus:ring-east-bay-500 focus:border-east-bay-500 sm:text-sm text-east-bay-900 placeholder-east-bay-400"
                  />
                </div>
              </div>
              
              <div>
                <label :for="`verbs-${index}`" class="block text-sm font-medium text-east-bay-700 mb-1">
                  Verbs <span class="text-xs text-east-bay-500">(select permissions)</span>
                </label>
                <div class="mt-1 flex flex-wrap gap-2">
                  <div v-for="verb in availableVerbs" :key="verb" class="flex items-center">
                    <input
                      :id="`verb-${index}-${verb}`"
                      type="checkbox"
                      :value="verb"
                      v-model="rule.verbs"
                      class="h-4 w-4 text-east-bay-600 focus:ring-east-bay-500 border-east-bay-300 rounded"
                    />
                    <label :for="`verb-${index}-${verb}`" class="ml-2 text-sm text-east-bay-700">
                      {{ verb }}
                    </label>
                  </div>
                  <div class="flex items-center">
                    <input
                      :id="`verb-${index}-all`"
                      type="checkbox"
                      value="*"
                      v-model="rule.verbs"
                      class="h-4 w-4 text-east-bay-600 focus:ring-east-bay-500 border-east-bay-300 rounded"
                    />
                    <label :for="`verb-${index}-all`" class="ml-2 text-sm text-east-bay-700">
                      all (*)
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div class="flex justify-end space-x-3 pt-6 border-t border-east-bay-200">
          <router-link :to="{ name: 'RoleList' }" 
            class="px-4 py-2 border border-east-bay-300 shadow-sm text-sm font-medium rounded-lg text-east-bay-700 bg-white hover:bg-east-bay-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-east-bay-500">
            Cancel
          </router-link>
          <button type="submit" 
            class="px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-east-bay-600 hover:bg-east-bay-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-east-bay-500 disabled:opacity-50 disabled:bg-east-bay-400"
            :disabled="submitting || form.rules.length === 0">
            <span v-if="submitting" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </span>
            <span v-else>Create Role</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import apiService from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import AlertMessage from '@/components/AlertMessage.vue';

const router = useRouter();

const loading = ref(true);
const submitting = ref(false);
const availableNamespaces = ref([]);
const alert = ref({ show: false, message: '', type: 'info' });
const permissionTemplates = ref([]);
const selectedTemplate = ref('');

const defaultNamespace = ref(apiService.DEFAULT_APP_NAMESPACE || 'default');

const availableVerbs = ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'];

const form = reactive({
  name: '',
  roleType: 'namespace',
  namespace: defaultNamespace.value,
  rules: []
});

const showAlert = (message, type = 'info', duration = 7000) => {
  alert.value = { show: true, message, type };
  if (duration > 0) {
    setTimeout(() => { if(alert.value.message === message) alert.value.show = false; }, duration);
  }
};

const fetchInitialData = async () => {
  loading.value = true;
  try {
    const [namespacesData, templatesData] = await Promise.all([
      apiService.getNamespaces(),
      apiService.getPermissionTemplates()
    ]);
    
    if (Array.isArray(namespacesData)) {
      availableNamespaces.value = namespacesData.sort();
      if (!availableNamespaces.value.includes(defaultNamespace.value)) {
        availableNamespaces.value.push(defaultNamespace.value);
      }
      form.namespace = defaultNamespace.value;
    } else if (namespacesData && namespacesData.items) {
      availableNamespaces.value = namespacesData.items.sort();
      form.namespace = defaultNamespace.value;
    } else {
      availableNamespaces.value = [defaultNamespace.value];
      form.namespace = defaultNamespace.value;
    }
    
    permissionTemplates.value = templatesData || [];
  } catch (error) {
    console.error('Error fetching initial data for role creation:', error);
    showAlert('Could not fetch data for role creation. ' + (error.message || ''), 'warning');
    availableNamespaces.value = [defaultNamespace.value];
    form.namespace = defaultNamespace.value;
    permissionTemplates.value = [];
  } finally {
    loading.value = false;
  }
};

const addRule = () => {
  form.rules.push({
    apiGroups: [''],
    apiGroupsText: '',
    resources: [''],
    resourcesText: '',
    verbs: []
  });
};

const removeRule = (index) => {
  form.rules.splice(index, 1);
};

const updateApiGroups = (index) => {
  const text = form.rules[index].apiGroupsText;
  form.rules[index].apiGroups = text.split(',').map(group => group.trim()).filter(group => group);
};

const updateResources = (index) => {
  const text = form.rules[index].resourcesText;
  form.rules[index].resources = text.split(',').map(resource => resource.trim()).filter(resource => resource);
};

const applyTemplate = () => {
  if (!selectedTemplate.value) return;
  
  form.rules = [];
  
  selectedTemplate.value.rules.forEach(rule => {
    const newRule = {
      apiGroups: [...rule.apiGroups],
      apiGroupsText: rule.apiGroups.join(','),
      resources: [...rule.resources],
      resourcesText: rule.resources.join(','),
      verbs: [...rule.verbs]
    };
    form.rules.push(newRule);
  });
};

const createRoleHandler = async () => {
  if (!form.name) {
    showAlert('Role name is required.', 'error');
    return;
  }
  
  if (form.rules.length === 0) {
    showAlert('At least one permission rule is required.', 'error');
    return;
  }
  
  // Validate each rule
  const invalidRules = form.rules.filter(rule => 
    !rule.apiGroups.length || !rule.resources.length || !rule.verbs.length
  );
  
  if (invalidRules.length > 0) {
    showAlert('All rules must have at least one API group, resource, and verb.', 'error');
    return;
  }

  submitting.value = true;
  try {
    // Prepare the payload (omit the text fields used for UI)
    const roleData = {
      name: form.name,
      rules: form.rules.map(rule => ({
        apiGroups: rule.apiGroups,
        resources: rule.resources,
        verbs: rule.verbs
      }))
    };
    
    let result;
    if (form.roleType === 'namespace') {
      result = await apiService.createRole(form.namespace, roleData);
    } else {
      result = await apiService.createOrUpdateClusterRole(null, roleData);
    }
    
    showAlert(
      `${form.roleType === 'namespace' ? 'Role' : 'ClusterRole'} '${form.name}' created successfully.`, 
      'success'
    );
    router.push({ name: 'RoleList' });
  } catch (error) {
    console.error('Error creating role:', error);
    showAlert(
      `Failed to create ${form.roleType === 'namespace' ? 'role' : 'cluster role'}. ${error.response?.data?.message || error.message || 'Server error'}`, 
      'error'
    );
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  fetchInitialData();
});
</script> 