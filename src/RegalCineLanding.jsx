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
const MUTED = '#a89c96'   // bumped from #7a6b63 for readability
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
// THREE.JS — SCENE ASSEMBLY
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
// SHARED STYLE OBJECTS  (updated for stronger visibility)
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
// HAMBURGER BUTTON
// ─────────────────────────────────────────────────────────────────────────────

function HamburgerButton({ open, onClick }) {
  const lineBase = {
    display: 'block',
    width: 22,
    height: 1.5,
    background: LIGHT,
    borderRadius: 2,
    transformOrigin: 'center',
    transition: 'transform 0.35s ease, opacity 0.25s ease',
  }
  return (
    <button
      onClick={onClick}
      aria-label={open ? 'Close menu' : 'Open menu'}
      style={{
        position: 'fixed', top: 24, left: 24, zIndex: 200,
        width: 44, height: 44,
        background: 'rgba(8,7,14,0.72)',
        border: '1px solid rgba(197,139,115,0.28)',
        borderRadius: 2,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 5,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: 0,
        outline: 'none',
        transition: 'border-color 0.3s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(197,139,115,0.28)' }}
    >
      <span style={{
        ...lineBase,
        transform: open ? 'translateY(6.5px) rotate(45deg)' : 'none',
      }} />
      <span style={{
        ...lineBase,
        opacity: open ? 0 : 1,
        transform: open ? 'scaleX(0)' : 'none',
      }} />
      <span style={{
        ...lineBase,
        transform: open ? 'translateY(-6.5px) rotate(-45deg)' : 'none',
      }} />
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR — AUTH SECTION
// ─────────────────────────────────────────────────────────────────────────────

function SidebarAuth({ authState, onAuth, onLogout }) {
  const [mode, setMode]       = useState(null)   // null | 'login' | 'register'
  const [form, setForm]       = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const sInput = {
    fontFamily: SERIF, fontSize: 14, letterSpacing: '0.06em',
    color: LIGHT, background: 'transparent',
    border: 'none', borderBottom: '1px solid rgba(197,139,115,0.28)',
    padding: '8px 0', width: '100%', outline: 'none',
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const endpoint = mode === 'login' ? 'login' : 'register'
      const res  = await fetch(`${API_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username.trim(), password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Authentication failed')

      let authData
      if (mode === 'register') {
        // Auto-login after registration
        const loginRes  = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: form.username.trim(), password: form.password }),
        })
        authData = await loginRes.json()
        if (!loginRes.ok) throw new Error(authData.error || 'Login failed after registration')
      } else {
        authData = data
      }

      onAuth({ user: authData.user, token: authData.token })
      localStorage.setItem('regalcine_auth', JSON.stringify({ user: authData.user, token: authData.token }))
      setMode(null); setForm({ username: '', password: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (authState.user) {
    return (
      <div style={{ borderTop: '1px solid rgba(197,139,115,0.14)', paddingTop: 20 }}>
        <p style={{ fontFamily: SERIF, fontSize: 10, letterSpacing: '0.36em', color: GOLD, textTransform: 'uppercase', margin: '0 0 4px' }}>
          {authState.user.role}
        </p>
        <p style={{ fontFamily: SERIF, fontSize: 16, color: LIGHT, margin: '0 0 14px', letterSpacing: '0.06em' }}>
          {authState.user.username}
        </p>
        <button
          onClick={onLogout}
          style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: '0.3em', color: MUTED, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textTransform: 'uppercase' }}
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div style={{ borderTop: '1px solid rgba(197,139,115,0.14)', paddingTop: 20 }}>
      <AnimatePresence mode="wait">
        {mode ? (
          <motion.form key="form" onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ type: 'tween', duration: 0.25 }}>
            <p style={{ fontFamily: SERIF, fontSize: 13, letterSpacing: '0.3em', color: GOLD, textTransform: 'uppercase', margin: '0 0 16px' }}>
              {mode === 'login' ? 'Sign In' : 'Register'}
            </p>
            {error && (
              <p style={{ fontFamily: SERIF, fontSize: 12, color: '#e07070', margin: '0 0 12px' }}>{error}</p>
            )}
            <div style={{ marginBottom: 12 }}>
              <input style={sInput} placeholder="Username" autoComplete="username"
                value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <input style={sInput} type="password" placeholder="Password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" disabled={loading}
                style={{ ...sCtaBtn, padding: '10px 18px', fontSize: 11, opacity: loading ? 0.6 : 1 }}>
                {loading ? '…' : mode === 'login' ? 'Sign In' : 'Register'}
              </button>
              <button type="button" onClick={() => { setMode(null); setError(null) }}
                style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: '0.2em', color: MUTED, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Cancel
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.div key="buttons" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ type: 'tween', duration: 0.2 }}>
            <p style={{ fontFamily: SERIF, fontSize: 10, letterSpacing: '0.36em', color: MUTED, textTransform: 'uppercase', margin: '0 0 12px' }}>
              Member Access
            </p>
            <div style={{ display: 'flex', gap: 16 }}>
              <button onClick={() => setMode('login')}
                style={{ fontFamily: SERIF, fontSize: 13, letterSpacing: '0.24em', color: GOLD, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textTransform: 'uppercase' }}>
                Sign In
              </button>
              <span style={{ color: 'rgba(197,139,115,0.3)', fontSize: 12 }}>·</span>
              <button onClick={() => setMode('register')}
                style={{ fontFamily: SERIF, fontSize: 13, letterSpacing: '0.24em', color: MUTED, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textTransform: 'uppercase' }}>
                Register
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR — MY RESERVATIONS PANEL
// ─────────────────────────────────────────────────────────────────────────────

function MyReservationsPanel({ token }) {
  const [open, setOpen]               = useState(false)
  const [reservations, setReservations] = useState([])
  const [loading, setLoading]         = useState(false)

  const fetch_ = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res  = await fetch(`${API_URL}/api/bookings/my-reservations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setReservations(await res.json())
    } finally {
      setLoading(false)
    }
  }, [token])

  const toggle = () => {
    if (!open) fetch_()
    setOpen(v => !v)
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={toggle}
        style={{ fontFamily: SERIF, fontSize: 'clamp(15px,2vw,17px)', letterSpacing: '0.18em', color: MUTED, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textTransform: 'uppercase', width: '100%', textAlign: 'left', transition: 'color 0.25s' }}
        onMouseEnter={e => { e.currentTarget.style.color = GOLD }}
        onMouseLeave={e => { e.currentTarget.style.color = MUTED }}>
        My Reservations
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ type: 'tween', duration: 0.3 }}
            style={{ overflow: 'hidden' }}>
            <div style={{ paddingTop: 10, paddingLeft: 12 }}>
              {loading && <p style={{ fontFamily: SERIF, fontSize: 12, color: MUTED }}>Loading…</p>}
              {!loading && reservations.length === 0 && (
                <p style={{ fontFamily: SERIF, fontSize: 12, color: MUTED, fontStyle: 'italic' }}>No reservations yet.</p>
              )}
              {reservations.map(r => (
                <div key={r.id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(197,139,115,0.1)' }}>
                  <p style={{ fontFamily: SERIF, fontSize: 13, color: GOLD, margin: '0 0 2px', letterSpacing: '0.06em' }}>
                    {r.date} · {r.timeSlot}
                  </p>
                  <p style={{ fontFamily: SERIF, fontSize: 12, color: MUTED, margin: 0 }}>
                    {r.guestName} · {r.totalGuests} guests
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR — MAIN DRAWER
// ─────────────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Home',         id: null },
  { label: 'Our Suites',   id: 'suites' },
  { label: 'Celebrations', id: 'celebrations' },
  { label: 'Technology',   id: 'technology' },
  { label: 'Reservations', id: 'reservation' },
]

function Sidebar({ open, onClose, authState, onAuth, onLogout }) {
  const scrollTo = (id) => {
    if (!id) window.scrollTo({ top: 0, behavior: 'smooth' })
    else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'tween', duration: 0.4, ease: 'easeOut' }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
          />

          {/* ── Drawer ── */}
          <motion.aside
            key="drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.4, ease: 'easeOut' }}
            style={{
              position: 'fixed', left: 0, top: 0, bottom: 0,
              width: 'clamp(280px, 82vw, 320px)',
              background: 'linear-gradient(180deg, #0c0b14 0%, #08070e 100%)',
              borderRight: '1px solid rgba(197,139,115,0.2)',
              zIndex: 150,
              padding: '88px 36px 40px',
              display: 'flex', flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            {/* Brand mark */}
            <div style={{ marginBottom: 44 }}>
              <p style={{ fontFamily: SERIF, fontSize: 9, letterSpacing: '0.6em', color: GOLD, textTransform: 'uppercase', margin: '0 0 8px', opacity: 0.8 }}>
                The Regal Cine
              </p>
              <div style={{ width: 28, height: 1, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1 }}>
              {NAV_LINKS.map((item, i) => (
                <motion.button key={item.label}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.07, type: 'tween', duration: 0.4, ease: 'easeOut' }}
                  onClick={() => scrollTo(item.id)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    fontFamily: SERIF, fontSize: 'clamp(17px,2.2vw,20px)',
                    letterSpacing: '0.2em', color: LIGHT,
                    background: 'none', border: 'none', borderBottom: '1px solid rgba(197,139,115,0.1)',
                    padding: '16px 0', cursor: 'pointer',
                    transition: 'color 0.25s, padding-left 0.25s',
                    textTransform: 'uppercase',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = GOLD; e.currentTarget.style.paddingLeft = '8px' }}
                  onMouseLeave={e => { e.currentTarget.style.color = LIGHT; e.currentTarget.style.paddingLeft = '0' }}
                >
                  {item.label}
                </motion.button>
              ))}

              {/* My Reservations — only when logged in */}
              {authState.user && (
                <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + NAV_LINKS.length * 0.07, type: 'tween', duration: 0.4, ease: 'easeOut' }}
                  style={{ borderBottom: '1px solid rgba(197,139,115,0.1)' }}>
                  <MyReservationsPanel token={authState.token} />
                </motion.div>
              )}
            </nav>

            {/* Contact hint */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.5, type: 'tween', duration: 0.5 }}
              style={{ margin: '28px 0' }}>
              <p style={{ fontFamily: SERIF, fontSize: 10, letterSpacing: '0.3em', color: MUTED, textTransform: 'uppercase', margin: '0 0 6px' }}>
                Enquiries
              </p>
              <a href="tel:+910000000000"
                style={{ fontFamily: SERIF, fontSize: 16, color: GOLD, textDecoration: 'none', letterSpacing: '0.06em' }}>
                +91 000 000 0000
              </a>
            </motion.div>

            {/* Auth section */}
            <SidebarAuth authState={authState} onAuth={onAuth} onLogout={onLogout} />
          </motion.aside>
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

      {/* Animated scroll cue */}
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
// REGAL LOGO IMAGE OVERLAY  (replaces Three.js Text3D R)
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
        {/* Floating logo */}
        <motion.img
          src={LOGO_URL}
          alt=""
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 'clamp(160px, 26vw, 300px)',
            height: 'clamp(160px, 26vw, 300px)',
            objectFit: 'contain',
            mixBlendMode: 'screen',
            display: 'block',
            userSelect: 'none',
            draggable: 'false',
          }}
        />

        {/* Ripple rings — triggered by "Book Your Experience" click */}
        <AnimatePresence>
          {rippling && [0, 1, 2, 3].map(i => (
            <motion.div
              key={i}
              initial={{ scale: 0.55, opacity: 0.85 }}
              animate={{ scale: 4.2, opacity: 0 }}
              exit={{}}
              transition={{ duration: 1.4, delay: i * 0.2, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                inset: 0,
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
              <p style={{ fontFamily: SERIF, fontSize: 'clamp(32px,4.8vw,52px)', fontWeight: 300, color: GOLD, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
                {s.value}
              </p>
              <p style={{ fontFamily: SERIF, fontSize: 'clamp(11px,1.4vw,14px)', letterSpacing: '0.26em', color: LIGHT, textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 400 }}>
                {s.label}
              </p>
              <p style={{ fontFamily: SERIF, fontSize: 'clamp(12px,1.2vw,13px)', color: MUTED, letterSpacing: '0.04em' }}>
                {s.detail}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — RESERVATION  (connected to backend)
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
  const [form, setForm]             = useState(EMPTY_FORM)
  const [slots, setSlots]           = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg]               = useState(null)   // { type: 'success'|'error', text }

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
    } catch {
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
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
    } finally {
      setSubmitting(false)
    }
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

            {/* Guest Name */}
            <div style={{ marginBottom: 30 }}>
              <input required type="text" placeholder="Guest Name" style={inputStyle} value={form.guestName}
                onChange={set('guestName')}
                onFocus={e => { e.target.style.borderBottomColor = GOLD }}
                onBlur={e  => { e.target.style.borderBottomColor = 'rgba(197,139,115,0.28)' }} />
            </div>

            {/* Contact Number */}
            <div style={{ marginBottom: 30 }}>
              <input required type="tel" placeholder="Contact Number" style={inputStyle} value={form.contactNumber}
                onChange={set('contactNumber')}
                onFocus={e => { e.target.style.borderBottomColor = GOLD }}
                onBlur={e  => { e.target.style.borderBottomColor = 'rgba(197,139,115,0.28)' }} />
            </div>

            {/* Occasion Type */}
            <div style={{ marginBottom: 30 }}>
              <select required style={{ ...inputStyle, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' }}
                value={form.celebType} onChange={set('celebType')}
                onFocus={e => { e.target.style.borderBottomColor = GOLD }}
                onBlur={e  => { e.target.style.borderBottomColor = 'rgba(197,139,115,0.28)' }}>
                <option value="" disabled>Occasion Type</option>
                {CELEBRATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Number of Guests */}
            <div style={{ marginBottom: 30 }}>
              <input required type="number" min="1" max="14" placeholder="Number of Guests" style={inputStyle} value={form.totalGuests}
                onChange={set('totalGuests')}
                onFocus={e => { e.target.style.borderBottomColor = GOLD }}
                onBlur={e  => { e.target.style.borderBottomColor = 'rgba(197,139,115,0.28)' }} />
            </div>

            {/* Date */}
            <div style={{ marginBottom: 30 }}>
              <input required type="date" style={{ ...inputStyle, colorScheme: 'dark' }} value={form.date}
                onChange={onDateChange}
                min={new Date().toISOString().split('T')[0]}
                onFocus={e => { e.target.style.borderBottomColor = GOLD }}
                onBlur={e  => { e.target.style.borderBottomColor = 'rgba(197,139,115,0.28)' }} />
            </div>

            {/* Time Slot — populated from API */}
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

            {/* Status message */}
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
            <a href="tel:+918892615477"
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

function Footer() {
  return (
    <footer style={{ padding: '52px clamp(20px,5vw,80px)', background: '#030208', borderTop: '1px solid rgba(197,139,115,0.12)', textAlign: 'center' }}>
      <p style={{ fontFamily: SERIF, fontSize: 'clamp(20px,3vw,28px)', fontWeight: 300, letterSpacing: '0.3em', color: LIGHT, textTransform: 'uppercase', margin: '0 0 12px' }}>
        The Regal Cine
      </p>
      <div style={{ width: 32, height: 1, background: GOLD, opacity: 0.35, margin: '0 auto 16px' }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 28px', marginBottom: 20 }}>
        {NAV_LINKS.slice(1).map(item => (
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

export default function RegalCineLanding() {
  const mouseRef = useRef({ x: 0, y: 0 })

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authState, setAuthState]     = useState({ user: null, token: null })
  const [rippling, setRippling]       = useState(false)

  // Restore auth from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('regalcine_auth')
      if (saved) setAuthState(JSON.parse(saved))
    } catch { /* ignore corrupt data */ }
  }, [])

  const handleAuth   = useCallback((data) => setAuthState(data), [])
  const handleLogout = useCallback(() => {
    setAuthState({ user: null, token: null })
    localStorage.removeItem('regalcine_auth')
  }, [])

  const handleBookClick = useCallback(() => {
    setRippling(true)
    setTimeout(() => setRippling(false), 2400)
  }, [])

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

      {/* ── Fixed hamburger — always visible above everything ── */}
      <HamburgerButton open={sidebarOpen} onClick={() => setSidebarOpen(v => !v)} />

      {/* ── Collapsible sidebar ── */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        authState={authState}
        onAuth={handleAuth}
        onLogout={handleLogout}
      />

      {/* ── Hero: 3D canvas + logo image + text overlay ── */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 7.5], fov: 48 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false }}
          style={{ position: 'absolute', inset: 0 }}>
          <Scene mouseRef={mouseRef} />
        </Canvas>
        <RegalLogoOverlay rippling={rippling} />
        <HeroOverlay onBookClick={handleBookClick} />
      </section>

      {/* ── Scrollable content sections ── */}
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
