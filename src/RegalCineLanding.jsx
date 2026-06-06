import { useRef, useEffect, Suspense, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text3D, Float } from '@react-three/drei'
import { motion, useInView } from 'framer-motion'
import * as THREE from 'three'

const FONT_URL = `${import.meta.env.BASE_URL}fonts/helvetiker_regular.typeface.json`

// ─── Design tokens ────────────────────────────────────────────────────────────
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif"
const GOLD  = '#c58b73'
const LIGHT = '#f5ede6'
const MUTED = '#7a6b63'
const BG    = '#08070e'
const BG2   = '#050409'

// ─────────────────────────────────────────────────────────────────────────────
// THREE.JS — PARTICLE FIELD
// ─────────────────────────────────────────────────────────────────────────────

function CinemaDustParticles() {
  const COUNT = 420

  // Build geometry and per-particle metadata once
  const { geo, base, meta } = useMemo(() => {
    const base = new Float32Array(COUNT * 3)
    const meta = new Float32Array(COUNT * 2) // [speed, phase]
    for (let i = 0; i < COUNT; i++) {
      base[i * 3]     = (Math.random() - 0.5) * 26
      base[i * 3 + 1] = (Math.random() - 0.5) * 15
      base[i * 3 + 2] = (Math.random() - 0.5) * 10 - 1
      meta[i * 2]     = 0.035 + Math.random() * 0.09
      meta[i * 2 + 1] = Math.random() * Math.PI * 2
    }
    const geo = new THREE.BufferGeometry()
    // working copy — base holds the rest positions, geo.position is mutated each frame
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
      <pointsMaterial
        size={0.048}
        color="#c99060"
        transparent
        opacity={0.40}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// THREE.JS — SCROLL PARALLAX WRAPPER
// Sits outside <Float> so Float's idle oscillation composes cleanly on top.
// ─────────────────────────────────────────────────────────────────────────────

function ScrollParallaxGroup({ scrollRef, children }) {
  const groupRef = useRef()

  useFrame(() => {
    if (!groupRef.current) return
    const progress = Math.min(Math.max(scrollRef.current / window.innerHeight, 0), 1)

    const tScale = 1 - progress * 0.86          // collapses to ~0.14×
    const tRotZ  = progress * Math.PI * 0.72    // 130° spin
    const tPosY  = progress * -5.8              // falls below frame

    const g = groupRef.current
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, tScale, 0.07))
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, tRotZ, 0.07)
    g.position.y = THREE.MathUtils.lerp(g.position.y, tPosY, 0.07)
  })

  return <group ref={groupRef}>{children}</group>
}

// ─────────────────────────────────────────────────────────────────────────────
// THREE.JS — REGAL LOGO MESH
// ─────────────────────────────────────────────────────────────────────────────

function RegalLogoMesh() {
  const meshRef = useRef()

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.elapsedTime
    meshRef.current.rotation.y = Math.sin(t * 0.28) * 0.42
    meshRef.current.rotation.x = Math.sin(t * 0.19) * 0.09
  })

  return (
    <Text3D
      ref={meshRef}
      font={FONT_URL}
      size={2.2}
      height={0.55}
      curveSegments={16}
      bevelEnabled
      bevelThickness={0.07}
      bevelSize={0.04}
      bevelOffset={0}
      bevelSegments={10}
      position={[-1.3, -1.15, 0]}
    >
      R
      <meshPhysicalMaterial
        color="#c58b73"
        metalness={0.95}
        roughness={0.2}
        envMapIntensity={0.8}
        clearcoat={0.9}
        clearcoatRoughness={0.1}
        reflectivity={1}
      />
    </Text3D>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// THREE.JS — TRACKING SPOTLIGHT
// ─────────────────────────────────────────────────────────────────────────────

function TrackingSpotlight({ mouseRef }) {
  const spotRef = useRef()

  useFrame(() => {
    if (!spotRef.current) return
    spotRef.current.position.x = THREE.MathUtils.lerp(
      spotRef.current.position.x, mouseRef.current.x * 10, 0.04
    )
    spotRef.current.position.y = THREE.MathUtils.lerp(
      spotRef.current.position.y, mouseRef.current.y * 6 + 5, 0.04
    )
  })

  return (
    <spotLight
      ref={spotRef}
      position={[0, 8, 6]}
      intensity={160}
      angle={0.3}
      penumbra={0.88}
      color="#ffd9bf"
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// THREE.JS — SCENE ASSEMBLY
// ─────────────────────────────────────────────────────────────────────────────

function Scene({ mouseRef, scrollRef }) {
  return (
    <>
      <color attach="background" args={['#08070e']} />
      <ambientLight intensity={0.2} />
      <rectAreaLight position={[0, 1, 5]} intensity={5} width={10} height={7} color="#fff5ee" />
      <spotLight position={[-6, 3, 4]} intensity={38} angle={0.55} penumbra={1} color="#a07fc0" />
      <spotLight position={[6, 2, 3]} intensity={28} angle={0.6} penumbra={1} color="#c58b73" />
      <TrackingSpotlight mouseRef={mouseRef} />
      <CinemaDustParticles />
      <Suspense fallback={null}>
        <ScrollParallaxGroup scrollRef={scrollRef}>
          <Float speed={1.3} rotationIntensity={0.22} floatIntensity={0.55} floatingRange={[-0.1, 0.1]}>
            <RegalLogoMesh />
          </Float>
        </ScrollParallaxGroup>
      </Suspense>
    </>
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
  hidden:   { opacity: 0, y: 28 },
  visible:  { opacity: 1, y: 0, transition: { duration: 1.05, ease: [0.22, 1, 0.36, 1] } },
}

function HeroOverlay() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-end',
      padding: '0 clamp(16px,5vw,48px) clamp(44px,9vh,88px)',
    }}>
      <motion.div
        variants={heroContainer} initial="hidden" animate="visible"
        style={{ textAlign: 'center', width: '100%', maxWidth: 660 }}
      >
        <motion.p variants={heroItem} style={sEyebrow}>
          Premium Cinematic Experience
        </motion.p>
        <motion.h1 variants={heroItem} style={{ fontFamily: SERIF, fontSize: 'clamp(30px,7.5vw,76px)', fontWeight: 300, letterSpacing: '0.22em', color: LIGHT, margin: 0, textTransform: 'uppercase', lineHeight: 1.04 }}>
          The Regal Cine
        </motion.h1>
        <motion.div variants={heroItem} style={sDivider} />
        <motion.p variants={heroItem} style={{ fontFamily: SERIF, fontSize: 'clamp(13px,3.5vw,18px)', letterSpacing: '0.12em', color: MUTED, margin: '0 0 clamp(24px,5vw,36px)', fontStyle: 'italic' }}>
          Where Cinema Meets Luxury
        </motion.p>
        <motion.button
          variants={heroItem}
          whileHover={{ scale: 1.04, borderColor: GOLD, color: LIGHT, boxShadow: '0 0 30px rgba(197,139,115,0.22)' }}
          whileTap={{ scale: 0.97 }}
          style={{ ...sCtaBtn, pointerEvents: 'all' }}
          onClick={() => document.getElementById('reservation')?.scrollIntoView({ behavior: 'smooth' })}
        >
          Book Experience
        </motion.button>
      </motion.div>

      {/* Animated scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8, duration: 1.2 }}
        style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none' }}
      >
        <p style={{ fontFamily: SERIF, fontSize: 9, letterSpacing: '0.5em', color: GOLD, textTransform: 'uppercase', opacity: 0.55, margin: 0 }}>Scroll</p>
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 1, height: 36, background: `linear-gradient(to bottom, ${GOLD}, transparent)` }}
        />
      </motion.div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STYLE OBJECTS
// ─────────────────────────────────────────────────────────────────────────────

const sEyebrow = { fontFamily: SERIF, fontSize: 'clamp(10px,2.5vw,12px)', letterSpacing: '0.46em', color: GOLD, margin: '0 0 14px', textTransform: 'uppercase' }
const sDivider = { width: 58, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, margin: '18px auto' }
const sSectionTitle = { fontFamily: SERIF, fontSize: 'clamp(26px,5vw,52px)', fontWeight: 300, letterSpacing: '0.15em', color: LIGHT, textTransform: 'uppercase', margin: '0 0 16px' }
const sCtaBtn = { fontFamily: SERIF, fontSize: 'clamp(11px,2.8vw,13px)', letterSpacing: '0.36em', color: GOLD, background: 'transparent', border: `1px solid rgba(197,139,115,0.42)`, padding: 'clamp(12px,3vw,14px) clamp(30px,8vw,52px)', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.35s ease', outline: 'none' }

// ─────────────────────────────────────────────────────────────────────────────
// SCROLL ENTRANCE WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

function FadeIn({ children, delay = 0, y = 26, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-70px 0px' })
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.88, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
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
        style={{ border: '1px solid rgba(197,139,115,0.16)', padding: 'clamp(24px,3vw,40px)', height: '100%', transition: 'border-color 0.35s ease' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(197,139,115,0.5)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(197,139,115,0.16)' }}
      >
        <p style={{ ...sEyebrow, fontSize: 10, margin: '0 0 22px' }}>{suite.tag}</p>
        <h3 style={{ fontFamily: SERIF, fontSize: 'clamp(22px,3vw,32px)', fontWeight: 300, color: LIGHT, margin: '0 0 6px', letterSpacing: '0.08em' }}>
          {suite.name}
        </h3>
        <p style={{ fontFamily: SERIF, fontSize: 14, color: GOLD, letterSpacing: '0.12em', margin: '0 0 26px' }}>
          {suite.capacity}
        </p>
        <div style={{ width: 30, height: 1, background: GOLD, opacity: 0.45, margin: '0 0 26px' }} />
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {suite.features.map(f => (
            <li key={f} style={{ fontFamily: SERIF, fontSize: 'clamp(13px,1.5vw,15px)', color: MUTED, padding: '7px 0', borderBottom: '1px solid rgba(197,139,115,0.08)', letterSpacing: '0.04em' }}>
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
    <section style={{ padding: 'clamp(64px,11vh,128px) clamp(20px,5vw,80px)', background: BG }}>
      <FadeIn>
        <p style={{ ...sEyebrow, textAlign: 'center', margin: '0 auto 12px' }}>Our Venues</p>
        <h2 style={{ ...sSectionTitle, textAlign: 'center' }}>Private Screening Suites</h2>
        <div style={{ ...sDivider, margin: '0 auto 16px' }} />
        <p style={{ fontFamily: SERIF, fontSize: 'clamp(14px,2vw,17px)', color: MUTED, textAlign: 'center', margin: '0 auto 56px', maxWidth: 500, fontStyle: 'italic', lineHeight: 1.8, letterSpacing: '0.04em' }}>
          Three distinct spaces, each engineered for absolute cinematic immersion.
        </p>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto">
        {suites.map((s, i) => <SuiteCardSimple key={s.name} suite={s} delay={i * 0.11} />)}
      </div>

      <FadeIn delay={0.25}>
        <div style={{ textAlign: 'center', marginTop: 52 }}>
          <button
            style={sCtaBtn}
            onClick={() => document.getElementById('reservation')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Enquire Now
          </button>
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
    <section style={{ padding: 'clamp(64px,11vh,128px) clamp(20px,5vw,80px)', background: BG2, borderTop: '1px solid rgba(197,139,115,0.1)' }}>
      <div className="max-w-3xl mx-auto text-center">
        <FadeIn>
          <p style={{ ...sEyebrow, margin: '0 auto 12px' }}>Bespoke Events</p>
          <h2 style={{ ...sSectionTitle }}>Your Celebration, Elevated</h2>
          <div style={{ ...sDivider, margin: '0 auto 24px' }} />
          <p style={{ fontFamily: SERIF, fontSize: 'clamp(15px,2.2vw,19px)', color: MUTED, fontStyle: 'italic', margin: '0 auto 48px', maxWidth: 560, lineHeight: 1.85, letterSpacing: '0.04em' }}>
            "From the curated menu to custom décor and the perfect film, every detail of your special evening is crafted by our in-house experience designers."
          </p>
        </FadeIn>

        <div className="flex flex-wrap justify-center gap-3 mb-14">
          {occasions.map((o, i) => (
            <FadeIn key={o} delay={i * 0.06}>
              <span style={{ fontFamily: SERIF, fontSize: 'clamp(10px,1.6vw,12px)', letterSpacing: '0.32em', color: GOLD, border: '1px solid rgba(197,139,115,0.28)', padding: '9px 22px', textTransform: 'uppercase', display: 'block', transition: 'border-color 0.3s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(197,139,115,0.28)' }}
              >
                {o}
              </span>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.2}>
          <button
            style={sCtaBtn}
            onClick={() => document.getElementById('reservation')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Plan Your Celebration
          </button>
        </FadeIn>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — SIGNATURE TECHNOLOGY
// ─────────────────────────────────────────────────────────────────────────────

const specs = [
  { value: '4K UHD',  label: 'Laser Projection',   detail: 'Barco DP4K-60L · 25,000 Lumens' },
  { value: 'Dolby',   label: 'Atmos 3D Sound',      detail: '7.1.4 Surround · 128 Channels' },
  { value: '2.39:1',  label: 'CinemaScope Ratio',   detail: 'Full Anamorphic Wide Frame' },
  { value: 'JBL',     label: 'Screen Master',        detail: 'Precision Acoustic Chamber' },
  { value: '100%',    label: 'Blackout Seal',        detail: 'Zero Ambient Light Bleed' },
  { value: 'Italian', label: 'Leather Recliners',    detail: 'Motorised Power Seating' },
]

function TechSpecsSection() {
  return (
    <section style={{ padding: 'clamp(64px,11vh,128px) clamp(20px,5vw,80px)', background: BG, borderTop: '1px solid rgba(197,139,115,0.1)' }}>
      <FadeIn>
        <p style={{ ...sEyebrow, textAlign: 'center', margin: '0 auto 12px' }}>The Technology</p>
        <h2 style={{ ...sSectionTitle, textAlign: 'center' }}>Signature Equipment</h2>
        <div style={{ ...sDivider, margin: '0 auto 56px' }} />
      </FadeIn>

      {/* Grid cells separated by 1px amber lines */}
      <div
        className="grid grid-cols-2 md:grid-cols-3 max-w-5xl mx-auto"
        style={{ gap: 1, background: 'rgba(197,139,115,0.12)' }}
      >
        {specs.map((s, i) => (
          <FadeIn key={s.label} delay={i * 0.07}>
            <div
              style={{ background: BG, padding: 'clamp(26px,3.5vw,44px)', textAlign: 'center', transition: 'background 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#0d0b14' }}
              onMouseLeave={e => { e.currentTarget.style.background = BG }}
            >
              <p style={{ fontFamily: SERIF, fontSize: 'clamp(30px,4.5vw,46px)', fontWeight: 300, color: GOLD, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
                {s.value}
              </p>
              <p style={{ fontFamily: SERIF, fontSize: 'clamp(10px,1.4vw,13px)', letterSpacing: '0.26em', color: LIGHT, textTransform: 'uppercase', margin: '0 0 8px' }}>
                {s.label}
              </p>
              <p style={{ fontFamily: SERIF, fontSize: 'clamp(11px,1.2vw,12px)', color: MUTED, letterSpacing: '0.04em' }}>
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
// SECTION 4 — RESERVATION
// ─────────────────────────────────────────────────────────────────────────────

const inputStyle = {
  fontFamily: SERIF,
  fontSize: 'clamp(14px,2vw,16px)',
  letterSpacing: '0.06em',
  color: LIGHT,
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid rgba(197,139,115,0.22)',
  padding: '12px 0',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.3s',
}

function ReservationSection() {
  return (
    <section id="reservation" style={{ padding: 'clamp(64px,11vh,128px) clamp(20px,5vw,80px)', background: BG2, borderTop: '1px solid rgba(197,139,115,0.14)' }}>
      <div className="max-w-lg mx-auto text-center">
        <FadeIn>
          <p style={{ ...sEyebrow, margin: '0 auto 12px' }}>Get In Touch</p>
          <h2 style={{ ...sSectionTitle }}>Reserve Your Evening</h2>
          <div style={{ ...sDivider, margin: '0 auto 22px' }} />
          <p style={{ fontFamily: SERIF, fontSize: 'clamp(14px,2vw,17px)', color: MUTED, fontStyle: 'italic', margin: '0 auto 44px', lineHeight: 1.85, letterSpacing: '0.04em' }}>
            Enquire about private screening availability, bespoke event packages, and pricing tailored to your occasion.
          </p>
        </FadeIn>

        <FadeIn delay={0.12}>
          <form
            style={{ textAlign: 'left' }}
            onSubmit={e => {
              e.preventDefault()
              alert('Thank you. We will be in touch shortly.')
            }}
          >
            {[
              { name: 'name',   placeholder: 'Your Name',         type: 'text'  },
              { name: 'email',  placeholder: 'Email Address',      type: 'email' },
              { name: 'date',   placeholder: 'Preferred Date',     type: 'text'  },
              { name: 'guests', placeholder: 'Number of Guests',   type: 'text'  },
            ].map(f => (
              <div key={f.name} style={{ marginBottom: 28 }}>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  style={inputStyle}
                  onFocus={e  => { e.target.style.borderBottomColor = GOLD }}
                  onBlur={e   => { e.target.style.borderBottomColor = 'rgba(197,139,115,0.22)' }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 32 }}>
              <select
                defaultValue=""
                style={{ ...inputStyle, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' }}
                onFocus={e  => { e.target.style.borderBottomColor = GOLD }}
                onBlur={e   => { e.target.style.borderBottomColor = 'rgba(197,139,115,0.22)' }}
              >
                <option value="" disabled style={{ background: BG2 }}>Select a Suite</option>
                <option value="premiere"  style={{ background: BG2 }}>The Premiere · Up to 14</option>
                <option value="director"  style={{ background: BG2 }}>Director's Cut · Up to 8</option>
                <option value="auteur"    style={{ background: BG2 }}>The Auteur · Up to 4</option>
              </select>
            </div>

            <button
              type="submit"
              style={{ ...sCtaBtn, width: '100%', textAlign: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = LIGHT }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(197,139,115,0.42)'; e.currentTarget.style.color = GOLD }}
            >
              Submit Request
            </button>
          </form>
        </FadeIn>

        <FadeIn delay={0.28}>
          <div style={{ marginTop: 52 }}>
            <p style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: '0.28em', color: MUTED, textTransform: 'uppercase', marginBottom: 10 }}>
              Or Call Us Directly
            </p>
            <a
              href="tel:+910000000000"
              style={{ fontFamily: SERIF, fontSize: 'clamp(20px,3.5vw,28px)', color: GOLD, letterSpacing: '0.08em', textDecoration: 'none', fontWeight: 300 }}
            >
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
    <footer style={{ padding: '44px clamp(20px,5vw,80px)', background: '#030208', borderTop: '1px solid rgba(197,139,115,0.1)', textAlign: 'center' }}>
      <p style={{ fontFamily: SERIF, fontSize: 'clamp(18px,3vw,26px)', fontWeight: 300, letterSpacing: '0.3em', color: LIGHT, textTransform: 'uppercase', margin: '0 0 10px' }}>
        The Regal Cine
      </p>
      <div style={{ width: 32, height: 1, background: GOLD, opacity: 0.35, margin: '0 auto 14px' }} />
      <p style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: '0.28em', color: MUTED, textTransform: 'uppercase' }}>
        © 2024 The Regal Cine · All Rights Reserved
      </p>
    </footer>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export default function RegalCineLanding() {
  const mouseRef  = useRef({ x: 0, y: 0 })
  const scrollRef = useRef(0)

  useEffect(() => {
    const onMouseMove = (e) => {
      mouseRef.current = {
        x:  (e.clientX / window.innerWidth)  * 2 - 1,
        y: -(e.clientY / window.innerHeight  * 2 - 1),
      }
    }
    const onTouchMove = (e) => {
      const t = e.touches[0]
      if (!t) return
      mouseRef.current = {
        x:  (t.clientX / window.innerWidth)  * 2 - 1,
        y: -(t.clientY / window.innerHeight  * 2 - 1),
      }
    }
    const onScroll = () => { scrollRef.current = window.scrollY }

    window.addEventListener('mousemove',  onMouseMove)
    window.addEventListener('touchmove',  onTouchMove,  { passive: true })
    window.addEventListener('scroll',     onScroll,     { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('scroll',    onScroll)
    }
  }, [])

  return (
    <div style={{ background: BG, overflowX: 'hidden' }}>

      {/* ── Hero ── 3D canvas lives entirely within this 100vh section */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 0, 7.5], fov: 48 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Scene mouseRef={mouseRef} scrollRef={scrollRef} />
        </Canvas>
        <HeroOverlay />
      </section>

      {/* ── Scrollable content sections ── */}
      <main>
        <ScreeningSuites />
        <CelebrationSection />
        <TechSpecsSection />
        <ReservationSection />
        <Footer />
      </main>

    </div>
  )
}
