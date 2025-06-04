import { createRouter, createWebHistory } from 'vue-router';
import apiService from '../services/api'; // Import apiService for authentication checks

// Import views
import Dashboard from '../views/Dashboard.vue';
import UserList from '../views/UserList.vue';
import UserCreate from '../views/UserCreate.vue';
import UserDetail from '../views/UserDetail.vue';
import RoleList from '../views/RoleList.vue';
import RoleCreate from '../views/RoleCreate.vue';
// import AuditLogs from '../views/AuditLogs.vue'; // Audit Logs functionality removed
import ClusterInfo from '../views/ClusterInfo.vue';
import LoginView from '../views/LoginView.vue'; // Import LoginView

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true },
  },
  {
    path: '/users',
    name: 'UserList',
    component: UserList,
    meta: { requiresAuth: true },
  },
  {
    path: '/users/create',
    name: 'UserCreate',
    component: UserCreate,
    meta: { requiresAuth: true },
  },
  {
    path: '/users/:namespace/:name',
    name: 'UserDetail',
    component: UserDetail,
    props: true,
    meta: { requiresAuth: true },
  },
  {
    path: '/roles',
    name: 'RoleList',
    component: RoleList,
    meta: { requiresAuth: true },
  },
  {
    path: '/roles/create',
    name: 'RoleCreate',
    component: RoleCreate,
    meta: { requiresAuth: true },
  },
  // {
  //   path: '/audit',
  //   name: 'AuditLogs',
  //   component: AuditLogs,
  //   meta: { requiresAuth: true }, // Was protected, now removed
  // },
  {
    path: '/cluster',
    name: 'ClusterInfo',
    component: ClusterInfo,
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { guestOnly: true }, // Users already logged in should be redirected from here
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const isAuthenticated = apiService.isAuthenticated();

  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!isAuthenticated) {
      next({
        path: '/login',
        query: { redirect: to.fullPath } // Save the intended destination
      });
    } else {
      next(); // Proceed to route
    }
  } else if (to.matched.some(record => record.meta.guestOnly)) {
    if (isAuthenticated) {
      next({ path: '/' }); // Redirect to dashboard if logged in and trying to access login
    } else {
      next(); // Proceed to login page
    }
  } else {
    next(); // Always call next()
  }
});

export default router; 