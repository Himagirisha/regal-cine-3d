import { useRef, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text3D, Environment, Float } from '@react-three/drei'
import { motion } from 'framer-motion'
import * as THREE from 'three'

// ─── Rose-gold 'R' with physical material ────────────────────────────────────

function LetterR() {
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
      font="https://threejs.org/examples/fonts/helvetiker_regular.typeface.json"
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
        roughness={0.18}
        envMapIntensity={3.5}
        clearcoat={0.9}
        clearcoatRoughness={0.1}
        iridescence={0.3}
        iridescenceIOR={1.9}
        reflectivity={1}
      />
    </Text3D>
  )
}

// ─── Spotlight that smoothly chases the cursor / touch ───────────────────────

function TrackingSpotlight({ mouseRef }) {
  const spotRef = useRef()

  useFrame(() => {
    if (!spotRef.current) return
    spotRef.current.position.x = THREE.MathUtils.lerp(
      spotRef.current.position.x,
      mouseRef.current.x * 10,
      0.04
    )
    spotRef.current.position.y = THREE.MathUtils.lerp(
      spotRef.current.position.y,
      mouseRef.current.y * 6 + 5,
      0.04
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

// ─── Three.js scene ──────────────────────────────────────────────────────────

function Scene({ mouseRef }) {
  return (
    <>
      <color attach="background" args={['#08070e']} />

      {/* Ambient fill — very subtle */}
      <ambientLight intensity={0.06} />

      {/* Static accent lights for depth */}
      <spotLight
        position={[-6, 3, 4]}
        intensity={28}
        angle={0.55}
        penumbra={1}
        color="#a07fc0"
      />
      <spotLight
        position={[6, 2, 3]}
        intensity={18}
        angle={0.6}
        penumbra={1}
        color="#c58b73"
      />

      {/* Mouse-tracking key light */}
      <TrackingSpotlight mouseRef={mouseRef} />

      {/* HDR environment for metallic reflections */}
      <Environment preset="studio" />

      {/* Floating, gently oscillating letter */}
      <Suspense fallback={null}>
        <Float
          speed={1.3}
          rotationIntensity={0.22}
          floatIntensity={0.55}
          floatingRange={[-0.1, 0.1]}
        >
          <LetterR />
        </Float>
      </Suspense>
    </>
  )
}

// ─── Framer-motion text overlay ───────────────────────────────────────────────

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.24, delayChildren: 0.5 },
  },
}

const item = {
  hidden: { opacity: 0, y: 26, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 1.05, ease: [0.22, 1, 0.36, 1] },
  },
}

function Overlay() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        pointerEvents: 'none',
        padding: '0 clamp(16px, 5vw, 48px) clamp(36px, 8vh, 72px)',
      }}
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        style={{ textAlign: 'center', width: '100%', maxWidth: 660 }}
      >
        {/* Eyebrow label */}
        <motion.p
          variants={item}
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 'clamp(9px, 1.1vw, 12px)',
            letterSpacing: '0.48em',
            color: '#c58b73',
            margin: '0 0 14px',
            textTransform: 'uppercase',
          }}
        >
          Premium Cinematic Experience
        </motion.p>

        {/* Primary title */}
        <motion.h1
          variants={item}
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 'clamp(26px, 5.8vw, 70px)',
            fontWeight: 300,
            letterSpacing: '0.24em',
            color: '#f5ede6',
            margin: 0,
            textTransform: 'uppercase',
            lineHeight: 1.05,
          }}
        >
          The Regal Cine
        </motion.h1>

        {/* Decorative rule */}
        <motion.div
          variants={item}
          style={{
            width: 58,
            height: 1,
            background:
              'linear-gradient(90deg, transparent, #c58b73, transparent)',
            margin: '18px auto',
          }}
        />

        {/* Subtitle */}
        <motion.p
          variants={item}
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 'clamp(11px, 1.6vw, 17px)',
            letterSpacing: '0.14em',
            color: '#7a6b63',
            margin: '0 0 clamp(22px, 4vw, 34px)',
            fontStyle: 'italic',
          }}
        >
          Where Cinema Meets Luxury
        </motion.p>

        {/* CTA */}
        <motion.button
          variants={item}
          whileHover={{
            scale: 1.04,
            borderColor: '#c58b73',
            color: '#f5ede6',
            boxShadow: '0 0 30px rgba(197, 139, 115, 0.22)',
          }}
          whileTap={{ scale: 0.97 }}
          style={{
            pointerEvents: 'all',
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 'clamp(10px, 1.2vw, 13px)',
            letterSpacing: '0.38em',
            color: '#c58b73',
            background: 'transparent',
            border: '1px solid rgba(197, 139, 115, 0.42)',
            padding: 'clamp(10px, 1.6vw, 14px) clamp(28px, 4.5vw, 52px)',
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'all 0.35s ease',
            outline: 'none',
          }}
        >
          Book Experience
        </motion.button>
      </motion.div>
    </div>
  )
}

// ─── Root export ─────────────────────────────────────────────────────────────

export default function RegalCineLanding() {
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMouseMove = (e) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight * 2 - 1),
      }
    }
    const onTouchMove = (e) => {
      const t = e.touches[0]
      if (!t) return
      mouseRef.current = {
        x: (t.clientX / window.innerWidth) * 2 - 1,
        y: -(t.clientY / window.innerHeight * 2 - 1),
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100svh',
        overflow: 'hidden',
        background: '#08070e',
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0, 7.5], fov: 48 }}
        gl={{ antialias: true, alpha: false }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Scene mouseRef={mouseRef} />
      </Canvas>

      <Overlay />
    </div>
  )
}
