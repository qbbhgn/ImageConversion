<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import type { ToolDefinition } from '../../tools/registry'

defineProps<{ tool: ToolDefinition }>()
</script>

<template>
  <RouterLink
    class="tool-card"
    :to="tool.path"
    :aria-label="`打开${tool.name}`"
  >
    <span class="tool-card__icon">
      <component :is="tool.icon" :size="30" aria-hidden="true" />
    </span>
    <span class="tool-card__label">
      <span class="tool-card__category">{{ tool.category }}</span>
      <strong>{{ tool.name }}</strong>
    </span>
    <ArrowUpRight class="tool-card__arrow" :size="20" aria-hidden="true" />
  </RouterLink>
</template>
