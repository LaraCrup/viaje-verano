/**
 * Elige la animación al cambiar de pantalla:
 * - más adentro (de una lista a un detalle) → page-forward
 * - más afuera (volver) → page-back
 * - mismo nivel (pestañas) → page-fade; entre días del itinerario, según si es el siguiente o el anterior.
 */
// Pestañas de Gastos: entre ellas es un cambio de pestaña, no "entrar" a algo
const GASTOS_TABS = new Set(['/gastos', '/gastos/balances', '/gastos/numeros'])

export default defineNuxtRouteMiddleware((to, from) => {
  if (to.path === from.path) return
  // La home ("/") cuenta como una pestaña más, al mismo nivel que /gastos o /planes
  const depth = (p: string) => Math.max(1, p.split('/').filter(Boolean).length)
  const a = depth(from.path)
  const b = depth(to.path)
  let name = 'page-fade'
  if (GASTOS_TABS.has(to.path) && GASTOS_TABS.has(from.path)) name = 'page-fade'
  else if (b > a) name = 'page-forward'
  else if (b < a) name = 'page-back'
  else if (to.path.startsWith('/itinerario/') && from.path.startsWith('/itinerario/')) name = to.path > from.path ? 'page-forward' : 'page-back'
  to.meta.pageTransition = { name, mode: 'out-in' }
})
