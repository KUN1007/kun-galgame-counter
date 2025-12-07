export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/' || to.path.startsWith('/__nuxt_error')) {
    return
  }

  return navigateTo('/', {
    replace: true,
    redirectCode: process.server ? 302 : undefined,
  })
})
