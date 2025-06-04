<template>
  <div class="service-account-permissions">
    <div class="permissions-header">
      <h3>Permissões do ServiceAccount</h3>
      <button 
        class="btn btn-primary"
        @click="showAddRoleModal = true"
      >
        <i class="fas fa-plus"></i>
        Adicionar Permissão
      </button>
    </div>

    <!-- Current Permissions -->
    <div class="permissions-list" v-if="permissions.length > 0">
      <div 
        v-for="permission in permissions" 
        :key="permission.roleName"
        class="permission-card"
      >
        <div class="permission-header">
          <div class="permission-info">
            <h4>{{ permission.roleName }}</h4>
            <span class="role-kind-badge" :class="permission.roleKind.toLowerCase()">
              {{ permission.roleKind }}
            </span>
          </div>
          <button 
            class="btn btn-danger btn-sm"
            @click="removeRole(permission.roleName)"
            :disabled="loading"
          >
            <i class="fas fa-trash"></i>
            Remover
          </button>
        </div>
        
        <div class="namespaces-list">
          <strong>Namespaces:</strong>
          <div class="namespace-tags">
            <span 
              v-for="namespace in permission.namespaces" 
              :key="namespace"
              class="namespace-tag"
              :class="{ 'cluster-wide': namespace === '*' }"
            >
              {{ namespace === '*' ? 'Cluster-wide' : namespace }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="no-permissions">
      <i class="fas fa-shield-alt"></i>
      <p>Nenhuma permissão configurada</p>
    </div>

    <!-- Add Role Modal -->
    <div v-if="showAddRoleModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Adicionar Permissão</h3>
          <button class="close-btn" @click="closeModal">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <form @submit.prevent="addRole" class="modal-body">
          <!-- Role Selection -->
          <div class="form-group">
            <label>Role:</label>
            <select v-model="newPermission.roleName" required>
              <option value="">Selecione uma role...</option>
              <optgroup label="ClusterRoles">
                <option 
                  v-for="role in availableClusterRoles" 
                  :key="role.metadata?.name || role.name"
                  :value="role.metadata?.name || role.name"
                >
                  {{ role.metadata?.name || role.name }}
                </option>
              </optgroup>
              <optgroup label="Roles" v-if="availableRoles.length > 0">
                <option 
                  v-for="role in availableRoles" 
                  :key="role.metadata?.name || role.name"
                  :value="role.metadata?.name || role.name"
                >
                  {{ role.metadata?.name || role.name }} ({{ role.metadata?.namespace || role.namespace }})
                </option>
              </optgroup>
            </select>
          </div>

          <!-- Role Kind (auto-detected) -->
          <div class="form-group">
            <label>Tipo:</label>
            <input 
              :value="selectedRoleKind" 
              readonly 
              class="readonly-input"
            />
          </div>

          <!-- Namespace Selection -->
          <div class="form-group">
            <label>Escopo das Permissões:</label>
            <div class="scope-selection">
              <label class="radio-label">
                <input 
                  type="radio" 
                  value="namespaces"
                  v-model="newPermission.scope"
                  @change="onScopeChange"
                />
                <span>Namespaces específicos (RoleBindings)</span>
              </label>
              <label class="radio-label">
                <input 
                  type="radio" 
                  value="cluster"
                  v-model="newPermission.scope"
                  @change="onScopeChange"
                />
                <span>Cluster-wide (ClusterRoleBinding) - permite --all-namespaces</span>
              </label>
            </div>
          </div>

          <!-- Namespace Selection (only show if scope is namespaces) -->
          <div v-if="newPermission.scope === 'namespaces'" class="form-group">
            <label>Namespaces com Permissão:</label>
            <div class="namespace-selection">
              <div class="select-all-controls">
                <button 
                  type="button" 
                  class="btn btn-sm btn-outline"
                  @click="selectAllNamespaces"
                >
                  Selecionar Todos
                </button>
                <button 
                  type="button" 
                  class="btn btn-sm btn-outline"
                  @click="clearNamespaceSelection"
                >
                  Limpar Seleção
                </button>
              </div>
              
              <div class="namespace-checkboxes">
                <label 
                  v-for="namespace in availableNamespaces" 
                  :key="namespace"
                  class="checkbox-label"
                >
                  <input 
                    type="checkbox" 
                    :value="namespace"
                    v-model="newPermission.targetNamespaces"
                  />
                  <span>{{ namespace }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Selected Namespaces Preview -->
          <div v-if="newPermission.scope === 'cluster'" class="selected-preview cluster-preview">
            <strong>Escopo: Cluster-wide</strong>
            <p class="cluster-info">
              <i class="fas fa-globe"></i>
              Esta permissão permitirá acesso a todos os namespaces do cluster, incluindo comandos como <code>kubectl get pods --all-namespaces</code>
            </p>
          </div>
          
          <div v-else-if="newPermission.targetNamespaces.length > 0" class="selected-preview">
            <strong>Namespaces selecionados ({{ newPermission.targetNamespaces.length }}):</strong>
            <div class="selected-tags">
              <span 
                v-for="namespace in newPermission.targetNamespaces" 
                :key="namespace"
                class="selected-tag"
              >
                {{ namespace }}
              </span>
            </div>
            <p class="namespace-info">
              <i class="fas fa-info-circle"></i>
              Estas permissões funcionarão apenas nos namespaces selecionados. Para usar <code>--all-namespaces</code>, escolha "Cluster-wide".
            </p>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="closeModal">
              Cancelar
            </button>
            <button 
              type="submit" 
              class="btn btn-primary"
              :disabled="!canAddRole || loading"
            >
              <i v-if="loading" class="fas fa-spinner fa-spin"></i>
              {{ loading ? 'Adicionando...' : 'Adicionar Permissão' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { 
  addRoleToServiceAccountMultiNamespace,
  getServiceAccountPermissions,
  removeRoleFromServiceAccount
} from '../services/api';
import apiService from '../services/api';

export default {
  name: 'ServiceAccountPermissions',
  props: {
    serviceAccountName: {
      type: String,
      required: true
    },
    serviceAccountNamespace: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      permissions: [],
      availableClusterRoles: [],
      availableRoles: [],
      availableNamespaces: [],
      showAddRoleModal: false,
      loading: false,
      newPermission: {
        roleName: '',
        targetNamespaces: [],
        scope: 'namespaces'
      }
    };
  },
  computed: {
    selectedRoleKind() {
      if (!this.newPermission.roleName) return '';
      
      const isClusterRole = this.availableClusterRoles.some(
        role => (role.metadata?.name || role.name) === this.newPermission.roleName
      );
      
      return isClusterRole ? 'ClusterRole' : 'Role';
    },
    canAddRole() {
      if (this.newPermission.scope === 'cluster') {
        return this.newPermission.roleName;
      }
      return this.newPermission.roleName && 
             this.newPermission.targetNamespaces.length > 0;
    }
  },
  async mounted() {
    await this.loadData();
  },
  methods: {
    async loadData() {
      this.loading = true;
      try {
        await Promise.all([
          this.loadPermissions(),
          this.loadAvailableRoles(),
          this.loadNamespaces()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
        this.$emit('error', 'Erro ao carregar dados');
      } finally {
        this.loading = false;
      }
    },

    async loadPermissions() {
      try {
        const response = await getServiceAccountPermissions(
          this.serviceAccountNamespace,
          this.serviceAccountName
        );
        this.permissions = response.data.permissions || [];
      } catch (error) {
        console.error('Error loading permissions:', error);
        this.permissions = [];
      }
    },

    async loadAvailableRoles() {
      try {
        const response = await apiService.getAllRolesAndClusterRoles();
        
        console.log('Roles response:', response);
        
        // Ajustar para a estrutura correta dos dados
        this.availableClusterRoles = response.clusterRoles || [];
        this.availableRoles = response.roles || [];
        
        console.log('Available ClusterRoles:', this.availableClusterRoles);
        console.log('Available Roles:', this.availableRoles);
      } catch (error) {
        console.error('Error loading roles:', error);
        this.availableClusterRoles = [];
        this.availableRoles = [];
      }
    },

    async loadNamespaces() {
      try {
        const response = await apiService.getNamespaces();
        console.log('Namespaces response:', response);
        
        // O backend agora retorna apenas os nomes dos namespaces
        this.availableNamespaces = response.items || [];
        
        console.log('Available namespaces:', this.availableNamespaces);
      } catch (error) {
        console.error('Error loading namespaces:', error);
        this.availableNamespaces = [];
      }
    },

    async addRole() {
      if (!this.canAddRole) return;

      this.loading = true;
      try {
        if (this.newPermission.scope === 'cluster') {
          // Criar ClusterRoleBinding
          await apiService.createClusterRoleBinding({
            name: `${this.serviceAccountName}-${this.newPermission.roleName}`,
            clusterRoleName: this.newPermission.roleName,
            serviceAccountName: this.serviceAccountName,
            serviceAccountNamespace: this.serviceAccountNamespace
          });
          
          this.$emit('success', 'ClusterRoleBinding criado com sucesso - permite acesso cluster-wide');
        } else {
          // Criar múltiplos RoleBindings
          await addRoleToServiceAccountMultiNamespace({
            serviceAccountName: this.serviceAccountName,
            serviceAccountNamespace: this.serviceAccountNamespace,
            roleName: this.newPermission.roleName,
            targetNamespaces: this.newPermission.targetNamespaces,
            roleKind: this.selectedRoleKind
          });

          this.$emit('success', 'Permissões adicionadas com sucesso');
        }

        await this.loadPermissions();
        this.closeModal();
      } catch (error) {
        console.error('Error adding role:', error);
        this.$emit('error', error.response?.data?.error || 'Erro ao adicionar permissão');
      } finally {
        this.loading = false;
      }
    },

    async removeRole(roleName) {
      if (!confirm(`Tem certeza que deseja remover a role "${roleName}"?`)) {
        return;
      }

      this.loading = true;
      try {
        await removeRoleFromServiceAccount(
          this.serviceAccountNamespace,
          this.serviceAccountName,
          roleName
        );

        this.$emit('success', 'Permissão removida com sucesso');
        await this.loadPermissions();
      } catch (error) {
        console.error('Error removing role:', error);
        this.$emit('error', error.response?.data?.error || 'Erro ao remover permissão');
      } finally {
        this.loading = false;
      }
    },

    selectAllNamespaces() {
      // Garantir que estamos copiando apenas os nomes dos namespaces
      this.newPermission.targetNamespaces = [...this.availableNamespaces];
    },

    clearNamespaceSelection() {
      this.newPermission.targetNamespaces = [];
    },

    closeModal() {
      this.showAddRoleModal = false;
      this.newPermission = {
        roleName: '',
        targetNamespaces: [],
        scope: 'namespaces'
      };
    },

    onScopeChange() {
      if (this.newPermission.scope === 'namespaces') {
        this.newPermission.targetNamespaces = [];
      }
    }
  }
};
</script>

<style scoped>
.service-account-permissions {
  padding: 20px;
}

.permissions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.permissions-header h3 {
  margin: 0;
  color: #333;
}

.permission-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.permission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.permission-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.permission-info h4 {
  margin: 0;
  color: #333;
}

.role-kind-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.role-kind-badge.clusterrole {
  background: #e3f2fd;
  color: #1976d2;
}

.role-kind-badge.role {
  background: #f3e5f5;
  color: #7b1fa2;
}

.namespaces-list {
  color: #666;
}

.namespace-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.namespace-tag {
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid #ddd;
}

.namespace-tag.cluster-wide {
  background: #fff3e0;
  color: #f57c00;
  border-color: #ffb74d;
  font-weight: bold;
}

.no-permissions {
  text-align: center;
  padding: 40px;
  color: #666;
}

.no-permissions i {
  font-size: 48px;
  margin-bottom: 16px;
  color: #ccc;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #333;
}

.form-group select,
.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.readonly-input {
  background: #f5f5f5;
  color: #666;
}

.namespace-selection {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 12px;
}

.select-all-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.namespace-checkboxes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  cursor: pointer;
}

.checkbox-label:hover {
  background: #f5f5f5;
}

.selected-preview {
  margin-top: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.selected-tag {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-outline {
  background: white;
  border: 1px solid #ddd;
  color: #333;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.scope-selection {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f9f9f9;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.radio-label:hover {
  background: #f0f0f0;
}

.cluster-preview {
  background: #e8f5e8;
  border: 1px solid #4caf50;
  padding: 16px;
  border-radius: 4px;
  text-align: center;
}

.cluster-info {
  margin: 8px 0 0 0;
  font-size: 13px;
  color: #2e7d32;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.cluster-info code {
  background: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
}

.namespace-info {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 6px;
}

.namespace-info code {
  background: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
}
</style> 