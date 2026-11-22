// Sin sesión en este celular → pantalla de entrada (nombre + PIN del grupo).
export default defineNuxtRouteMiddleware(to => {
  if (typeof to.query.fecha === 'string') setSimulatedDate(to.query.fecha === 'hoy' ? null : to.query.fecha)
  const { isLoggedIn, tripId } = useSession()
  if (to.path === '/entrar') return
  if (!isLoggedIn.value) {
    return navigateTo('/entrar')
  }
  loadTripData(tripId.value)
  startSync(tripId.value)
})
