<template>
  <div
    v-if="showDismissible"
    :class="[
      'p-4 border-l-4 flex justify-between items-start shadow-md rounded-lg',
      alertClasses.border,
      alertClasses.background,
      alertClasses.text
    ]"
    role="alert"
  >
    <div class="flex items-center">
      <svg v-if="type === 'success'" class="h-5 w-5 mr-3 flex-shrink-0" :class="alertClasses.icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
      </svg>
      <svg v-if="type === 'error'" class="h-5 w-5 mr-3 flex-shrink-0" :class="alertClasses.icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 101.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
      </svg>
      <svg v-if="type === 'warning'" class="h-5 w-5 mr-3 flex-shrink-0" :class="alertClasses.icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M8.257 3.099c.636-1.179 2.362-1.179 3.000 0l6.246 11.547c.631 1.17-.244 2.604-1.5 2.604H3.51c-1.256 0-2.131-1.434-1.5-2.604L8.257 3.099zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
      </svg>
      <svg v-if="type === 'info'" class="h-5 w-5 mr-3 flex-shrink-0" :class="alertClasses.icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
         <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
      </svg>

      <p class="font-medium">{{ message }}</p>
    </div>
    <button 
      v-if="dismissible"
      @click="dismiss"
      :class="['ml-4 -mx-1.5 -my-1.5 p-1.5 rounded-lg focus:outline-none focus:ring-2 ', alertClasses.dismissButtonHover, alertClasses.dismissButtonFocusRing, alertClasses.icon ]"
      aria-label="Dismiss"
    >
      <span class="sr-only">Dismiss</span>
      <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'info', // 'info', 'success', 'warning', 'error'
    validator: (value) => ['info', 'success', 'warning', 'error'].includes(value)
  },
  dismissible: {
    type: Boolean,
    default: false
  },
  duration: {
    type: Number,
    default: 0 // 0 for no auto-dismiss
  },
  show: { // Prop to control visibility externally
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['dismiss']);

const showDismissible = ref(props.show);

watch(() => props.show, (newValue) => {
  showDismissible.value = newValue;
});

const dismiss = () => {
  showDismissible.value = false;
  emit('dismiss');
};

if (props.duration > 0 && props.dismissible) {
  setTimeout(() => {
    if (showDismissible.value) { // Check if still visible before dismissing
        dismiss();
    }
  }, props.duration);
}

const alertClasses = computed(() => {
  switch (props.type) {
    case 'success':
      return {
        border: 'border-green-500',
        background: 'bg-green-50',
        text: 'text-green-700',
        icon: 'text-green-500',
        dismissButtonHover: 'hover:bg-green-100',
        dismissButtonFocusRing: 'focus:ring-green-400'
      };
    case 'warning':
      return {
        border: 'border-yellow-500',
        background: 'bg-yellow-50',
        text: 'text-yellow-700',
        icon: 'text-yellow-500',
        dismissButtonHover: 'hover:bg-yellow-100',
        dismissButtonFocusRing: 'focus:ring-yellow-400'
      };
    case 'error':
      return {
        border: 'border-red-500',
        background: 'bg-red-50',
        text: 'text-red-700',
        icon: 'text-red-500',
        dismissButtonHover: 'hover:bg-red-100',
        dismissButtonFocusRing: 'focus:ring-red-400'
      };
    case 'info':
    default:
      return {
        border: 'border-east-bay-500',
        background: 'bg-east-bay-50', // Lighter background from the new palette
        text: 'text-east-bay-700',     // Darker text from the new palette
        icon: 'text-east-bay-500',
        dismissButtonHover: 'hover:bg-east-bay-100',
        dismissButtonFocusRing: 'focus:ring-east-bay-400'
      };
  }
});

</script> 