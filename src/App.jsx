import { useState, useEffect } from 'react'
import RegalCineLanding from './RegalCineLanding'
import AdminDashboard from './AdminDashboard'

export default function App() {
  const [page, setPage] = useState(() =>
    window.location.hash === '#admin' ? 'admin' : 'home'
  )

  useEffect(() => {
    const handler = () => setPage(window.location.hash === '#admin' ? 'admin' : 'home')
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const navigate = (to) => {
    window.location.hash = to === 'admin' ? 'admin' : ''
    setPage(to)
  }

  return page === 'admin'
    ? <AdminDashboard navigate={navigate} />
    : <RegalCineLanding navigate={navigate} />
}
