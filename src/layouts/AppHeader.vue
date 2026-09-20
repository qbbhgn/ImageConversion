<script setup lang="ts">
import { ArrowLeft, ExternalLink, PanelsTopLeft } from '@lucide/vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <header class="toolbox-header">
    <nav class="toolbox-header__inner" aria-label="主导航">
      <RouterLink class="toolbox-brand" to="/">
        <PanelsTopLeft :size="24" aria-hidden="true" />
        <span>工具箱</span>
      </RouterLink>
      <RouterLink v-if="route.name !== 'home'" class="toolbox-back" to="/">
        <ArrowLeft :size="16" aria-hidden="true" />
        <span>全部工具</span>
      </RouterLink>
      <a
        class="toolbox-source"
        href="https://github.com/qbbhgn/ImageConversion"
        target="_blank"
        rel="noopener noreferrer"
        title="开源地址"
      >
        <span>开源地址</span>
        <ExternalLink :size="16" aria-hidden="true" />
      </a>
    </nav>
  </header>
</template>
