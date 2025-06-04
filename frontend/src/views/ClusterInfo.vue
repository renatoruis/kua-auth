<template>
  <div>
    <h1 class="text-2xl font-bold mb-6 text-east-bay-800">Cluster Information</h1>
    
    <LoadingSpinner v-if="loading" message="Loading cluster information..." />
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Cluster Version Card -->
      <div class="bg-white p-6 rounded-lg shadow-lg">
        <h2 class="text-lg font-semibold mb-4 text-east-bay-700">Kubernetes Version</h2>
        <div v-if="clusterInfo && clusterInfo.clusterInfo" class="space-y-3">
          <div>
            <p class="text-sm text-east-bay-500">Major Version</p>
            <p class="text-lg font-medium text-east-bay-800">{{ clusterInfo.clusterInfo.version.major }}</p>
          </div>
          <div>
            <p class="text-sm text-east-bay-500">Minor Version</p>
            <p class="text-lg font-medium text-east-bay-800">{{ clusterInfo.clusterInfo.version.minor }}</p>
          </div>
          <div>
            <p class="text-sm text-east-bay-500">Git Version</p>
            <p class="text-lg font-medium text-east-bay-800">{{ clusterInfo.clusterInfo.version.gitVersion }}</p>
          </div>
          <div>
            <p class="text-sm text-east-bay-500">Build Date</p>
            <p class="text-lg font-medium text-east-bay-800">{{ clusterInfo.clusterInfo.version.buildDate }}</p>
          </div>
          <div>
            <p class="text-sm text-east-bay-500">Platform</p>
            <p class="text-lg font-medium text-east-bay-800">{{ clusterInfo.clusterInfo.version.platform }}</p>
          </div>
        </div>
        <div v-else class="text-east-bay-500 italic">
          Unable to retrieve cluster version information.
        </div>
      </div>
      
      <!-- Namespaces Card -->
      <div class="bg-white p-6 rounded-lg shadow-lg">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold text-east-bay-700">Namespaces</h2>
          <span class="bg-east-bay-600 text-white px-3 py-1 rounded-full text-sm font-medium">{{ namespaceCount }}</span>
        </div>
        
        <div v-if="clusterInfo && clusterInfo.namespaces && clusterInfo.namespaces.length > 0">
          <div class="relative mb-4">
            <input
              type="text"
              v-model="namespaceSearch"
              placeholder="Search namespaces..."
              class="w-full px-3 py-2 pl-10 border border-east-bay-300 rounded-md shadow-sm focus:outline-none focus:ring-east-bay-500 focus:border-east-bay-500 sm:text-sm text-east-bay-900 placeholder-east-bay-400"
            />
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-east-bay-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
          
          <div class="overflow-y-auto max-h-80 border border-east-bay-200 rounded-md">
            <ul class="divide-y divide-east-bay-200">
              <li v-for="namespace in filteredNamespaces" :key="namespace" class="py-3 px-4 hover:bg-east-bay-50">
                <div class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-east-bay-500 mr-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span class="text-sm text-east-bay-700 truncate">{{ namespace }}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <div v-else class="text-east-bay-500 italic">
          No namespaces found or unable to retrieve them.
        </div>
      </div>
    </div>
    
    <div class="bg-white p-6 rounded-lg shadow-lg mt-6" v-if="usersByNamespace.length > 0">
      <h2 class="text-lg font-semibold mb-4 text-east-bay-700">User Access by Namespace</h2>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-east-bay-200">
          <thead class="bg-east-bay-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">Namespace</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">User Count</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">Distribution</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-east-bay-200">
            <tr v-for="(item, index) in usersByNamespace" :key="index" class="hover:bg-east-bay-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-east-bay-900">
                {{ item.namespace }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-east-bay-600">
                {{ item.count }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="w-full bg-east-bay-200 rounded-full h-2.5">
                  <div 
                    class="bg-east-bay-600 h-2.5 rounded-full"
                    :style="{ width: `${(item.count / maxUserCount) * 100}%` }"
                  ></div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="bg-white p-6 rounded-lg shadow-lg mt-6" v-if="nodes && nodes.length > 0">
      <h2 class="text-lg font-semibold mb-4 text-east-bay-700">Nodes</h2>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-east-bay-200">
          <thead class="bg-east-bay-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-east-bay-500 uppercase tracking-wider">Roles</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-east-bay-200">
            <tr v-for="node in nodes" :key="node.metadata.name" class="hover:bg-east-bay-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-east-bay-900">
                {{ node.metadata.name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-east-bay-600">
                {{ getNodeStatus(node) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-east-bay-600">
                {{ getNodeRoles(node) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import apiService from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

// State
const loading = ref(true);
const clusterInfo = ref(null);
const users = ref([]);
const namespaceSearch = ref('');
const nodes = ref([]);

// Computed properties
const namespaceCount = computed(() => {
  if (!clusterInfo.value || !clusterInfo.value.namespaces) {
    return 0;
  }
  return clusterInfo.value.namespaces.length;
});

const filteredNamespaces = computed(() => {
  if (!clusterInfo.value || !clusterInfo.value.namespaces) {
    return [];
  }
  
  if (!namespaceSearch.value) {
    return clusterInfo.value.namespaces;
  }
  
  const search = namespaceSearch.value.toLowerCase();
  return clusterInfo.value.namespaces.filter(ns => 
    ns.toLowerCase().includes(search)
  );
});

const usersByNamespace = computed(() => {
  if (!users.value || users.value.length === 0) {
    return [];
  }
  
  const namespaceCounts = {};
  users.value.forEach(user => {
    if (user && user.metadata && user.metadata.namespace) {
      const namespace = user.metadata.namespace;
      namespaceCounts[namespace] = (namespaceCounts[namespace] || 0) + 1;
    }
  });
  
  const result = Object.entries(namespaceCounts).map(([namespace, count]) => ({
    namespace,
    count
  }));
  
  return result.sort((a, b) => b.count - a.count);
});

const maxUserCount = computed(() => {
  if (usersByNamespace.value.length === 0) {
    return 0;
  }
  return Math.max(...usersByNamespace.value.map(item => item.count));
});

// Helper functions for node details
const getNodeStatus = (node) => {
  if (node && node.status && node.status.conditions) {
    const readyCondition = node.status.conditions.find(c => c.type === 'Ready');
    return readyCondition ? (readyCondition.status === 'True' ? 'Ready' : 'NotReady') : 'Unknown';
  }
  return 'Unknown';
};

const getNodeRoles = (node) => {
  if (node && node.metadata && node.metadata.labels) {
    const roles = [];
    for (const label in node.metadata.labels) {
      if (label.startsWith('node-role.kubernetes.io/')) {
        roles.push(label.substring('node-role.kubernetes.io/'.length));
      }
    }
    if (node.metadata.labels['kubernetes.io/role']) { // Older role label
        if (!roles.includes(node.metadata.labels['kubernetes.io/role'])) {
            roles.push(node.metadata.labels['kubernetes.io/role']);
        }
    }
    return roles.length > 0 ? roles.join(', ') : '-';
  }
  return '-';
};

// Fetch cluster info
const fetchData = async () => {
  loading.value = true;
  try {
    clusterInfo.value = await apiService.getClusterInfo();
    users.value = await apiService.getUsers();
    const nodesData = await apiService.getNodes();
    nodes.value = nodesData && nodesData.items ? nodesData.items : [];

  } catch (error) {
    console.error('Error fetching cluster information:', error);
    clusterInfo.value = { namespaces: [], clusterInfo: { version: {} } }; // Provide default structure on error
    users.value = [];
    nodes.value = [];
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});
</script> 