import { createRouter, createWebHashHistory } from 'vue-router'
import { tools } from '../tools/registry'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../pages/ToolboxHome.vue'),
      meta: { title: '工具箱' },
    },
    ...tools.map((tool) => ({
      path: tool.path,
      name: tool.id,
      component: tool.component,
      meta: { title: tool.name },
    })),
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  document.title = to.name === 'home' ? '工具箱' : `${to.meta.title} - 工具箱`
})
