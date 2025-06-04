<template>
  <div class="min-h-screen bg-east-bay-50">
    <header v-if="isAuthenticated" class="bg-east-bay-700 text-east-bay-50 shadow-md">
      <div class="container mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <img src="@/assets/kubernetes-icon.svg" alt="Kubernetes logo" class="h-8 w-8" />
          <h1 class="text-xl font-bold">Kube User Admin</h1>
        </div>
        <nav>
          <ul class="flex space-x-6 items-center">
            <li>
              <router-link to="/" class="hover:text-east-bay-200">Dashboard</router-link>
            </li>
            <li>
              <router-link to="/users" class="hover:text-east-bay-200">Users</router-link>
            </li>
            <li>
              <router-link to="/roles" class="hover:text-east-bay-200">Roles & RBAC</router-link>
            </li>
            <li>
              <router-link to="/cluster" class="hover:text-east-bay-200">Cluster Info</router-link>
            </li>
            <li>
              <button @click="handleLogout" class="hover:text-east-bay-200 bg-transparent border-none p-0 cursor-pointer text-east-bay-50">
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </header>

    <main class="container mx-auto px-4 py-8">
      <router-view />
    </main>

    <footer v-if="isAuthenticated" class="bg-east-bay-100 py-4 border-t border-east-bay-200">
      <div class="container mx-auto px-4 text-center text-east-bay-700 text-sm">
        &copy; {{ new Date().getFullYear() }} Kube User Admin.
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import apiService from './services/api';

const router = useRouter();
const isAuthenticated = computed(() => apiService.isAuthenticated());

const handleLogout = () => {
  apiService.logout();
  router.push('/login');
};
</script> 