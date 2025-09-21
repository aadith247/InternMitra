import { api } from './api'

let cache = null
let inflight = null

export async function getPublicConfig(force = false) {
  if (cache && !force) return cache
  if (inflight && !force) return inflight
  inflight = api.get('/config/public')
    .then(res => {
      cache = res.data?.data || {}
      inflight = null
      return cache
    })
    .catch(err => {
      inflight = null
      throw err
    })
  return inflight
}
