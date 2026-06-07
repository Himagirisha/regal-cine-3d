import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
const LOGO_URL = `${import.meta.env.BASE_URL}regal.jpg`

const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif"
const GOLD  = '#c58b73'
const LIGHT = '#f5ede6'
const MUTED = '#a89c96'
const BG    = '#08070e'

const tdStyle = {
  fontFamily: SERIF, fontSize: 'clamp(13px,1.4vw,15px)', color: LIGHT,
  letterSpacing: '0.04em', padding: '16px clamp(10px,1.8vw,20px)',
  verticalAlign: 'middle',
}
const thStyle = {
  fontFamily: SERIF, fontSize: 10, letterSpacing: '0.34em', color: GOLD,
  textTransform: 'uppercase', padding: '14px clamp(10px,1.8vw,20px)',
  textAlign: 'left', fontWeight: 400, whiteSpace: 'nowrap',
}

function StatCard({ label, value, sub }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'tween', duration: 0.5 }}
      style={{
        padding: 'clamp(20px,3vw,32px)',
        border: '1px solid rgba(197,139,115,0.2)',
        background: 'rgba(197,139,115,0.04)',
        transition: 'border-color 0.3s, background 0.3s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(197,139,115,0.45)'; e.currentTarget.style.background = 'rgba(197,139,115,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(197,139,115,0.2)'; e.currentTarget.style.background = 'rgba(197,139,115,0.04)' }}
    >
      <p style={{ fontFamily: SERIF, fontSize: 'clamp(36px,5vw,52px)', fontWeight: 300, color: GOLD, margin: '0 0 4px', letterSpacing: '-0.01em', lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: '0.32em', color: LIGHT, textTransform: 'uppercase', margin: '0 0 4px' }}>
        {label}
      </p>
      {sub && (
        <p style={{ fontFamily: SERIF, fontSize: 12, color: MUTED, margin: 0, letterSpacing: '0.04em', fontStyle: 'italic' }}>{sub}</p>
      )}
    </motion.div>
  )
}

export default function AdminDashboard({ navigate }) {
  const [bookings,  setBookings]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [search,    setSearch]    = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'upcoming' | 'past'
  const [authState, setAuthState] = useState({ user: null, token: null })
  const [selectedBooking, setSelectedBooking] = useState(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('regalcine_auth')
      if (saved) setAuthState(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  const fetchBookings = useCallback(async (token) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`${API_URL}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401 || res.status === 403) {
        setError('Access denied. Admin privileges required.')
        return
      }
      if (!res.ok) {
        setError(`Failed to fetch bookings (${res.status})`)
        return
      }
      const data = await res.json()
      setBookings(Array.isArray(data) ? data : data.bookings ?? [])
    } catch {
      setError('Unable to connect to the server. Please check your connection.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (authState.token) fetchBookings(authState.token)
    else setLoading(false)
  }, [authState.token, fetchBookings])

  const today = new Date().toISOString().split('T')[0]

  const filtered = bookings.filter(b => {
    const matchSearch = !search ||
      (b.guestName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (b.contactNumber ?? '').includes(search) ||
      (b.celebrationType ?? '').toLowerCase().includes(search.toLowerCase())
    const matchDate   = !dateFilter || b.date === dateFilter
    const matchStatus = statusFilter === 'all' || (statusFilter === 'upcoming' ? b.date >= today : b.date < today)
    return matchSearch && matchDate && matchStatus
  })

  const stats = {
    total:    bookings.length,
    today:    bookings.filter(b => b.date === today).length,
    upcoming: bookings.filter(b => b.date >= today).length,
    past:     bookings.filter(b => b.date < today).length,
  }

  // ── Not authenticated
  if (!authState.user && !loading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 32 }}>
        <p style={{ fontFamily: SERIF, fontSize: 9, letterSpacing: '0.6em', color: GOLD, textTransform: 'uppercase' }}>Admin Console</p>
        <p style={{ fontFamily: SERIF, fontSize: 'clamp(16px,3vw,22px)', color: LIGHT, letterSpacing: '0.14em', textAlign: 'center' }}>
          Please sign in with an admin account to continue.
        </p>
        <button onClick={() => navigate('home')}
          style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: '0.32em', color: GOLD, background: 'rgba(197,139,115,0.1)', border: '1px solid rgba(197,139,115,0.45)', padding: '12px 28px', cursor: 'pointer', textTransform: 'uppercase' }}>
          Back to Site
        </button>
      </div>
    )
  }

  // ── Not admin
  if (authState.user && authState.user.role !== 'admin' && !loading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 32 }}>
        <p style={{ fontFamily: SERIF, fontSize: 9, letterSpacing: '0.6em', color: '#e07070', textTransform: 'uppercase' }}>Access Denied</p>
        <p style={{ fontFamily: SERIF, fontSize: 'clamp(16px,3vw,22px)', color: LIGHT, letterSpacing: '0.14em', textAlign: 'center' }}>
          Admin privileges are required to view this page.
        </p>
        <button onClick={() => navigate('home')}
          style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: '0.32em', color: GOLD, background: 'rgba(197,139,115,0.1)', border: '1px solid rgba(197,139,115,0.45)', padding: '12px 28px', cursor: 'pointer', textTransform: 'uppercase' }}>
          Back to Site
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: LIGHT }}>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        padding: '0 clamp(16px,4vw,52px)',
        height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(8,7,14,0.96)',
        borderBottom: '1px solid rgba(197,139,115,0.18)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={LOGO_URL} alt="" style={{ width: 30, height: 30, objectFit: 'contain', borderRadius: 2 }} />
          <div>
            <p style={{ fontFamily: SERIF, fontSize: 9, letterSpacing: '0.5em', color: GOLD, textTransform: 'uppercase', margin: 0 }}>
              Admin Console
            </p>
            <p style={{ fontFamily: SERIF, fontSize: 'clamp(13px,2vw,17px)', letterSpacing: '0.22em', color: LIGHT, margin: 0, textTransform: 'uppercase' }}>
              The Regal Cine
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px,2.5vw,24px)' }}>
          {authState.user && (
            <span style={{ fontFamily: SERIF, fontSize: 13, color: MUTED, letterSpacing: '0.06em' }}>
              {authState.user.username}
            </span>
          )}
          <motion.button
            whileHover={{ borderColor: GOLD }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('home')}
            style={{
              fontFamily: SERIF, fontSize: 11, letterSpacing: '0.3em', color: GOLD,
              background: 'rgba(197,139,115,0.08)',
              border: '1px solid rgba(197,139,115,0.4)',
              padding: '8px clamp(14px,2vw,20px)', cursor: 'pointer',
              textTransform: 'uppercase', outline: 'none',
              transition: 'border-color 0.3s',
            }}
          >
            ← Back to Site
          </motion.button>
          <motion.button
            whileHover={{ borderColor: GOLD }}
            whileTap={{ scale: 0.97 }}
            onClick={() => authState.token && fetchBookings(authState.token)}
            disabled={loading}
            style={{
              fontFamily: SERIF, fontSize: 11, letterSpacing: '0.3em', color: MUTED,
              background: 'none', border: '1px solid rgba(197,139,115,0.22)',
              padding: '8px clamp(12px,2vw,18px)', cursor: 'pointer',
              textTransform: 'uppercase', outline: 'none', opacity: loading ? 0.5 : 1,
              transition: 'border-color 0.3s',
            }}
          >
            {loading ? '…' : 'Refresh'}
          </motion.button>
        </div>
      </header>

      {/* ── Body ── */}
      <main style={{ padding: 'clamp(28px,4vw,52px) clamp(16px,4vw,52px)' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'clamp(10px,2vw,18px)', marginBottom: 'clamp(28px,4vw,48px)' }}>
          <StatCard label="Total Bookings"   value={stats.total}    />
          <StatCard label="Today"            value={stats.today}    sub={today} />
          <StatCard label="Upcoming"         value={stats.upcoming} />
          <StatCard label="Past Bookings"    value={stats.past}     />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24, alignItems: 'center' }}>
          <input
            placeholder="Search guest, phone, or occasion…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              fontFamily: SERIF, fontSize: 14, color: LIGHT, letterSpacing: '0.04em',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(197,139,115,0.25)',
              padding: '10px 16px', outline: 'none',
              flex: 1, minWidth: 200,
              transition: 'border-color 0.3s',
            }}
            onFocus={e => e.target.style.borderColor = GOLD}
            onBlur={e => e.target.style.borderColor = 'rgba(197,139,115,0.25)'}
          />
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            style={{
              fontFamily: SERIF, fontSize: 14, color: dateFilter ? LIGHT : MUTED,
              letterSpacing: '0.04em',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(197,139,115,0.25)',
              padding: '10px 16px', outline: 'none', colorScheme: 'dark',
              transition: 'border-color 0.3s',
            }}
            onFocus={e => e.target.style.borderColor = GOLD}
            onBlur={e => e.target.style.borderColor = 'rgba(197,139,115,0.25)'}
          />
          {/* Status filter pills */}
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'upcoming', 'past'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{
                  fontFamily: SERIF, fontSize: 10, letterSpacing: '0.28em',
                  textTransform: 'uppercase', cursor: 'pointer',
                  padding: '9px 16px',
                  color: statusFilter === s ? BG : MUTED,
                  background: statusFilter === s ? GOLD : 'transparent',
                  border: `1px solid ${statusFilter === s ? GOLD : 'rgba(197,139,115,0.25)'}`,
                  transition: 'all 0.25s',
                }}>
                {s}
              </button>
            ))}
          </div>
          {(search || dateFilter || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setDateFilter(''); setStatusFilter('all') }}
              style={{
                fontFamily: SERIF, fontSize: 10, letterSpacing: '0.24em', color: MUTED,
                background: 'none', border: '1px solid rgba(197,139,115,0.18)',
                padding: '9px 16px', cursor: 'pointer', textTransform: 'uppercase',
                transition: 'color 0.25s, border-color 0.25s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = LIGHT; e.currentTarget.style.borderColor = 'rgba(197,139,115,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.color = MUTED; e.currentTarget.style.borderColor = 'rgba(197,139,115,0.18)' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Count */}
        {!loading && !error && (
          <p style={{ fontFamily: SERIF, fontSize: 12, color: MUTED, letterSpacing: '0.1em', marginBottom: 16 }}>
            Showing {filtered.length} of {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Table / States */}
        {loading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: 'clamp(48px,8vw,80px) 32px' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
              style={{ width: 32, height: 32, border: `1.5px solid rgba(197,139,115,0.2)`, borderTopColor: GOLD, borderRadius: '50%', margin: '0 auto 20px' }}
            />
            <p style={{ fontFamily: SERIF, fontSize: 14, color: MUTED, fontStyle: 'italic' }}>Loading bookings…</p>
          </motion.div>
        ) : error ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: 'clamp(48px,8vw,80px) 32px', border: '1px solid rgba(180,80,80,0.25)', background: 'rgba(180,80,80,0.04)' }}>
            <p style={{ fontFamily: SERIF, fontSize: 15, color: '#e07070', marginBottom: 14, fontStyle: 'italic' }}>{error}</p>
            <button onClick={() => authState.token && fetchBookings(authState.token)}
              style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: '0.28em', color: GOLD, background: 'rgba(197,139,115,0.08)', border: '1px solid rgba(197,139,115,0.35)', padding: '10px 22px', cursor: 'pointer', textTransform: 'uppercase' }}>
              Retry
            </button>
          </motion.div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid rgba(197,139,115,0.15)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(197,139,115,0.28)', background: 'rgba(197,139,115,0.04)' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Guest Name</th>
                  <th style={thStyle}>Contact</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Time Slot</th>
                  <th style={thStyle}>Occasion</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Guests</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}
                      style={{ fontFamily: SERIF, color: MUTED, textAlign: 'center', padding: 'clamp(40px,6vw,60px) 32px', fontStyle: 'italic', fontSize: 15 }}>
                      No bookings match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((b, i) => {
                    const isUpcoming = b.date >= today
                    return (
                      <motion.tr key={b.id ?? i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => setSelectedBooking(selectedBooking?.id === b.id ? null : b)}
                        style={{
                          borderBottom: '1px solid rgba(197,139,115,0.09)',
                          cursor: 'pointer',
                          background: selectedBooking?.id === b.id ? 'rgba(197,139,115,0.08)' : 'transparent',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => {
                          if (selectedBooking?.id !== b.id) e.currentTarget.style.background = 'rgba(197,139,115,0.04)'
                        }}
                        onMouseLeave={e => {
                          if (selectedBooking?.id !== b.id) e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <td style={{ ...tdStyle, color: MUTED, fontSize: 12 }}>{i + 1}</td>
                        <td style={{ ...tdStyle, fontWeight: 400, color: LIGHT }}>{b.guestName ?? '—'}</td>
                        <td style={{ ...tdStyle, color: MUTED }}>{b.contactNumber ?? '—'}</td>
                        <td style={{ ...tdStyle, color: GOLD, fontWeight: 400 }}>{b.date ?? '—'}</td>
                        <td style={tdStyle}>{b.timeSlot ?? '—'}</td>
                        <td style={{ ...tdStyle, color: MUTED }}>{b.celebrationType ?? '—'}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{b.totalGuests ?? '—'}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{
                            fontFamily: SERIF, fontSize: 9, letterSpacing: '0.28em',
                            textTransform: 'uppercase', padding: '4px 12px',
                            color: isUpcoming ? GOLD : MUTED,
                            border: `1px solid ${isUpcoming ? 'rgba(197,139,115,0.45)' : 'rgba(168,156,150,0.28)'}`,
                            background: isUpcoming ? 'rgba(197,139,115,0.08)' : 'transparent',
                            whiteSpace: 'nowrap',
                          }}>
                            {isUpcoming ? 'Upcoming' : 'Past'}
                          </span>
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Selected booking detail panel */}
        <AnimatePresence>
          {selectedBooking && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }} transition={{ type: 'tween', duration: 0.28 }}
              style={{
                marginTop: 20,
                padding: 'clamp(20px,3vw,32px)',
                border: '1px solid rgba(197,139,115,0.3)',
                background: 'rgba(197,139,115,0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <p style={{ fontFamily: SERIF, fontSize: 9, letterSpacing: '0.5em', color: GOLD, textTransform: 'uppercase', margin: '0 0 4px' }}>
                    Booking Detail
                  </p>
                  <h3 style={{ fontFamily: SERIF, fontSize: 'clamp(18px,3vw,24px)', fontWeight: 300, color: LIGHT, margin: 0, letterSpacing: '0.1em' }}>
                    {selectedBooking.guestName}
                  </h3>
                </div>
                <button onClick={() => setSelectedBooking(null)}
                  style={{ fontFamily: SERIF, fontSize: 20, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = LIGHT}
                  onMouseLeave={e => e.currentTarget.style.color = MUTED}
                >×</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'clamp(14px,2vw,24px)' }}>
                {[
                  ['Contact',        selectedBooking.contactNumber],
                  ['Date',           selectedBooking.date],
                  ['Time Slot',      selectedBooking.timeSlot],
                  ['Occasion',       selectedBooking.celebrationType],
                  ['Guests',         selectedBooking.totalGuests],
                  ['Status',         selectedBooking.date >= today ? 'Upcoming' : 'Past'],
                  ['Booking ID',     selectedBooking.id ?? '—'],
                  ['Booked On',      selectedBooking.createdAt ? new Date(selectedBooking.createdAt).toLocaleDateString() : '—'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p style={{ fontFamily: SERIF, fontSize: 9, letterSpacing: '0.4em', color: GOLD, textTransform: 'uppercase', margin: '0 0 4px' }}>
                      {label}
                    </p>
                    <p style={{ fontFamily: SERIF, fontSize: 15, color: LIGHT, margin: 0, letterSpacing: '0.04em' }}>
                      {val ?? '—'}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* ── Footer ── */}
      <footer style={{ padding: '28px clamp(16px,4vw,52px)', borderTop: '1px solid rgba(197,139,115,0.1)', textAlign: 'center' }}>
        <p style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: '0.24em', color: 'rgba(138,122,114,0.55)', textTransform: 'uppercase' }}>
          © 2025 The Regal Cine · Admin Console
        </p>
      </footer>

    </div>
  )
}
