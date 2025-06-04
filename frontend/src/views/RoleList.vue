<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-east-bay-800">Managed RBAC Resources</h1>
      <router-link :to="{ name: 'RoleCreate' }" 
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-east-bay-600 hover:bg-east-bay-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-east-bay-500">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        Create Custom Role
      </router-link>
    </div>
    
    <AlertMessage 
      v-if="alert.show" 
      :message="alert.message" 
      :type="alert.type" 
      @dismiss="alert.show = false" 
      class="mb-6 rounded-lg"
    />
    
    <!-- Tabs -->
    <div class="mb-6 border-b border-east-bay-300">
      <nav class="-mb-px flex space-x-8" aria-label="Tabs">
        <button 
          @click="activeTab = 'roles'" 
          :class="[
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none',
            activeTab === 'roles' 
              ? 'border-east-bay-500 text-east-bay-600' 
              : 'border-transparent text-east-bay-500 hover:text-east-bay-700 hover:border-east-bay-400'
          ]"
        >
          Managed Roles
        </button>
        <button 
          @click="activeTab = 'clusterRoles'" 
          :class="[
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none',
            activeTab === 'clusterRoles' 
              ? 'border-east-bay-500 text-east-bay-600' 
              : 'border-transparent text-east-bay-500 hover:text-east-bay-700 hover:border-east-bay-400'
          ]"
        >
          Managed ClusterRoles
        </button>
        <button 
          @click="activeTab = 'roleBindings'" 
          :class="[
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none',
            activeTab === 'roleBindings' 
              ? 'border-east-bay-500 text-east-bay-600' 
              : 'border-transparent text-east-bay-500 hover:text-east-bay-700 hover:border-east-bay-400'
          ]"
        >
          Managed RoleBindings
        </button>
        <button 
          @click="activeTab = 'clusterRoleBindings'" 
          :class="[
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none',
            activeTab === 'clusterRoleBindings' 
              ? 'border-east-bay-500 text-east-bay-600' 
              : 'border-transparent text-east-bay-500 hover:text-east-bay-700 hover:border-east-bay-400'
          ]"
        >
          Managed ClusterRoleBindings
        </button>
      </nav>
    </div>
    
    <LoadingSpinner v-if="loading.initial" message="Loading RBAC resources..." />

    <!-- Tab Content -->
    <div v-show="!loading.initial">
      <!-- Kubernetes Roles Tab -->
      <div v-if="activeTab === 'roles'">
        <div class="bg-white p-4 md:p-6 rounded-lg shadow-xl">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-east-bay-700">Managed Kubernetes Roles</h2>
          </div>
          
          <LoadingSpinner v-if="loading.roles" message="Loading Roles..." />
          
          <div v-else-if="filteredAppRoles.length === 0" class="text-center py-8 text-east-bay-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-east-bay-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p class="text-lg font-semibold text-east-bay-700">No Managed Roles found</p>
            <p class="mt-1">No Roles are managed by this application yet.</p>
          </div>
          
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-east-bay-200">
              <thead class="bg-east-bay-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">Namespace</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">Rules</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-east-bay-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-east-bay-200">
                <tr v-for="role in filteredAppRoles" :key="role.metadata.uid" class="hover:bg-east-bay-100">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-east-bay-900">{{ role.metadata.name }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-east-bay-600">{{ role.metadata.namespace }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-east-bay-600">{{ role.rules ? role.rules.length : 0 }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button @click="viewResourceDetails(role, 'Role')" class="text-east-bay-600 hover:text-east-bay-800 font-medium px-3 py-1.5 rounded-lg hover:bg-east-bay-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-east-bay-500">View</button>
                    <button @click="confirmDeleteRole(role, 'Role')" class="text-red-600 hover:text-red-800 font-medium px-3 py-1.5 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <!-- Cluster Roles Tab -->
      <div v-if="activeTab === 'clusterRoles'">
        <div class="bg-white p-4 md:p-6 rounded-lg shadow-xl">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-east-bay-700">Managed Kubernetes ClusterRoles</h2>
             <input 
              type="text" 
              v-model="filters.clusterRoles.search"
              placeholder="Search ClusterRoles (name)..."
              class="w-1/2 md:w-1/3 px-3 py-2 border border-east-bay-300 rounded-md shadow-sm focus:outline-none focus:ring-east-bay-500 focus:border-east-bay-500 sm:text-sm text-east-bay-900 placeholder-east-bay-400 bg-white"
            />
          </div>
                    
          <LoadingSpinner v-if="loading.clusterRoles" message="Loading ClusterRoles..." />
          
          <div v-else-if="filteredAppClusterRoles.length === 0" class="text-center py-8 text-east-bay-500">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-east-bay-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p class="text-lg font-semibold text-east-bay-700">No Managed ClusterRoles found</p>
            <p class="mt-1">No ClusterRoles are managed by this application yet.</p>
          </div>
          
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-east-bay-200">
              <thead class="bg-east-bay-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">Rules</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-east-bay-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-east-bay-200">
                <tr v-for="role in filteredAppClusterRoles" :key="role.metadata.uid" class="hover:bg-east-bay-100">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-east-bay-900">{{ role.metadata.name }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-east-bay-600">{{ role.rules ? role.rules.length : 0 }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button @click="viewResourceDetails(role, 'ClusterRole')" class="text-east-bay-600 hover:text-east-bay-800 font-medium px-3 py-1.5 rounded-lg hover:bg-east-bay-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-east-bay-500">View</button>
                    <button @click="confirmDeleteRole(role, 'ClusterRole')" class="text-red-600 hover:text-red-800 font-medium px-3 py-1.5 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <!-- RoleBindings Tab -->
      <div v-if="activeTab === 'roleBindings'">
        <div class="bg-white p-4 md:p-6 rounded-lg shadow-xl">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-east-bay-700">Managed RoleBindings</h2>
          </div>
          
          <LoadingSpinner v-if="loading.roleBindings" message="Loading RoleBindings..." />
          
          <div v-else-if="filteredRoleBindings.length === 0" class="text-center py-8 text-east-bay-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-east-bay-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p class="text-lg font-semibold text-east-bay-700">No Managed RoleBindings found</p>
            <p class="mt-1">No RoleBindings are managed by this application yet.</p>
          </div>
          
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-east-bay-200">
              <thead class="bg-east-bay-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">Namespace</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">Role</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">Subject</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-east-bay-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-east-bay-200">
                <tr v-for="binding in filteredRoleBindings" :key="binding.metadata.uid" class="hover:bg-east-bay-100">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-east-bay-900">{{ binding.metadata.name }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-east-bay-600">{{ binding.metadata.namespace }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-east-bay-600">
                    {{ binding.roleRef.kind }}/{{ binding.roleRef.name }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-east-bay-600">
                    <div v-for="(subject, index) in binding.subjects" :key="index" class="mb-1">
                      {{ subject.kind }}/{{ subject.name }}
                      <span v-if="subject.namespace && subject.namespace !== binding.metadata.namespace">
                        ({{ subject.namespace }})
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button @click="viewResourceDetails(binding, 'RoleBinding')" class="text-east-bay-600 hover:text-east-bay-800 font-medium px-3 py-1.5 rounded-lg hover:bg-east-bay-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-east-bay-500">View</button>
                    <button @click="confirmDeleteBinding(binding, 'RoleBinding')" class="text-red-600 hover:text-red-800 font-medium px-3 py-1.5 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <!-- ClusterRoleBindings Tab -->
      <div v-if="activeTab === 'clusterRoleBindings'">
        <div class="bg-white p-4 md:p-6 rounded-lg shadow-xl">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-east-bay-700">Managed ClusterRoleBindings</h2>
            <input 
              type="text" 
              v-model="filters.clusterRoleBindings.search"
              placeholder="Search ClusterRoleBindings (name)..."
              class="w-1/2 md:w-1/3 px-3 py-2 border border-east-bay-300 rounded-md shadow-sm focus:outline-none focus:ring-east-bay-500 focus:border-east-bay-500 sm:text-sm text-east-bay-900 placeholder-east-bay-400 bg-white"
            />
          </div>
          
          <LoadingSpinner v-if="loading.clusterRoleBindings" message="Loading ClusterRoleBindings..." />
          
          <div v-else-if="filteredClusterRoleBindings.length === 0" class="text-center py-8 text-east-bay-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-east-bay-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p class="text-lg font-semibold text-east-bay-700">No Managed ClusterRoleBindings found</p>
            <p class="mt-1">No ClusterRoleBindings are managed by this application yet.</p>
          </div>
          
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-east-bay-200">
              <thead class="bg-east-bay-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">ClusterRole</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">Subject</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-east-bay-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-east-bay-200">
                <tr v-for="binding in filteredClusterRoleBindings" :key="binding.metadata.uid" class="hover:bg-east-bay-100">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-east-bay-900">{{ binding.metadata.name }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-east-bay-600">
                    {{ binding.roleRef.name }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-east-bay-600">
                    <div v-for="(subject, index) in binding.subjects" :key="index" class="mb-1">
                      {{ subject.kind }}/{{ subject.name }}
                      <span v-if="subject.namespace">
                        ({{ subject.namespace }})
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button @click="viewResourceDetails(binding, 'ClusterRoleBinding')" class="text-east-bay-600 hover:text-east-bay-800 font-medium px-3 py-1.5 rounded-lg hover:bg-east-bay-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-east-bay-500">View</button>
                    <button @click="confirmDeleteBinding(binding, 'ClusterRoleBinding')" class="text-red-600 hover:text-red-800 font-medium px-3 py-1.5 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Details Modal -->
    <div v-if="showDetailsModal" class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div class="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-lg font-medium text-east-bay-800">
            {{ selectedResourceType }} Details: {{ selectedResource?.metadata?.name }}
            <span v-if="selectedResourceType === 'Role'" class="text-sm text-east-bay-600">
              in namespace {{ selectedResource?.metadata?.namespace }}
            </span>
          </h3>
          <button 
            @click="showDetailsModal = false" 
            class="text-east-bay-500 hover:text-east-bay-700 focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="selectedResource" class="space-y-4">
          <!-- Basic Info -->
          <div class="bg-east-bay-50 p-4 rounded-lg">
            <h4 class="text-sm font-medium text-east-bay-800 mb-2">Basic Information</h4>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span class="text-east-bay-600">Name:</span>
                <span class="ml-2 text-east-bay-900 font-medium">{{ selectedResource.metadata.name }}</span>
              </div>
              <div v-if="selectedResourceType === 'Role'">
                <span class="text-east-bay-600">Namespace:</span>
                <span class="ml-2 text-east-bay-900 font-medium">{{ selectedResource.metadata.namespace }}</span>
              </div>
              <div>
                <span class="text-east-bay-600">Created:</span>
                <span class="ml-2 text-east-bay-900">{{ new Date(selectedResource.metadata.creationTimestamp).toLocaleString() }}</span>
              </div>
            </div>
          </div>

          <!-- Rules -->
          <div>
            <h4 class="text-sm font-medium text-east-bay-800 mb-2">Permission Rules</h4>
            <div v-if="!selectedResource.rules || selectedResource.rules.length === 0" class="text-sm text-east-bay-600 italic">
              No rules defined
            </div>
            <div v-else class="space-y-3">
              <div v-for="(rule, index) in selectedResource.rules" :key="index" class="border border-east-bay-200 rounded-lg p-3 text-sm">
                <h5 class="font-medium text-east-bay-700 mb-2">Rule #{{ index + 1 }}</h5>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <span class="text-east-bay-600">API Groups:</span>
                    <div class="mt-1 space-x-1">
                      <span v-for="group in rule.apiGroups" :key="group" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-east-bay-100 text-east-bay-800">
                        {{ group || '""' }}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <span class="text-east-bay-600">Resources:</span>
                    <div class="mt-1 flex flex-wrap gap-1">
                      <span v-for="resource in rule.resources" :key="resource" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-east-bay-100 text-east-bay-800">
                        {{ resource }}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div class="mt-3">
                  <span class="text-east-bay-600">Verbs (Actions):</span>
                  <div class="mt-1 flex flex-wrap gap-1">
                    <span v-for="verb in rule.verbs" :key="verb" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {{ verb }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button 
            @click="showDetailsModal = false" 
            class="px-4 py-2 border border-east-bay-300 shadow-sm text-sm font-medium rounded-lg text-east-bay-700 bg-white hover:bg-east-bay-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-east-bay-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
    
    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 class="text-lg font-medium text-red-700 mb-4">Confirm Deletion</h3>
        <p class="text-sm text-east-bay-700 mb-6">
          Are you sure you want to delete <span class="font-bold">{{ selectedResource?.metadata?.name }}</span>?
          <span v-if="selectedResourceType === 'Role' || selectedResourceType === 'RoleBinding'"> from namespace <span class="font-bold">{{ selectedResource?.metadata?.namespace }}</span></span>
          <br><br>
          This action cannot be undone.
        </p>
        <div class="flex justify-end space-x-3">
          <button 
            @click="showDeleteModal = false" 
            class="px-4 py-2 border border-east-bay-300 shadow-sm text-sm font-medium rounded-lg text-east-bay-700 bg-white hover:bg-east-bay-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-east-bay-500"
          >
            Cancel
          </button>
          <button 
            @click="selectedResourceType.includes('Binding') ? deleteBinding() : deleteRole()" 
            class="px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            :disabled="deleting"
          >
            <span v-if="deleting" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Deleting...
            </span>
            <span v-else>Delete</span>
          </button>
        </div>
      </div>
    </div>
    
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import apiService from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import AlertMessage from '@/components/AlertMessage.vue';

const activeTab = ref('roles'); 

const loading = reactive({
  initial: true, 
  roles: false, 
  clusterRoles: false,
  roleBindings: false,
  clusterRoleBindings: false,
});
const alert = ref({ show: false, message: '', type: 'info' });

const allRbacData = ref({ roles: [], clusterRoles: [] });
const allNamespaces = ref([]);

const filters = reactive({
  roles: {}, // No namespace filter anymore
  clusterRoles: { search: '' },
  roleBindings: {}, // No namespace filter anymore
  clusterRoleBindings: { search: '' },
});

const showDetailsModal = ref(false);
const showDeleteModal = ref(false);
const selectedResource = ref(null);
const selectedResourceType = ref('');
const deleting = ref(false);

const showAlert = (message, type = 'info', duration = 7000) => {
  alert.value = { show: true, message, type };
  if (duration > 0) {
    setTimeout(() => { if(alert.value.message === message) alert.value.show = false; }, duration);
  }
};

const fetchData = async () => {
  loading.initial = true;
  loading.roles = true;
  loading.clusterRoles = true;
  loading.roleBindings = true;
  loading.clusterRoleBindings = true;
  try {
    const [rbacData, namespacesData, bindingsData] = await Promise.all([
        apiService.getAllRolesAndClusterRoles(),
        apiService.getNamespaces(),
        apiService.getAllRoleBindingsAndClusterRoleBindings()
    ]);

    allRbacData.value = { 
        roles: rbacData.roles || [], 
        clusterRoles: rbacData.clusterRoles || [],
        roleBindings: bindingsData.roleBindings || [],
        clusterRoleBindings: bindingsData.clusterRoleBindings || []
    };
    
    if (namespacesData && namespacesData.items) {
        allNamespaces.value = namespacesData.items.sort();
    } else {
        allNamespaces.value = [];
    }

    console.log(`Loaded ${allRbacData.value.roleBindings.length} RoleBindings and ${allRbacData.value.clusterRoleBindings.length} ClusterRoleBindings`);

  } catch (error) {
    console.error('Error fetching RBAC data:', error);
    showAlert('Failed to load RBAC resources. ' + (error.message || ''), 'error');
    allRbacData.value = { 
      roles: [], 
      clusterRoles: [],
      roleBindings: [],
      clusterRoleBindings: []
    }; // Reset on error
    allNamespaces.value = [];
  } finally {
    loading.initial = false;
    loading.roles = false;
    loading.clusterRoles = false;
    loading.roleBindings = false;
    loading.clusterRoleBindings = false;
  }
};

const filteredAppRoles = computed(() => {
  let roles = allRbacData.value.roles || [];
  // No filtering by namespace anymore
  return roles;
});

const filteredAppClusterRoles = computed(() => {
  let clusterRoles = allRbacData.value.clusterRoles || [];
  if (filters.clusterRoles.search) {
    const searchTerm = filters.clusterRoles.search.toLowerCase();
    clusterRoles = clusterRoles.filter(cr => cr.metadata.name.toLowerCase().includes(searchTerm));
  }
  return clusterRoles;
});

const filteredRoleBindings = computed(() => {
  let roleBindings = allRbacData.value.roleBindings || [];
  // No filtering by namespace anymore
  return roleBindings;
});

const filteredClusterRoleBindings = computed(() => {
  let clusterRoleBindings = allRbacData.value.clusterRoleBindings || [];
  if (filters.clusterRoleBindings.search) {
    const searchTerm = filters.clusterRoleBindings.search.toLowerCase();
    clusterRoleBindings = clusterRoleBindings.filter(binding => binding.metadata.name.toLowerCase().includes(searchTerm));
  }
  return clusterRoleBindings;
});

const viewResourceDetails = (resource, type) => {
  selectedResource.value = JSON.parse(JSON.stringify(resource)); // Pass a copy
  selectedResourceType.value = type;
  showDetailsModal.value = true;
};

const confirmDeleteRole = (resource, type) => {
  selectedResource.value = JSON.parse(JSON.stringify(resource)); // Pass a copy
  selectedResourceType.value = type;
  showDeleteModal.value = true;
};

const deleteRole = async () => {
  if (!selectedResource.value || !selectedResourceType.value) {
    return;
  }

  deleting.value = true;
  try {
    const { name, namespace } = selectedResource.value.metadata;
    let result;

    if (selectedResourceType.value === 'Role') {
      result = await apiService.deleteRole(namespace, name);
    } else { // ClusterRole
      result = await apiService.deleteClusterRole(name);
    }

    showAlert(
      `${selectedResourceType.value} '${name}' deleted successfully.`,
      'success'
    );
    showDeleteModal.value = false;
    
    // Refresh the list
    await fetchData();
  } catch (error) {
    console.error('Error deleting role:', error);
    showAlert(
      `Failed to delete ${selectedResourceType.value.toLowerCase()}. ${error.response?.data?.message || error.message || 'Server error'}`,
      'error'
    );
  } finally {
    deleting.value = false;
  }
};

const confirmDeleteBinding = (binding, type) => {
  selectedResource.value = JSON.parse(JSON.stringify(binding)); // Pass a copy
  selectedResourceType.value = type;
  showDeleteModal.value = true;
};

const deleteBinding = async () => {
  if (!selectedResource.value || !selectedResourceType.value) {
    return;
  }

  deleting.value = true;
  try {
    const { name, namespace } = selectedResource.value.metadata;
    let result;

    if (selectedResourceType.value === 'RoleBinding') {
      result = await apiService.deleteRoleBinding(namespace, name);
    } else { // ClusterRoleBinding
      result = await apiService.deleteClusterRoleBinding(name);
    }

    showAlert(
      `${selectedResourceType.value} '${name}' deleted successfully.`,
      'success'
    );
    showDeleteModal.value = false;
    
    // Refresh the list
    await fetchData();
  } catch (error) {
    console.error('Error deleting binding:', error);
    showAlert(
      `Failed to delete ${selectedResourceType.value.toLowerCase()}. ${error.response?.data?.message || error.message || 'Server error'}`,
      'error'
    );
  } finally {
    deleting.value = false;
  }
};

onMounted(() => {
  fetchData();
});

</script>

<!-- No <style scoped> block, all styling via Tailwind utility classes --> 