<template>
  <div class="min-h-screen flex items-center justify-center bg-east-bay-100 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-xl">
      <div>
        <img class="mx-auto h-12 w-auto" src="@/assets/kubernetes-icon.svg" alt="Kube User Admin" />
        <h2 class="mt-6 text-center text-3xl font-extrabold text-east-bay-900">
          Admin Login
        </h2>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <input type="hidden" name="remember" value="true" />
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="password" class="sr-only">Password</label>
            <input id="password" name="password" type="password" v-model="password" required
                   class="appearance-none rounded-md relative block w-full px-3 py-3 border border-east-bay-300 placeholder-east-bay-400 text-east-bay-900 focus:outline-none focus:ring-east-bay-500 focus:border-east-bay-500 focus:z-10 sm:text-sm"
                   placeholder="Password" />
          </div>
        </div>

        <div>
          <button type="submit" :disabled="loading"
                  class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-east-bay-600 hover:bg-east-bay-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-east-bay-500 disabled:bg-east-bay-400 disabled:cursor-not-allowed">
            <span class="absolute left-0 inset-y-0 flex items-center pl-3" v-if="loading">
              <svg class="h-5 w-5 text-east-bay-500 group-hover:text-east-bay-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            {{ loading ? 'Logging in...' : 'Login' }}
          </button>
        </div>
        <p v-if="error" class="mt-2 text-center text-sm text-red-600">
          {{ error }}
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import apiService from '../services/api';

const password = ref('');
const loading = ref(false);
const error = ref('');
const router = useRouter();

const handleLogin = async () => {
  loading.value = true;
  error.value = '';
  try {
    const response = await apiService.login(password.value);
    if (response && response.success) {
      const redirectPath = router.currentRoute.value.query.redirect || '/';
      router.push(redirectPath);
    } else {
      error.value = response.message || 'Login failed. Please check your password.';
    }
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'An unexpected error occurred.';
  } finally {
    loading.value = false;
  }
};
</script>

<!-- <style scoped> block removed, Tailwind classes used directly in template --> 