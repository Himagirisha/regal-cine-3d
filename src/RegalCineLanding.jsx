import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { motion, useInView, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import * as THREE from 'three'

const LOGO_URL = `${import.meta.env.BASE_URL}regal.jpg`
const API_URL  = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

// ─── Design tokens ────────────────────────────────────────────────────────────
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif"
const GOLD  = '#c58b73'
const LIGHT = '#f5ede6'
const MUTED = '#a89c96'
const BG    = '#08070e'
const BG2   = '#050409'

// ─────────────────────────────────────────────────────────────────────────────
// THREE.JS — PARTICLE FIELD
// ─────────────────────────────────────────────────────────────────────────────

function CinemaDustParticles() {
  const COUNT = 420
  const { geo, base, meta } = useMemo(() => {
    const base = new Float32Array(COUNT * 3)
    const meta = new Float32Array(COUNT * 2)
    for (let i = 0; i < COUNT; i++) {
      base[i * 3]     = (Math.random() - 0.5) * 26
      base[i * 3 + 1] = (Math.random() - 0.5) * 15
      base[i * 3 + 2] = (Math.random() - 0.5) * 10 - 1
      meta[i * 2]     = 0.035 + Math.random() * 0.09
      meta[i * 2 + 1] = Math.random() * Math.PI * 2
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3))
    return { geo, base, meta }
  }, [])

  useEffect(() => () => geo.dispose(), [geo])

  useFrame(({ clock }) => {
    const t   = clock.elapsedTime
    const arr = geo.attributes.position.array
    for (let i = 0; i < COUNT; i++) {
      const sp = meta[i * 2], ph = meta[i * 2 + 1]
      arr[i * 3]     = base[i * 3]     + Math.cos(t * sp * 0.65 + ph) * 0.22
      arr[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * sp + ph) * 0.30
      arr[i * 3 + 2] = base[i * 3 + 2] + Math.sin(t * sp * 0.4 + ph * 1.3) * 0.14
    }
    geo.attributes.position.needsUpdate = true
  })

  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial size={0.048} color="#c99060" transparent opacity={0.40}
        sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// THREE.JS — TRACKING SPOTLIGHT
// ─────────────────────────────────────────────────────────────────────────────

function TrackingSpotlight({ mouseRef }) {
  const spotRef = useRef()
  useFrame(() => {
    if (!spotRef.current) return
    spotRef.current.position.x = THREE.MathUtils.lerp(spotRef.current.position.x, mouseRef.current.x * 10, 0.04)
    spotRef.current.position.y = THREE.MathUtils.lerp(spotRef.current.position.y, mouseRef.current.y * 6 + 5, 0.04)
  })
  return (
    <spotLight ref={spotRef} position={[0, 8, 6]} intensity={160} angle={0.3}
      penumbra={0.88} color="#ffd9bf" castShadow
      shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// THREE.JS — SCENE
// ─────────────────────────────────────────────────────────────────────────────

function Scene({ mouseRef }) {
  return (
    <>
      <color attach="background" args={['#08070e']} />
      <ambientLight intensity={0.2} />
      <rectAreaLight position={[0, 1, 5]} intensity={5} width={10} height={7} color="#fff5ee" />
      <spotLight position={[-6, 3, 4]} intensity={38} angle={0.55} penumbra={1} color="#a07fc0" />
      <spotLight position={[6, 2, 3]} intensity={28} angle={0.6} penumbra={1} color="#c58b73" />
      <TrackingSpotlight mouseRef={mouseRef} />
      <CinemaDustParticles />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STYLES
// ─────────────────────────────────────────────────────────────────────────────

const sEyebrow = {
  fontFamily: SERIF,
  fontSize: 'clamp(11px,2.5vw,13px)',
  letterSpacing: '0.46em',
  color: GOLD,
  margin: '0 0 14px',
  textTransform: 'uppercase',
  fontWeight: 400,
}
const sDivider = {
  width: 58, height: 1,
  background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
  margin: '18px auto',
}
const sSectionTitle = {
  fontFamily: SERIF,
  fontSize: 'clamp(32px,5.5vw,64px)',
  fontWeight: 300,
  letterSpacing: '0.15em',
  color: LIGHT,
  textTransform: 'uppercase',
  margin: '0 0 16px',
}
const sCtaBtn = {
  fontFamily: SERIF,
  fontSize: 'clamp(12px,2.8vw,14px)',
  letterSpacing: '0.36em',
  color: GOLD,
  background: 'rgba(197,139,115,0.09)',
  border: `1px solid rgba(197,139,115,0.55)`,
  padding: 'clamp(14px,3vw,16px) clamp(32px,8vw,56px)',
  cursor: 'pointer',
  textTransform: 'uppercase',
  transition: 'all 0.35s ease',
  outline: 'none',
  fontWeight: 400,
  display: 'inline-block',
}

// ─────────────────────────────────────────────────────────────────────────────
// SCROLL ENTRANCE WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

function FadeIn({ children, delay = 0, y = 26, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-70px 0px' })
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.88, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MY RESERVATIONS MINI PANEL  (used inside user dropdown)
// ─────────────────────────────────────────────────────────────────────────────

function MyReservationsPanel({ token }) {
  const [open, setOpen]               = useState(false)
  const [reservations, setReservations] = useState([])
  const [loading, setLoading]         = useState(false)

  const fetchRes = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/bookings/my-reservations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setReservations(await res.json())
    } finally { setLoading(false) }
  }, [token])

  const toggle = () => {
    if (!open) fetchRes()
    setOpen(v => !v)
  }

  return (
    <div>
      <button onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          fontFamily: SERIF, fontSize: 13, letterSpacing: '0.18em',
          color: MUTED, background: 'none', border: 'none', cursor: 'pointer',
          padding: '8px 0', textTransform: 'uppercase', textAlign: 'left',
          transition: 'color 0.25s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = GOLD}
        onMouseLeave={e => e.currentTarget.style.color = MUTED}
      >
        My Reservations
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <path d="M2 3.5 L5 6.5 L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ type: 'tween', duration: 0.28 }}
            style={{ overflow: 'hidden', paddingLeft: 12 }}>
            {loading && <p style={{ fontFamily: SERIF, fontSize: 12, color: MUTED, padding: '8px 0' }}>Loading…</p>}
            {!loading && reservations.length === 0 && (
              <p style={{ fontFamily: SERIF, fontSize: 12, color: MUTED, fontStyle: 'italic', padding: '8px 0' }}>No reservations yet.</p>
            )}
            {reservations.map(r => (
              <div key={r.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid rgba(197,139,115,0.1)' }}>
                <p style={{ fontFamily: SERIF, fontSize: 12, color: GOLD, margin: '0 0 2px', letterSpacing: '0.06em' }}>
                  {r.date} · {r.timeSlot}
                </p>
                <p style={{ fontFamily: SERIF, fontSize: 11, color: MUTED, margin: 0 }}>
                  {r.guestName} · {r.totalGuests} guests
                </p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────────────────────────────────────

const NAVBAR_LINKS = [
  { label: 'Home',     id: null },
  { label: 'Gallery',  id: 'suites' },
  { label: 'Packages', id: 'celebrations' },
]

function Navbar({ authState, onLoginClick, onLogout, onAdminClick }) {
  const [scrolled,    setScrolled]    = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userMenuOpen])

  const scrollTo = (id) => {
    setMobileOpen(false)
    if (!id) window.scrollTo({ top: 0, behavior: 'smooth' })
    else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const navLinkStyle = {
    fontFamily: SERIF, fontSize: 12, letterSpacing: '0.32em',
    color: MUTED, background: 'none', border: 'none',
    cursor: 'pointer', textTransform: 'uppercase',
    transition: 'color 0.25s', padding: 0,
  }

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          height: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 clamp(16px,4vw,52px)',
          background: scrolled ? 'rgba(8,7,14,0.94)' : 'rgba(8,7,14,0.38)',
          borderBottom: scrolled
            ? '1px solid rgba(197,139,115,0.18)'
            : '1px solid transparent',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          transition: 'background 0.45s, border-color 0.45s',
        }}
      >
        {/* ── Logo ── */}
        <button onClick={() => scrollTo(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
          <img src={LOGO_URL} alt="" style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 2 }} />
          <span style={{
            fontFamily: SERIF, fontSize: 'clamp(13px,2vw,17px)',
            letterSpacing: '0.26em', color: LIGHT, textTransform: 'uppercase',
          }}>
            The Regal Cine
          </span>
        </button>

        {/* ── Desktop nav ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px,3vw,36px)' }}>
          {/* Links — hidden below md */}
          <div className="hidden md:flex" style={{ gap: 'clamp(20px,3vw,36px)', alignItems: 'center' }}>
            {NAVBAR_LINKS.map(item => (
              <button key={item.label} onClick={() => scrollTo(item.id)}
                style={navLinkStyle}
                onMouseEnter={e => e.currentTarget.style.color = GOLD}
                onMouseLeave={e => e.currentTarget.style.color = MUTED}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Book Now — always visible */}
          <motion.button
            className="book-now-glow"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => scrollTo('reservation')}
            style={{
              fontFamily: SERIF, fontSize: 11, letterSpacing: '0.36em',
              color: GOLD, textTransform: 'uppercase',
              background: 'rgba(197,139,115,0.09)',
              border: '1px solid rgba(197,139,115,0.55)',
              padding: '9px clamp(14px,2.5vw,24px)',
              cursor: 'pointer', outline: 'none', flexShrink: 0,
            }}
          >
            Book Now
          </motion.button>

          {/* ── User icon / dropdown ── */}
          <div ref={userMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
            <motion.button
              className={authState.user ? 'user-icon-active' : 'user-icon-glow'}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                if (authState.user) {
                  setUserMenuOpen(v => !v)
                } else {
                  onLoginClick()
                }
              }}
              title={authState.user ? `${authState.user.username}` : 'Sign In / Register'}
              style={{
                width: 38, height: 38, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', outline: 'none',
                background: authState.user ? 'rgba(197,139,115,0.18)' : 'rgba(197,139,115,0.07)',
                border: `1.5px solid ${authState.user ? 'rgba(197,139,115,0.7)' : 'rgba(197,139,115,0.38)'}`,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </motion.button>

            {/* User dropdown — shown when logged in */}
            <AnimatePresence>
              {authState.user && userMenuOpen && (
                <motion.div
                  key="user-menu"
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ type: 'tween', duration: 0.22 }}
                  style={{
                    position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                    minWidth: 220,
                    background: 'linear-gradient(160deg, #0e0c18 0%, #08070e 100%)',
                    border: '1px solid rgba(197,139,115,0.22)',
                    padding: '20px 20px 16px',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.65)',
                    zIndex: 10,
                  }}
                >
                  {/* User info */}
                  <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(197,139,115,0.12)' }}>
                    <p style={{ fontFamily: SERIF, fontSize: 9, letterSpacing: '0.5em', color: GOLD, textTransform: 'uppercase', margin: '0 0 3px' }}>
                      {authState.user.role ?? 'Member'}
                    </p>
                    <p style={{ fontFamily: SERIF, fontSize: 16, color: LIGHT, margin: 0, letterSpacing: '0.06em' }}>
                      {authState.user.username}
                    </p>
                  </div>

                  {/* My reservations */}
                  <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(197,139,115,0.1)' }}>
                    <MyReservationsPanel token={authState.token} />
                  </div>

                  {/* Admin link */}
                  {authState.user.role === 'admin' && (
                    <button
                      onClick={() => { setUserMenuOpen(false); onAdminClick() }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        fontFamily: SERIF, fontSize: 12, letterSpacing: '0.22em',
                        color: GOLD, background: 'none', border: 'none',
                        cursor: 'pointer', textTransform: 'uppercase',
                        padding: '6px 0', marginBottom: 8, transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      Admin Dashboard →
                    </button>
                  )}

                  {/* Sign out */}
                  <button
                    onClick={() => { setUserMenuOpen(false); onLogout() }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      fontFamily: SERIF, fontSize: 11, letterSpacing: '0.26em',
                      color: MUTED, background: 'none', border: 'none',
                      cursor: 'pointer', textTransform: 'uppercase',
                      padding: '4px 0', transition: 'color 0.25s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = LIGHT}
                    onMouseLeave={e => e.currentTarget.style.color = MUTED}
                  >
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            className="flex md:hidden"
            onClick={() => setMobileOpen(v => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            style={{
              width: 36, height: 36,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 5,
              background: 'none',
              border: '1px solid rgba(197,139,115,0.25)',
              borderRadius: 2, cursor: 'pointer', outline: 'none', flexShrink: 0,
            }}
          >
            <span style={{ width: 18, height: 1.5, background: LIGHT, borderRadius: 1, transition: 'transform 0.3s', transform: mobileOpen ? 'translateY(6.5px) rotate(45deg)' : 'none' }} />
            <span style={{ width: 18, height: 1.5, background: LIGHT, borderRadius: 1, transition: 'opacity 0.2s', opacity: mobileOpen ? 0 : 1 }} />
            <span style={{ width: 18, height: 1.5, background: LIGHT, borderRadius: 1, transition: 'transform 0.3s', transform: mobileOpen ? 'translateY(-6.5px) rotate(-45deg)' : 'none' }} />
          </button>
        </div>
      </motion.nav>

      {/* ── Mobile dropdown ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-nav"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'tween', duration: 0.28 }}
            style={{
              position: 'fixed', top: 64, left: 0, right: 0, zIndex: 190,
              background: 'rgba(8,7,14,0.97)',
              borderBottom: '1px solid rgba(197,139,115,0.18)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              padding: '20px clamp(16px,4vw,52px) 28px',
            }}
          >
            {NAVBAR_LINKS.map(item => (
              <button key={item.label} onClick={() => scrollTo(item.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  fontFamily: SERIF, fontSize: 17, letterSpacing: '0.22em',
                  color: LIGHT, background: 'none', border: 'none',
                  borderBottom: '1px solid rgba(197,139,115,0.1)',
                  padding: '14px 0', cursor: 'pointer', textTransform: 'uppercase',
                  transition: 'color 0.25s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = GOLD}
                onMouseLeave={e => e.currentTarget.style.color = LIGHT}
              >
                {item.label}
              </button>
            ))}

            {/* Mobile: show user or login */}
            <div style={{ marginTop: 18 }}>
              {authState.user ? (
                <div>
                  <p style={{ fontFamily: SERIF, fontSize: 13, color: GOLD, letterSpacing: '0.12em', marginBottom: 10 }}>
                    {authState.user.username}
                  </p>
                  {authState.user.role === 'admin' && (
                    <button onClick={() => { setMobileOpen(false); onAdminClick() }}
                      style={{ display: 'block', fontFamily: SERIF, fontSize: 12, letterSpacing: '0.22em', color: GOLD, background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', padding: '6px 0', marginBottom: 6 }}>
                      Admin Dashboard →
                    </button>
                  )}
                  <button onClick={() => { setMobileOpen(false); onLogout() }}
                    style={{ display: 'block', fontFamily: SERIF, fontSize: 11, letterSpacing: '0.26em', color: MUTED, background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', padding: '4px 0' }}>
                    Sign Out
                  </button>
                </div>
              ) : (
                <button onClick={() => { setMobileOpen(false); onLoginClick() }}
                  style={{
                    fontFamily: SERIF, fontSize: 12, letterSpacing: '0.32em',
                    color: GOLD, background: 'rgba(197,139,115,0.09)',
                    border: '1px solid rgba(197,139,115,0.45)',
                    padding: '10px 22px', cursor: 'pointer', textTransform: 'uppercase',
                  }}>
                  Sign In / Register
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH MODAL  — Login · Signup · Forgot Password
// ─────────────────────────────────────────────────────────────────────────────

function AuthModal({ open, onClose, onAuth }) {
  const [view, setView]   = useState('login')  // 'login' | 'signup' | 'forgot'
  const [form, setForm]   = useState({ username: '', password: '', confirmPassword: '', fullName: '', email: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const [success, setSuccess] = useState(null)

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setView('login')
      setError(null)
      setSuccess(null)
      setForm({ username: '', password: '', confirmPassword: '', fullName: '', email: '', phone: '' })
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const switchView = (v) => { setView(v); setError(null); setSuccess(null) }

  const sInput = {
    fontFamily: SERIF, fontSize: 15, letterSpacing: '0.06em',
    color: LIGHT, background: 'transparent',
    border: 'none', borderBottom: '1px solid rgba(197,139,115,0.3)',
    padding: '12px 0', width: '100%', outline: 'none',
    transition: 'border-color 0.3s',
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res  = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username.trim(), password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      onAuth({ user: data.user, token: data.token })
      localStorage.setItem('regalcine_auth', JSON.stringify({ user: data.user, token: data.token }))
      onClose()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username:  form.username.trim(),
          password:  form.password,
          email:     form.email.trim(),
          fullName:  form.fullName.trim(),
          phone:     form.phone.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')

      // Auto-login after registration
      const loginRes  = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username.trim(), password: form.password }),
      })
      const authData = await loginRes.json()
      if (!loginRes.ok) throw new Error(authData.error || 'Auto-login failed')
      onAuth({ user: authData.user, token: authData.token })
      localStorage.setItem('regalcine_auth', JSON.stringify({ user: authData.user, token: authData.token }))
      onClose()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim() }),
      })
    } catch { /* swallow — show success regardless */ }
    finally {
      setLoading(false)
      setSuccess('If your email is registered, you will receive a password reset link shortly.')
    }
  }

  const viewTitle = { login: 'Sign In', signup: 'Create Account', forgot: 'Reset Password' }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="auth-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ type: 'tween', duration: 0.3 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(0,0,0,0.84)',
              backdropFilter: 'blur(7px)',
              WebkitBackdropFilter: 'blur(7px)',
            }}
          />

          {/* Centering container */}
          <motion.div
            key="auth-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 301,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '16px',
            }}
            onClick={onClose}
          >
            {/* Modal card */}
            <motion.div
              key="auth-card"
              initial={{ y: 28, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.96 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: 'min(440px, 100%)',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: 'linear-gradient(160deg, #0e0c18 0%, #08070e 100%)',
                border: '1px solid rgba(197,139,115,0.28)',
                padding: 'clamp(28px,5vw,48px)',
                boxShadow: '0 28px 90px rgba(0,0,0,0.75), 0 0 48px rgba(197,139,115,0.07)',
                position: 'relative',
              }}
            >
              {/* Close × */}
              <button onClick={onClose}
                style={{
                  position: 'absolute', top: 14, right: 16,
                  width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: MUTED, fontSize: 22, lineHeight: 1, transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = LIGHT}
                onMouseLeave={e => e.currentTarget.style.color = MUTED}
              >×</button>

              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <p style={{ fontFamily: SERIF, fontSize: 9, letterSpacing: '0.6em', color: GOLD, textTransform: 'uppercase', margin: '0 0 10px' }}>
                  Member Portal
                </p>
                <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(22px,4vw,30px)', fontWeight: 300, letterSpacing: '0.2em', color: LIGHT, margin: 0, textTransform: 'uppercase' }}>
                  {viewTitle[view]}
                </h2>
                <div style={{ width: 48, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, margin: '14px auto 0' }} />
              </div>

              <AnimatePresence mode="wait">
                {/* ── LOGIN VIEW ── */}
                {view === 'login' && (
                  <motion.form key="login" onSubmit={handleLogin}
                    initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 18 }} transition={{ type: 'tween', duration: 0.22 }}>

                    {error && (
                      <p style={{ fontFamily: SERIF, fontSize: 13, color: '#e07070', marginBottom: 18, textAlign: 'center', fontStyle: 'italic' }}>
                        {error}
                      </p>
                    )}

                    <div style={{ marginBottom: 22 }}>
                      <input required style={sInput} placeholder="Username" autoComplete="username"
                        value={form.username} onChange={set('username')}
                        onFocus={e => e.target.style.borderBottomColor = GOLD}
                        onBlur={e => e.target.style.borderBottomColor = 'rgba(197,139,115,0.3)'} />
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <input required type="password" style={sInput} placeholder="Password" autoComplete="current-password"
                        value={form.password} onChange={set('password')}
                        onFocus={e => e.target.style.borderBottomColor = GOLD}
                        onBlur={e => e.target.style.borderBottomColor = 'rgba(197,139,115,0.3)'} />
                    </div>

                    {/* Forgot Password link */}
                    <div style={{ textAlign: 'right', marginBottom: 28 }}>
                      <button type="button" onClick={() => switchView('forgot')}
                        style={{
                          fontFamily: SERIF, fontSize: 12, letterSpacing: '0.08em',
                          color: MUTED, background: 'none', border: 'none', cursor: 'pointer',
                          textDecoration: 'underline', textUnderlineOffset: 3,
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = GOLD}
                        onMouseLeave={e => e.currentTarget.style.color = MUTED}
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <motion.button type="submit" disabled={loading}
                      whileHover={!loading ? { borderColor: GOLD, color: LIGHT, boxShadow: '0 0 24px rgba(197,139,115,0.22)' } : {}}
                      whileTap={!loading ? { scale: 0.98 } : {}}
                      style={{ ...sCtaBtn, width: '100%', textAlign: 'center', fontSize: 12, padding: '14px', opacity: loading ? 0.65 : 1 }}>
                      {loading ? '…' : 'Sign In'}
                    </motion.button>

                    <p style={{ fontFamily: SERIF, fontSize: 13, color: MUTED, textAlign: 'center', marginTop: 22, letterSpacing: '0.04em' }}>
                      New guest?{' '}
                      <button type="button" onClick={() => switchView('signup')}
                        style={{ fontFamily: SERIF, fontSize: 13, color: GOLD, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                        Create Account
                      </button>
                    </p>
                  </motion.form>
                )}

                {/* ── SIGNUP VIEW ── */}
                {view === 'signup' && (
                  <motion.form key="signup" onSubmit={handleSignup}
                    initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }} transition={{ type: 'tween', duration: 0.22 }}>

                    {error && (
                      <p style={{ fontFamily: SERIF, fontSize: 13, color: '#e07070', marginBottom: 18, textAlign: 'center', fontStyle: 'italic' }}>
                        {error}
                      </p>
                    )}

                    <div style={{ marginBottom: 20 }}>
                      <input required style={sInput} placeholder="Full Name" autoComplete="name"
                        value={form.fullName} onChange={set('fullName')}
                        onFocus={e => e.target.style.borderBottomColor = GOLD}
                        onBlur={e => e.target.style.borderBottomColor = 'rgba(197,139,115,0.3)'} />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <input required type="email" style={sInput} placeholder="Email Address" autoComplete="email"
                        value={form.email} onChange={set('email')}
                        onFocus={e => e.target.style.borderBottomColor = GOLD}
                        onBlur={e => e.target.style.borderBottomColor = 'rgba(197,139,115,0.3)'} />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <input type="tel" style={sInput} placeholder="Phone Number (optional)" autoComplete="tel"
                        value={form.phone} onChange={set('phone')}
                        onFocus={e => e.target.style.borderBottomColor = GOLD}
                        onBlur={e => e.target.style.borderBottomColor = 'rgba(197,139,115,0.3)'} />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <input required style={sInput} placeholder="Username" autoComplete="username"
                        value={form.username} onChange={set('username')}
                        onFocus={e => e.target.style.borderBottomColor = GOLD}
                        onBlur={e => e.target.style.borderBottomColor = 'rgba(197,139,115,0.3)'} />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <input required type="password" style={sInput} placeholder="Password (min 6 characters)" autoComplete="new-password"
                        value={form.password} onChange={set('password')}
                        onFocus={e => e.target.style.borderBottomColor = GOLD}
                        onBlur={e => e.target.style.borderBottomColor = 'rgba(197,139,115,0.3)'} />
                    </div>

                    <div style={{ marginBottom: 28 }}>
                      <input required type="password" style={sInput} placeholder="Confirm Password" autoComplete="new-password"
                        value={form.confirmPassword} onChange={set('confirmPassword')}
                        onFocus={e => e.target.style.borderBottomColor = GOLD}
                        onBlur={e => e.target.style.borderBottomColor = 'rgba(197,139,115,0.3)'} />
                    </div>

                    <motion.button type="submit" disabled={loading}
                      whileHover={!loading ? { borderColor: GOLD, color: LIGHT, boxShadow: '0 0 24px rgba(197,139,115,0.22)' } : {}}
                      whileTap={!loading ? { scale: 0.98 } : {}}
                      style={{ ...sCtaBtn, width: '100%', textAlign: 'center', fontSize: 12, padding: '14px', opacity: loading ? 0.65 : 1 }}>
                      {loading ? '…' : 'Create Account'}
                    </motion.button>

                    <p style={{ fontFamily: SERIF, fontSize: 13, color: MUTED, textAlign: 'center', marginTop: 22, letterSpacing: '0.04em' }}>
                      Already a member?{' '}
                      <button type="button" onClick={() => switchView('login')}
                        style={{ fontFamily: SERIF, fontSize: 13, color: GOLD, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                        Sign In
                      </button>
                    </p>
                  </motion.form>
                )}

                {/* ── FORGOT PASSWORD VIEW ── */}
                {view === 'forgot' && (
                  <motion.div key="forgot"
                    initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }} transition={{ type: 'tween', duration: 0.22 }}>

                    {success ? (
                      <div style={{ textAlign: 'center', padding: '12px 0 24px' }}>
                        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ margin: '0 auto 18px', display: 'block' }}>
                          <circle cx="22" cy="22" r="21" stroke={GOLD} strokeWidth="1.2" strokeOpacity="0.5"/>
                          <path d="M13 22 L19 28 L31 16" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <p style={{ fontFamily: SERIF, fontSize: 15, color: LIGHT, lineHeight: 1.8, letterSpacing: '0.04em', fontStyle: 'italic', marginBottom: 22 }}>
                          {success}
                        </p>
                        <button onClick={() => switchView('login')}
                          style={{ fontFamily: SERIF, fontSize: 12, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', letterSpacing: '0.12em', transition: 'color 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.color = GOLD}
                          onMouseLeave={e => e.currentTarget.style.color = MUTED}
                        >
                          Back to Sign In
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleForgot}>
                        <p style={{ fontFamily: SERIF, fontSize: 14, color: MUTED, lineHeight: 1.85, marginBottom: 26, fontStyle: 'italic', letterSpacing: '0.04em' }}>
                          Enter your registered email address and we'll send you a link to reset your password.
                        </p>

                        {error && (
                          <p style={{ fontFamily: SERIF, fontSize: 13, color: '#e07070', marginBottom: 16, fontStyle: 'italic' }}>{error}</p>
                        )}

                        <div style={{ marginBottom: 28 }}>
                          <input required type="email" style={sInput} placeholder="Email Address"
                            value={form.email} onChange={set('email')}
                            onFocus={e => e.target.style.borderBottomColor = GOLD}
                            onBlur={e => e.target.style.borderBottomColor = 'rgba(197,139,115,0.3)'} />
                        </div>

                        <motion.button type="submit" disabled={loading}
                          whileHover={!loading ? { borderColor: GOLD, color: LIGHT, boxShadow: '0 0 24px rgba(197,139,115,0.22)' } : {}}
                          whileTap={!loading ? { scale: 0.98 } : {}}
                          style={{ ...sCtaBtn, width: '100%', textAlign: 'center', fontSize: 12, padding: '14px', opacity: loading ? 0.65 : 1 }}>
                          {loading ? '…' : 'Send Reset Link'}
                        </motion.button>

                        <p style={{ fontFamily: SERIF, fontSize: 13, color: MUTED, textAlign: 'center', marginTop: 22 }}>
                          <button type="button" onClick={() => switchView('login')}
                            style={{ fontFamily: SERIF, fontSize: 13, color: GOLD, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                            ← Back to Sign In
                          </button>
                        </p>
                      </form>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO OVERLAY
// ─────────────────────────────────────────────────────────────────────────────

const heroContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.24, delayChildren: 0.5 } },
}
const heroItem = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 1.05, ease: [0.22, 1, 0.36, 1] } },
}

function HeroOverlay({ onBookClick }) {
  const handleBook = () => {
    if (onBookClick) onBookClick()
    document.getElementById('reservation')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-end',
      padding: '0 clamp(16px,5vw,48px) clamp(44px,9vh,88px)',
    }}>
      <motion.div
        variants={heroContainer} initial="hidden" animate="visible"
        style={{ textAlign: 'center', width: '100%', maxWidth: 680 }}
      >
        <motion.p variants={heroItem} style={{ ...sEyebrow, fontSize: 'clamp(11px,2.5vw,13px)', margin: '0 auto 16px' }}>
          Premium Cinematic Experience
        </motion.p>
        <motion.h1 variants={heroItem} style={{
          fontFamily: SERIF,
          fontSize: 'clamp(36px,8vw,84px)',
          fontWeight: 300, letterSpacing: '0.22em',
          color: LIGHT, margin: 0,
          textTransform: 'uppercase', lineHeight: 1.04,
          textShadow: '0 2px 40px rgba(0,0,0,0.6)',
        }}>
          The Regal Cine
        </motion.h1>
        <motion.div variants={heroItem} style={sDivider} />
        <motion.p variants={heroItem} style={{
          fontFamily: SERIF, fontSize: 'clamp(15px,3.5vw,20px)',
          letterSpacing: '0.12em', color: '#c4b0a8',
          margin: '0 0 clamp(28px,5vw,40px)', fontStyle: 'italic',
        }}>
          Where Cinema Meets Luxury
        </motion.p>
        <motion.button
          variants={heroItem}
          whileHover={{ scale: 1.04, borderColor: GOLD, color: LIGHT, boxShadow: '0 0 32px rgba(197,139,115,0.28)' }}
          whileTap={{ scale: 0.97 }}
          style={{ ...sCtaBtn, pointerEvents: 'all', fontSize: 'clamp(12px,2.8vw,14px)' }}
          onClick={handleBook}
        >
          Book Your Experience
        </motion.button>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 2.8, duration: 1.2 }}
        style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none' }}
      >
        <p style={{ fontFamily: SERIF, fontSize: 9, letterSpacing: '0.5em', color: GOLD, textTransform: 'uppercase', opacity: 0.7, margin: 0 }}>Scroll</p>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 1, height: 36, background: `linear-gradient(to bottom, ${GOLD}, transparent)` }}
        />
      </motion.div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// REGAL LOGO OVERLAY
// ─────────────────────────────────────────────────────────────────────────────

function RegalLogoOverlay({ rippling }) {
  const { scrollY } = useScroll()
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const y       = useTransform(scrollY, [0, vh], [0, 90])
  const scale   = useTransform(scrollY, [0, vh], [1, 0.72])
  const opacity = useTransform(scrollY, [0, vh * 0.6], [1, 0])

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none', zIndex: 1,
    }}>
      <motion.div style={{ y, scale, opacity, position: 'relative' }}>
        <motion.img
          src={LOGO_URL} alt=""
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 'clamp(160px, 26vw, 300px)',
            height: 'clamp(160px, 26vw, 300px)',
            objectFit: 'contain',
            mixBlendMode: 'screen',
            display: 'block',
            userSelect: 'none',
          }}
        />
        <AnimatePresence>
          {rippling && [0, 1, 2, 3].map(i => (
            <motion.div key={i}
              initial={{ scale: 0.55, opacity: 0.85 }}
              animate={{ scale: 4.2, opacity: 0 }}
              exit={{}}
              transition={{ duration: 1.4, delay: i * 0.2, ease: 'easeOut' }}
              style={{
                position: 'absolute', inset: 0,
                border: `1.5px solid ${GOLD}`,
                borderRadius: '50%',
                transformOrigin: 'center',
                pointerEvents: 'none',
              }}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — PRIVATE SCREENING SUITES
// ─────────────────────────────────────────────────────────────────────────────

const suites = [
  {
    tag: 'OUR GRANDEST',
    name: 'The Premiere',
    capacity: 'Up to 14 Guests',
    features: ['4K UHD Laser Projection', 'Dolby Atmos 7.1.4', 'Rose-gold velvet recliners', 'Full private catering', 'Dedicated concierge'],
  },
  {
    tag: 'MOST POPULAR',
    name: "Director's Cut",
    capacity: 'Up to 8 Guests',
    features: ['4K UHD Laser Projection', 'Dolby Atmos 5.1', 'Italian leather recliners', 'Curated tasting menu', 'Pre-screening cocktails'],
  },
  {
    tag: 'ULTRA PRIVATE',
    name: 'The Auteur',
    capacity: 'Up to 4 Guests',
    features: ['4K UHD Laser Projection', 'Dolby Atmos 5.1', 'Bespoke seating design', 'Private chef on request', 'Custom décor package'],
  },
]

function SuiteCardSimple({ suite, delay }) {
  return (
    <FadeIn delay={delay}>
      <div
        style={{ border: '1px solid rgba(197,139,115,0.18)', padding: 'clamp(28px,3.5vw,44px)', height: '100%', transition: 'border-color 0.35s, background 0.35s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(197,139,115,0.55)'; e.currentTarget.style.background = 'rgba(197,139,115,0.04)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(197,139,115,0.18)'; e.currentTarget.style.background = 'transparent' }}
      >
        <p style={{ ...sEyebrow, fontSize: 10, margin: '0 0 22px', opacity: 0.85 }}>{suite.tag}</p>
        <h3 style={{ fontFamily: SERIF, fontSize: 'clamp(24px,3.2vw,36px)', fontWeight: 300, color: LIGHT, margin: '0 0 6px', letterSpacing: '0.08em' }}>
          {suite.name}
        </h3>
        <p style={{ fontFamily: SERIF, fontSize: 'clamp(13px,1.6vw,16px)', color: GOLD, letterSpacing: '0.12em', margin: '0 0 26px', fontWeight: 400 }}>
          {suite.capacity}
        </p>
        <div style={{ width: 30, height: 1, background: GOLD, opacity: 0.4, margin: '0 0 26px' }} />
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {suite.features.map(f => (
            <li key={f} style={{ fontFamily: SERIF, fontSize: 'clamp(14px,1.6vw,16px)', color: MUTED, padding: '8px 0', borderBottom: '1px solid rgba(197,139,115,0.1)', letterSpacing: '0.04em' }}>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </FadeIn>
  )
}

function ScreeningSuites() {
  return (
    <section id="suites" style={{ padding: 'clamp(72px,12vh,136px) clamp(20px,5vw,80px)', background: BG }}>
      <FadeIn>
        <p style={{ ...sEyebrow, textAlign: 'center', margin: '0 auto 14px' }}>Our Venues</p>
        <h2 style={{ ...sSectionTitle, textAlign: 'center' }}>Private Screening Suites</h2>
        <div style={{ ...sDivider, margin: '0 auto 20px' }} />
        <p style={{ fontFamily: SERIF, fontSize: 'clamp(15px,2.2vw,19px)', color: MUTED, textAlign: 'center', margin: '0 auto 60px', maxWidth: 520, fontStyle: 'italic', lineHeight: 1.85, letterSpacing: '0.04em' }}>
          Three distinct spaces, each engineered for absolute cinematic immersion.
        </p>
      </FadeIn>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto">
        {suites.map((s, i) => <SuiteCardSimple key={s.name} suite={s} delay={i * 0.11} />)}
      </div>
      <FadeIn delay={0.25}>
        <div style={{ textAlign: 'center', marginTop: 56 }}>
          <motion.button
            style={sCtaBtn}
            whileHover={{ scale: 1.04, borderColor: GOLD, color: LIGHT, boxShadow: '0 0 28px rgba(197,139,115,0.22)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => document.getElementById('reservation')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Enquire Now
          </motion.button>
        </div>
      </FadeIn>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — BESPOKE CELEBRATIONS
// ─────────────────────────────────────────────────────────────────────────────

const occasions = ['Birthdays', 'Anniversaries', 'Proposals', 'Corporate Screenings', 'Film Premieres', 'Graduations']

function CelebrationSection() {
  return (
    <section id="celebrations" style={{ padding: 'clamp(72px,12vh,136px) clamp(20px,5vw,80px)', background: BG2, borderTop: '1px solid rgba(197,139,115,0.1)' }}>
      <div className="max-w-3xl mx-auto text-center">
        <FadeIn>
          <p style={{ ...sEyebrow, margin: '0 auto 14px' }}>Bespoke Events</p>
          <h2 style={{ ...sSectionTitle }}>Your Celebration, Elevated</h2>
          <div style={{ ...sDivider, margin: '0 auto 28px' }} />
          <p style={{ fontFamily: SERIF, fontSize: 'clamp(16px,2.3vw,20px)', color: MUTED, fontStyle: 'italic', margin: '0 auto 52px', maxWidth: 560, lineHeight: 1.9, letterSpacing: '0.04em' }}>
            "From the curated menu to custom décor and the perfect film, every detail of your special evening is crafted by our in-house experience designers."
          </p>
        </FadeIn>
        <div className="flex flex-wrap justify-center gap-3 mb-14">
          {occasions.map((o, i) => (
            <FadeIn key={o} delay={i * 0.06}>
              <span
                style={{ fontFamily: SERIF, fontSize: 'clamp(11px,1.6vw,13px)', letterSpacing: '0.32em', color: GOLD, border: '1px solid rgba(197,139,115,0.32)', padding: '10px 24px', textTransform: 'uppercase', display: 'block', transition: 'all 0.3s', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.background = 'rgba(197,139,115,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(197,139,115,0.32)'; e.currentTarget.style.background = 'transparent' }}
              >
                {o}
              </span>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={0.2}>
          <motion.button
            style={sCtaBtn}
            whileHover={{ scale: 1.04, borderColor: GOLD, color: LIGHT, boxShadow: '0 0 28px rgba(197,139,115,0.22)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => document.getElementById('reservation')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Plan Your Celebration
          </motion.button>
        </FadeIn>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — SIGNATURE TECHNOLOGY
// ─────────────────────────────────────────────────────────────────────────────

const specs = [
  { value: '4K UHD',  label: 'Laser Projection',  detail: 'Barco DP4K-60L · 25,000 Lumens' },
  { value: 'Dolby',   label: 'Atmos 3D Sound',     detail: '7.1.4 Surround · 128 Channels' },
  { value: '2.39:1',  label: 'CinemaScope Ratio',  detail: 'Full Anamorphic Wide Frame' },
  { value: 'JBL',     label: 'Screen Master',       detail: 'Precision Acoustic Chamber' },
  { value: '100%',    label: 'Blackout Seal',       detail: 'Zero Ambient Light Bleed' },
  { value: 'Italian', label: 'Leather Recliners',   detail: 'Motorised Power Seating' },
]

function TechSpecsSection() {
  return (
    <section id="technology" style={{ padding: 'clamp(72px,12vh,136px) clamp(20px,5vw,80px)', background: BG, borderTop: '1px solid rgba(197,139,115,0.1)' }}>
      <FadeIn>
        <p style={{ ...sEyebrow, textAlign: 'center', margin: '0 auto 14px' }}>The Technology</p>
        <h2 style={{ ...sSectionTitle, textAlign: 'center' }}>Signature Equipment</h2>
        <div style={{ ...sDivider, margin: '0 auto 60px' }} />
      </FadeIn>
      <div className="grid grid-cols-2 md:grid-cols-3 max-w-5xl mx-auto"
        style={{ gap: 1, background: 'rgba(197,139,115,0.12)' }}>
        {specs.map((s, i) => (
          <FadeIn key={s.label} delay={i * 0.07}>
            <div
              style={{ background: BG, padding: 'clamp(28px,3.8vw,48px)', textAlign: 'center', transition: 'background 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#0d0b14' }}
              onMouseLeave={e => { e.currentTarget.style.background = BG }}
            >
              <p style={{ fontFamily: SERIF, fontSize: 'clamp(32px,4.8vw,52px)', fontWeight: 300, color: GOLD, margin: '0 0 8px', letterSpacing: '-0.01em' }}>{s.value}</p>
              <p style={{ fontFamily: SERIF, fontSize: 'clamp(11px,1.4vw,14px)', letterSpacing: '0.26em', color: LIGHT, textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 400 }}>{s.label}</p>
              <p style={{ fontFamily: SERIF, fontSize: 'clamp(12px,1.2vw,13px)', color: MUTED, letterSpacing: '0.04em' }}>{s.detail}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — RESERVATION
// ─────────────────────────────────────────────────────────────────────────────

const CELEBRATION_TYPES = ['Birthday', 'Anniversary', 'Proposal', 'Corporate Screening', 'Film Premiere', 'Graduation', 'Private Gathering', 'Other']

const inputStyle = {
  fontFamily: SERIF,
  fontSize: 'clamp(14px,2vw,17px)',
  letterSpacing: '0.06em',
  color: LIGHT,
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid rgba(197,139,115,0.28)',
  padding: '13px 0',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.3s',
}

const EMPTY_FORM = { guestName: '', contactNumber: '', celebType: '', date: '', timeSlot: '', totalGuests: '' }

function ReservationSection({ authToken }) {
  const [form, setForm]               = useState(EMPTY_FORM)
  const [slots, setSlots]             = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [msg, setMsg]                 = useState(null)

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const onDateChange = async (e) => {
    const d = e.target.value
    setForm(f => ({ ...f, date: d, timeSlot: '' }))
    setSlots([])
    if (!d) return
    setSlotsLoading(true)
    try {
      const res  = await fetch(`${API_URL}/api/bookings/available-slots?date=${d}`)
      const data = await res.json()
      setSlots(data.availableSlots ?? [])
    } catch { setSlots([]) }
    finally { setSlotsLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.timeSlot) { setMsg({ type: 'error', text: 'Please select an available time slot.' }); return }
    setSubmitting(true); setMsg(null)
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST', headers,
        body: JSON.stringify({
          GuestName:       form.guestName,
          ContactNumber:   form.contactNumber,
          CelebrationType: form.celebType,
          Date:            form.date,
          TimeSlot:        form.timeSlot,
          TotalGuests:     parseInt(form.totalGuests, 10),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ type: 'success', text: 'Your reservation has been confirmed. We will contact you shortly.' })
        setForm(EMPTY_FORM); setSlots([])
      } else {
        setMsg({ type: 'error', text: data.error ?? 'Something went wrong. Please try again.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Unable to reach the server. Please try again later.' })
    } finally { setSubmitting(false) }
  }

  return (
    <section id="reservation" style={{ padding: 'clamp(72px,12vh,136px) clamp(20px,5vw,80px)', background: BG2, borderTop: '1px solid rgba(197,139,115,0.14)' }}>
      <div className="max-w-xl mx-auto text-center">
        <FadeIn>
          <p style={{ ...sEyebrow, margin: '0 auto 14px' }}>Get In Touch</p>
          <h2 style={{ ...sSectionTitle }}>Reserve Your Evening</h2>
          <div style={{ ...sDivider, margin: '0 auto 24px' }} />
          <p style={{ fontFamily: SERIF, fontSize: 'clamp(15px,2.2vw,18px)', color: MUTED, fontStyle: 'italic', margin: '0 auto 48px', lineHeight: 1.9, letterSpacing: '0.04em' }}>
            Enquire about private screening availability, bespoke event packages, and pricing tailored to your occasion.
          </p>
        </FadeIn>

        <FadeIn delay={0.12}>
          <form style={{ textAlign: 'left' }} onSubmit={handleSubmit}>
            <div style={{ marginBottom: 30 }}>
              <input required type="text" placeholder="Guest Name" style={inputStyle} value={form.guestName}
                onChange={set('guestName')}
                onFocus={e => { e.target.style.borderBottomColor = GOLD }}
                onBlur={e  => { e.target.style.borderBottomColor = 'rgba(197,139,115,0.28)' }} />
            </div>
            <div style={{ marginBottom: 30 }}>
              <input required type="tel" placeholder="Contact Number" style={inputStyle} value={form.contactNumber}
                onChange={set('contactNumber')}
                onFocus={e => { e.target.style.borderBottomColor = GOLD }}
                onBlur={e  => { e.target.style.borderBottomColor = 'rgba(197,139,115,0.28)' }} />
            </div>
            <div style={{ marginBottom: 30 }}>
              <select required style={{ ...inputStyle, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' }}
                value={form.celebType} onChange={set('celebType')}
                onFocus={e => { e.target.style.borderBottomColor = GOLD }}
                onBlur={e  => { e.target.style.borderBottomColor = 'rgba(197,139,115,0.28)' }}>
                <option value="" disabled>Occasion Type</option>
                {CELEBRATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 30 }}>
              <input required type="number" min="1" max="14" placeholder="Number of Guests" style={inputStyle} value={form.totalGuests}
                onChange={set('totalGuests')}
                onFocus={e => { e.target.style.borderBottomColor = GOLD }}
                onBlur={e  => { e.target.style.borderBottomColor = 'rgba(197,139,115,0.28)' }} />
            </div>
            <div style={{ marginBottom: 30 }}>
              <input required type="date" style={{ ...inputStyle, colorScheme: 'dark' }} value={form.date}
                onChange={onDateChange}
                min={new Date().toISOString().split('T')[0]}
                onFocus={e => { e.target.style.borderBottomColor = GOLD }}
                onBlur={e  => { e.target.style.borderBottomColor = 'rgba(197,139,115,0.28)' }} />
            </div>
            <div style={{ marginBottom: 36 }}>
              <select required
                style={{ ...inputStyle, cursor: form.date ? 'pointer' : 'not-allowed', opacity: form.date ? 1 : 0.45, WebkitAppearance: 'none', appearance: 'none' }}
                value={form.timeSlot} onChange={set('timeSlot')}
                disabled={!form.date || slotsLoading}
                onFocus={e => { e.target.style.borderBottomColor = GOLD }}
                onBlur={e  => { e.target.style.borderBottomColor = 'rgba(197,139,115,0.28)' }}>
                <option value="">
                  {!form.date ? 'Select a date first' : slotsLoading ? 'Checking availability…' : slots.length === 0 ? 'No slots available' : 'Select Time Slot'}
                </option>
                {slots.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <AnimatePresence>
              {msg && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ marginBottom: 24, padding: '14px 18px', border: `1px solid ${msg.type === 'success' ? 'rgba(197,139,115,0.5)' : 'rgba(180,80,80,0.4)'}`, background: msg.type === 'success' ? 'rgba(197,139,115,0.08)' : 'rgba(180,80,80,0.06)' }}>
                  <p style={{ fontFamily: SERIF, fontSize: 14, color: msg.type === 'success' ? GOLD : '#e08080', margin: 0, letterSpacing: '0.04em', fontStyle: 'italic' }}>
                    {msg.text}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button type="submit" disabled={submitting}
              style={{ ...sCtaBtn, width: '100%', textAlign: 'center', opacity: submitting ? 0.65 : 1 }}
              whileHover={!submitting ? { borderColor: GOLD, color: LIGHT, boxShadow: '0 0 28px rgba(197,139,115,0.22)' } : {}}
              whileTap={!submitting ? { scale: 0.98 } : {}}>
              {submitting ? 'Submitting…' : 'Submit Reservation'}
            </motion.button>
          </form>
        </FadeIn>

        <FadeIn delay={0.28}>
          <div style={{ marginTop: 56 }}>
            <p style={{ fontFamily: SERIF, fontSize: 12, letterSpacing: '0.28em', color: MUTED, textTransform: 'uppercase', marginBottom: 10 }}>
              Or Call Us Directly
            </p>
            <a href="tel:+910000000000"
              style={{ fontFamily: SERIF, fontSize: 'clamp(22px,3.5vw,30px)', color: GOLD, letterSpacing: '0.08em', textDecoration: 'none', fontWeight: 300 }}>
              +91 000 000 0000
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────────────────

const FOOTER_LINKS = [
  { label: 'Gallery',      id: 'suites' },
  { label: 'Packages',     id: 'celebrations' },
  { label: 'Technology',   id: 'technology' },
  { label: 'Reservations', id: 'reservation' },
]

function Footer() {
  return (
    <footer style={{ padding: '52px clamp(20px,5vw,80px)', background: '#030208', borderTop: '1px solid rgba(197,139,115,0.12)', textAlign: 'center' }}>
      <p style={{ fontFamily: SERIF, fontSize: 'clamp(20px,3vw,28px)', fontWeight: 300, letterSpacing: '0.3em', color: LIGHT, textTransform: 'uppercase', margin: '0 0 12px' }}>
        The Regal Cine
      </p>
      <div style={{ width: 32, height: 1, background: GOLD, opacity: 0.35, margin: '0 auto 16px' }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 28px', marginBottom: 20 }}>
        {FOOTER_LINKS.map(item => (
          <button key={item.id} onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })}
            style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: '0.28em', color: MUTED, textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.25s' }}
            onMouseEnter={e => { e.currentTarget.style.color = GOLD }}
            onMouseLeave={e => { e.currentTarget.style.color = MUTED }}>
            {item.label}
          </button>
        ))}
      </div>
      <p style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: '0.24em', color: 'rgba(138,122,114,0.65)', textTransform: 'uppercase' }}>
        © 2025 The Regal Cine · All Rights Reserved
      </p>
    </footer>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export default function RegalCineLanding({ navigate }) {
  const mouseRef = useRef({ x: 0, y: 0 })

  const [authState,     setAuthState]     = useState({ user: null, token: null })
  const [rippling,      setRippling]      = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  // Restore auth from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('regalcine_auth')
      if (saved) setAuthState(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  const handleAuth = useCallback((data) => setAuthState(data), [])

  const handleLogout = useCallback(() => {
    setAuthState({ user: null, token: null })
    localStorage.removeItem('regalcine_auth')
  }, [])

  const handleBookClick = useCallback(() => {
    setRippling(true)
    setTimeout(() => setRippling(false), 2400)
  }, [])

  // Mouse/touch tracking for 3D spotlight
  useEffect(() => {
    const onMouseMove = (e) => {
      mouseRef.current = { x: (e.clientX / window.innerWidth) * 2 - 1, y: -(e.clientY / window.innerHeight * 2 - 1) }
    }
    const onTouchMove = (e) => {
      const t = e.touches[0]; if (!t) return
      mouseRef.current = { x: (t.clientX / window.innerWidth) * 2 - 1, y: -(t.clientY / window.innerHeight * 2 - 1) }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  return (
    <div style={{ background: BG, overflowX: 'hidden' }}>

      {/* ── Top navbar ── */}
      <Navbar
        authState={authState}
        onLoginClick={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onAdminClick={() => navigate?.('admin')}
      />

      {/* ── Auth modal ── */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuth={handleAuth}
      />

      {/* ── Hero: 3D canvas + logo + text ── */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 7.5], fov: 48 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false }}
          style={{ position: 'absolute', inset: 0 }}>
          <Scene mouseRef={mouseRef} />
        </Canvas>
        <RegalLogoOverlay rippling={rippling} />
        <HeroOverlay onBookClick={handleBookClick} />
      </section>

      {/* ── Page sections ── */}
      <main>
        <ScreeningSuites />
        <CelebrationSection />
        <TechSpecsSection />
        <ReservationSection authToken={authState.token} />
        <Footer />
      </main>

    </div>
  )
}
