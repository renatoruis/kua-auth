<template>
  <div>
    <h1 class="text-2xl font-bold mb-6 text-east-bay-800">Dashboard</h1>
    
    <LoadingSpinner v-if="loading" message="Loading dashboard data..." />
    
    <div v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <!-- User Stats Card -->
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <h2 class="text-lg font-semibold mb-2 text-east-bay-700">Users</h2>
          <div class="flex items-center">
            <span class="text-3xl font-bold text-east-bay-600">{{ userCount }}</span>
            <span class="ml-2 text-east-bay-500">Service Accounts</span>
          </div>
          <div class="mt-4">
            <router-link to="/users" class="text-east-bay-600 hover:text-east-bay-800 text-sm font-medium">
              View all users →
            </router-link>
          </div>
        </div>
        
        <!-- Namespace Stats Card -->
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <h2 class="text-lg font-semibold mb-2 text-east-bay-700">Namespaces</h2>
          <div class="flex items-center">
            <span class="text-3xl font-bold text-east-bay-600">{{ namespaceCount }}</span>
            <span class="ml-2 text-east-bay-500">Available</span>
          </div>
          <div class="mt-4">
            <router-link to="/cluster" class="text-east-bay-600 hover:text-east-bay-800 text-sm font-medium">
              View cluster info →
            </router-link>
          </div>
        </div>
      </div>
      
      <!-- Quick Actions -->
      <div class="bg-white p-6 rounded-lg shadow-lg mb-8">
        <h2 class="text-lg font-semibold mb-4 text-east-bay-700">Quick Actions</h2>
        <div class="flex flex-wrap gap-3">
          <router-link to="/users/create" 
                       class="px-4 py-2 bg-east-bay-600 text-white text-sm font-medium rounded-lg hover:bg-east-bay-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-east-bay-500">
            Create User
          </router-link>
          <router-link to="/users" 
                       class="px-4 py-2 bg-east-bay-200 text-east-bay-700 text-sm font-medium rounded-lg hover:bg-east-bay-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-east-bay-400">
            Manage Users
          </router-link>
          <router-link to="/roles" 
                       class="px-4 py-2 bg-east-bay-200 text-east-bay-700 text-sm font-medium rounded-lg hover:bg-east-bay-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-east-bay-400">
            Manage Roles & RBAC
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiService from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

// State
const loading = ref(true);
const userCount = ref(0);
const namespaceCount = ref(0);

// Fetch dashboard data
const fetchDashboardData = async () => {
  loading.value = true;
  try {
    // Fetch users
    const users = await apiService.getUsers();
    userCount.value = users.length;
    
    // Fetch cluster info
    const clusterInfo = await apiService.getClusterInfo();
    namespaceCount.value = clusterInfo.namespaces ? clusterInfo.namespaces.length : 0;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    userCount.value = 0;
    namespaceCount.value = 0;
  } finally {
    loading.value = false;
  }
};

// Load data on component mount
onMounted(() => {
  fetchDashboardData();
});
</script> 