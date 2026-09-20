<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from './layouts/AppHeader.vue'
import ToastHost from './shared/components/ToastHost.vue'
</script>

<template>
  <AppHeader />
  <RouterView v-slot="{ Component }">
    <KeepAlive>
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
  <ToastHost />
</template>
