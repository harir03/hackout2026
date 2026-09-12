import { useState, useEffect, useRef } from 'react'
import VaporizeTextCycle, { Tag } from './ui/vapour-text-effect'
import { BlurText } from './ui/blur-text'

interface Meteor {
  x: number
  y: number
  length: number
  speed: number
  opacity: number
  width: number
}

type LoaderStep = 'text1_entrance' | 'text1_dissolve' | 'text2_entrance' | 'text2_dissolve'

export function AppLoader({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<LoaderStep>('text1_entrance')
  const [fade, setFade] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Handle the final app mount once the fade transition ends
  useEffect(() => {
    if (fade) {
      const completeTimeout = setTimeout(() => {
        onComplete()
      }, 1000) // 1-second fade out transition time
      return () => clearTimeout(completeTimeout)
    }
  }, [fade, onComplete])

  // Falling meteors background effect
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    // Initialize meteors
    const meteors: Meteor[] = []
    const meteorCount = 25

    for (let i = 0; i < meteorCount; i++) {
      meteors.push({
        x: Math.random() * width,
        y: Math.random() * height - height,
        length: Math.random() * 90 + 60,
        speed: Math.random() * 12 + 6,
        opacity: Math.random() * 0.4 + 0.4, // Brighter falling streaks
        width: Math.random() * 2.0 + 1.2,
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      // Draw meteors
      meteors.forEach((m) => {
        const gradient = ctx.createLinearGradient(m.x, m.y, m.x - m.length * 0.8, m.y - m.length * 0.8)
        gradient.addColorStop(0, `rgba(255, 255, 255, ${m.opacity})`)
        gradient.addColorStop(0.2, `rgba(150, 150, 150, ${m.opacity * 0.6})`)
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

        ctx.strokeStyle = gradient
        ctx.lineWidth = m.width
        ctx.beginPath()
        ctx.moveTo(m.x, m.y)
        ctx.lineTo(m.x - m.length * 0.8, m.y - m.length * 0.8)
        ctx.stroke()

        m.x += m.speed * 0.8
        m.y += m.speed * 0.8

        if (m.y > height + 100 || m.x > width + 100) {
          m.x = Math.random() * width - 200
          m.y = -150
          m.length = Math.random() * 90 + 60
          m.speed = Math.random() * 12 + 6
          m.opacity = Math.random() * 0.4 + 0.4
        }
      })

      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black transition-opacity duration-1000 ${
        fade ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Meteors canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Radial overlay to keep center dark and focused */}
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0.9)_100%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[900px] h-[250px] flex items-center justify-center px-6">
        {step === 'text1_entrance' && (
          <BlurText
            text="ONLINE BANKING FOR ALL"
            delay={140}
            animateBy="words"
            direction="bottom"
            className="text-4xl sm:text-5xl font-semibold tracking-wide text-white text-center justify-center"
            easing={(t) => t * t} // easeIn
            stepDuration={0.45}
            onAnimationComplete={() => {
              // Wait 1.2s before starting the vaporization effect
              setTimeout(() => setStep('text1_dissolve'), 1200)
            }}
            style={{ fontFamily: "'Chakra Petch', sans-serif" } as any}
          />
        )}

        {step === 'text1_dissolve' && (
          <VaporizeTextCycle
            texts={["ONLINE BANKING FOR ALL"]}
            font={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontSize: "48px",
              fontWeight: 600
            }}
            color="rgb(255, 255, 255)"
            spread={7}
            density={9}
            animation={{
              vaporizeDuration: 2.2, // Slower vaporization speed
            }}
            direction="left-to-right"
            alignment="center"
            tag={Tag.H1}
            onVaporizeComplete={() => {
              setStep('text2_entrance')
            }}
          />
        )}

        {step === 'text2_entrance' && (
          <BlurText
            text="BY ALTGRADE"
            delay={140}
            animateBy="words"
            direction="bottom"
            className="text-4xl sm:text-5xl font-semibold tracking-wide text-white text-center justify-center"
            easing={(t) => t * t} // easeIn
            stepDuration={0.45}
            onAnimationComplete={() => {
              // Wait 1.2s before starting the vaporization effect
              setTimeout(() => setStep('text2_dissolve'), 1200)
            }}
            style={{ fontFamily: "'Chakra Petch', sans-serif" } as any}
          />
        )}

        {step === 'text2_dissolve' && (
          <VaporizeTextCycle
            texts={["BY ALTGRADE"]}
            font={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontSize: "48px",
              fontWeight: 600
            }}
            color="rgb(255, 255, 255)"
            spread={7}
            density={9}
            animation={{
              vaporizeDuration: 2.2, // Slower vaporization speed
            }}
            direction="left-to-right"
            alignment="center"
            tag={Tag.H1}
            onVaporizeComplete={() => {
              setFade(true)
            }}
          />
        )}
      </div>
    </div>
  )
}
