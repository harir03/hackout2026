import { useEffect, useRef, useState } from 'react'

export default function ModernLoginSignup() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLogin, setIsLogin] = useState(true)

  useEffect(() => {
    let active = true
    let renderer: any
    let geometry: any
    let material: any
    let scene: any
    let camera: any
    let animationId: number
    let removeResizeListener: (() => void) | null = null

    const initThree = (THREE: any) => {
      if (!canvasRef.current || !active) return
      const canvas = canvasRef.current
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false })
      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.setSize(window.innerWidth, window.innerHeight)

      scene = new THREE.Scene()
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

      const uniforms = {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(window.innerWidth * 2, window.innerHeight * 2) },
        u_opacities: { value: [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1.0] },
        u_colors: {
          value: [
            new THREE.Vector3(1, 1, 1),
            new THREE.Vector3(0.6, 0.6, 0.6),
            new THREE.Vector3(0.35, 0.35, 0.35),
            new THREE.Vector3(0.8, 0.8, 0.8),
            new THREE.Vector3(0.2, 0.2, 0.2),
            new THREE.Vector3(0.5, 0.5, 0.5),
          ],
        },
        u_total_size: { value: 20.0 },
        u_dot_size: { value: 6.0 },
        u_reverse: { value: 0 },
      }

      material = new THREE.ShaderMaterial({
        vertexShader: `
          precision mediump float;
          uniform vec2 u_resolution;
          out vec2 fragCoord;
          void main() {
            gl_Position = vec4(position, 1.0);
            fragCoord = (position.xy + 1.0) * 0.5 * u_resolution;
            fragCoord.y = u_resolution.y - fragCoord.y;
          }
        `,
        fragmentShader: `
          precision mediump float;
          in vec2 fragCoord;
          uniform float u_time;
          uniform float u_opacities[10];
          uniform vec3 u_colors[6];
          uniform float u_total_size;
          uniform float u_dot_size;
          uniform vec2 u_resolution;
          uniform int u_reverse;
          out vec4 fragColor;
          float PHI = 1.61803398874989484820459;
          float random(vec2 xy) {
            return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
          }
          void main() {
            vec2 st = fragCoord.xy;
            st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));
            st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));
            float opacity = step(0.0, st.x) * step(0.0, st.y);
            vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));
            float frequency = 5.0;
            float show_offset = random(st2);
            float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
            opacity *= u_opacities[int(rand * 10.0)];
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));
            vec3 color = u_colors[int(show_offset * 6.0)];
            float animation_speed_factor = 3.0;
            vec2 center_grid = u_resolution / 2.0 / u_total_size;
            float dist_from_center = distance(center_grid, st2);
            float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);
            float current_timing_offset = timing_offset_intro;
            opacity *= step(current_timing_offset, u_time * animation_speed_factor);
            opacity *= clamp((1.0 - step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
            fragColor = vec4(color, opacity);
            fragColor.rgb *= fragColor.a;
          }
        `,
        uniforms: uniforms,
        glslVersion: THREE.GLSL3,
        blending: THREE.CustomBlending,
        blendSrc: THREE.SrcAlphaFactor,
        blendDst: THREE.OneFactor,
        transparent: true,
      })

      geometry = new THREE.PlaneGeometry(2, 2)
      const mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh)

      const startTime = performance.now()
      const animate = () => {
        if (!active) return
        animationId = requestAnimationFrame(animate)
        uniforms.u_time.value = (performance.now() - startTime) / 1000.0
        renderer.render(scene, camera)
      }
      animate()

      const handleResize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight)
        uniforms.u_resolution.value.set(window.innerWidth * 2, window.innerHeight * 2)
      }
      window.addEventListener('resize', handleResize)
      removeResizeListener = () => window.removeEventListener('resize', handleResize)
    }

    if ((window as any).THREE) {
      initThree((window as any).THREE)
    } else {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
      script.async = true
      script.onload = () => {
        if ((window as any).THREE && active) {
          initThree((window as any).THREE)
        }
      }
      document.head.appendChild(script)
    }

    return () => {
      active = false
      if (removeResizeListener) removeResizeListener()
      if (animationId!) cancelAnimationFrame(animationId)
      if (renderer) renderer.dispose()
      if (geometry) geometry.dispose()
      if (material) material.dispose()
    }
  }, [])

  const googleIcon = (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
  const githubIcon = (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 shrink-0">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.699-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  )

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-black text-white font-['Inter',-apple-system,sans-serif]">
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      <div className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0)_100%)]" />
      <div className="relative z-[2] w-full max-w-[400px] rounded-xl border border-white/10 bg-[#121212] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col items-center">
        {isLogin ? (
          <div className="w-full flex flex-col items-center text-center">
            <div className="size-11 rounded-full border border-white/15 bg-[#111] flex items-center justify-center font-bold text-lg mb-3">AG</div>
            <h1 className="text-xl font-semibold tracking-tight mb-1">Sign in to Account</h1>
            <p className="text-sm text-zinc-500 mb-5">Sign in to your Account.</p>
            <form onSubmit={(e) => e.preventDefault()} className="w-full flex flex-col gap-2.5">
              <input type="email" placeholder="name@work-email.com" required className="w-full rounded-md border border-white/10 bg-black px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-white/25" />
              <button type="submit" className="w-full rounded-md bg-[#ededed] py-2.5 text-sm font-medium text-black hover:bg-white transition-colors">Continue with Email</button>
            </form>
            <div className="h-px w-full bg-white/10 my-4" />
            <button className="w-full rounded-md border border-white/15 bg-transparent py-2.5 text-sm font-medium text-white flex items-center justify-center gap-2 mb-1.5 hover:border-white/25 transition-colors">{googleIcon}Continue with Google</button>
            <button className="w-full rounded-md border border-white/15 bg-transparent py-2.5 text-sm font-medium text-white flex items-center justify-center gap-2 hover:border-white/25 transition-colors">{githubIcon}Continue with GitHub</button>
            <div className="mt-5 text-sm text-zinc-500">
              Don't have an account?{' '}
              <button onClick={() => setIsLogin(false)} className="text-white font-medium bg-transparent border-none p-0 cursor-pointer font-[inherit] text-sm hover:text-[#00dfd8] transition-colors">Sign Up</button>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center text-center">
            <div className="size-11 rounded-full border border-white/15 bg-[#111] flex items-center justify-center font-bold text-lg mb-3">AG</div>
            <h1 className="text-xl font-semibold tracking-tight mb-1">Sign up for Account</h1>
            <p className="text-sm text-zinc-500 mb-5">Create a new account to get started.</p>
            <form onSubmit={(e) => e.preventDefault()} className="w-full flex flex-col gap-2.5">
              <input type="text" placeholder="Full Name" required className="w-full rounded-md border border-white/10 bg-black px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-white/25" />
              <input type="email" placeholder="name@work-email.com" required className="w-full rounded-md border border-white/10 bg-black px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-white/25" />
              <button type="submit" className="w-full rounded-md bg-[#ededed] py-2.5 text-sm font-medium text-black hover:bg-white transition-colors">Sign Up with Email</button>
            </form>
            <div className="h-px w-full bg-white/10 my-4" />
            <button className="w-full rounded-md border border-white/15 bg-transparent py-2.5 text-sm font-medium text-white flex items-center justify-center gap-2 mb-1.5 hover:border-white/25 transition-colors">{googleIcon}Sign up with Google</button>
            <button className="w-full rounded-md border border-white/15 bg-transparent py-2.5 text-sm font-medium text-white flex items-center justify-center gap-2 hover:border-white/25 transition-colors">{githubIcon}Sign up with GitHub</button>
            <div className="mt-5 text-sm text-zinc-500">
              Already have an account?{' '}
              <button onClick={() => setIsLogin(true)} className="text-white font-medium bg-transparent border-none p-0 cursor-pointer font-[inherit] text-sm hover:text-[#00dfd8] transition-colors">Sign In</button>
            </div>
          </div>
        )}
        <div className="mt-4 text-xs text-zinc-600 text-center leading-relaxed">
          By proceeding, you agree to our{' '}
          <a href="#" className="text-zinc-500 hover:text-zinc-300">Terms of Service</a> and{' '}
          <a href="#" className="text-zinc-500 hover:text-zinc-300">Privacy Policy</a>.
        </div>
      </div>
    </div>
  )
}
