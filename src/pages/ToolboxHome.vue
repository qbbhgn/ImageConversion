<script setup lang="ts">
import ToolCard from '../shared/components/ToolCard.vue'
import { tools } from '../tools/registry'
</script>

<template>
  <main class="toolbox-home">
    <header class="toolbox-home__heading">
      <h1>全部工具</h1>
      <span class="toolbox-count">{{ tools.length }} 个工具</span>
    </header>
    <section class="toolbox-grid" aria-label="工具列表">
      <ToolCard v-for="tool in tools" :key="tool.id" :tool="tool" />
    </section>
  </main>
</template>
