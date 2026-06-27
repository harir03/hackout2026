import { useRef, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Lenis from 'lenis'
import {
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileText,
  AlertCircle,
  Database,
  TrendingDown,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StarBorder } from '@/components/ui/star-border'
import { Lightfall } from '@/components/ui/lightfall'

gsap.registerPlugin(ScrollTrigger)



export function PitchDeckPage() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const horizontalSectionRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseCoords = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      container.style.setProperty('--mouse-x', `${x}px`)
      container.style.setProperty('--mouse-y', `${y}px`)
    }

    window.addEventListener('mousemove', handleMouseCoords)
    return () => {
      window.removeEventListener('mousemove', handleMouseCoords)
    }
  }, [])

  useGSAP(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    lenis.on('scroll', ScrollTrigger.update)

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000)
    })

    gsap.ticker.lagSmoothing(0)

    // Title Entrance
    gsap.from('.hero-title-char', {
      y: 80,
      opacity: 0,
      duration: 0.8,
      stagger: 0.04,
      ease: 'power3.out',
    })

    gsap.from('.hero-fade-in', {
      opacity: 0,
      y: 20,
      duration: 1.0,
      stagger: 0.1,
      delay: 0.3,
      ease: 'power2.out',
    })

    // Numbers count up on scroll
    const statCards = gsap.utils.toArray<HTMLElement>('.stat-card-val')
    statCards.forEach((card) => {
      const targetVal = parseFloat(card.getAttribute('data-target') || '0')
      const isPercentage = card.getAttribute('data-is-percentage') === 'true'
      const prefix = card.getAttribute('data-prefix') || ''
      const suffix = card.getAttribute('data-suffix') || ''
      
      const countObj = { val: 0 }
      gsap.to(countObj, {
        val: targetVal,
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        duration: 2.0,
        ease: 'power3.out',
        onUpdate: () => {
          if (isPercentage) {
            card.innerText = `${prefix}${countObj.val.toFixed(0)}%${suffix}`
          } else if (Number.isInteger(targetVal)) {
            card.innerText = `${prefix}${countObj.val.toFixed(0)}${suffix}`
          } else {
            card.innerText = `${prefix}${countObj.val.toFixed(1)}${suffix}`
          }
        }
      })
    })

    // Horizontal sliding
    const panels = gsap.utils.toArray<HTMLElement>('.horizontal-panel')
    const totalPanels = panels.length

    gsap.to(panels, {
      xPercent: -100 * (totalPanels - 1),
      ease: 'none',
      scrollTrigger: {
        trigger: pinRef.current,
        pin: true,
        scrub: 1.0,
        start: 'top top',
        end: () => `+=${pinRef.current?.offsetWidth || 2000}`,
        invalidateOnRefresh: true,
      }
    })

    return () => {
      lenis.destroy()
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
    }
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className='bg-black text-white min-h-screen font-sans selection:bg-white selection:text-black overflow-x-hidden relative'>
      {/* Dynamic Cursor Light Grid Highlight */}
      <div 
        className='absolute inset-0 bg-[linear-gradient(to_right,#222_1px,transparent_1px),linear-gradient(to_bottom,#222_1px,transparent_1px)] bg-[size:5rem_5rem] pointer-events-none'
        style={{
          maskImage: `radial-gradient(320px circle at var(--mouse-x, -9999px) var(--mouse-y, -9999px), black 20%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(320px circle at var(--mouse-x, -9999px) var(--mouse-y, -9999px), black 20%, transparent 100%)`,
          opacity: 0.9
        }}
      />

      {/* Vercel Ambient Glows (Monochrome) */}
      <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[40rem] h-[30rem] rounded-full bg-white/[0.02] blur-[130px] pointer-events-none' />
      <div className='absolute top-[120vh] right-1/4 w-[30rem] h-[30rem] rounded-full bg-white/[0.01] blur-[150px] pointer-events-none' />

      {/* GLASSMORPHISM PILL NAVBAR WITH LIGHTNING BORDER */}
      <div className='fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-3xl pointer-events-auto'>
        <StarBorder
          as="header"
          color="white"
          speed="6s"
          thickness={1}
          className="rounded-full overflow-hidden w-full !block"
          innerClassName="flex items-center justify-between px-5 py-2 rounded-full bg-black/40 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] w-full"
        >
          <div className='flex items-center gap-2'>
            <div className='h-6 w-6 rounded-full bg-white flex items-center justify-center text-black font-bold text-xs'>▲</div>
            <span className='font-signifier text-sm font-semibold tracking-tight'>AltGrade</span>
          </div>
          <div className='flex items-center gap-4 text-[10px] sm:text-xs text-muted-foreground font-mono'>
            <span>Diet Code</span>
            <span className='h-3 w-px bg-white/10' />
            <span>HACK-1D598347</span>
            <button
              onClick={() => navigate({ to: '/dashboard' })}
              className="bg-black text-white text-[10px] sm:text-xs px-4 py-1.5 rounded-full border border-[#222] font-medium transition-colors hover:bg-neutral-900 cursor-pointer"
            >
              Dashboard
            </button>
          </div>
        </StarBorder>
      </div>

      {/* HERO SECTION */}
      <section className='min-h-screen flex flex-col justify-center px-8 relative overflow-hidden pt-20'>
        {/* Lightfall background */}
        <div className='absolute inset-0 pointer-events-none opacity-20 z-0'>
          <Lightfall
            colors={['#ffffff', '#a3a3a3', '#525252']}
            backgroundColor='#000000'
            speed={0.4}
            streakCount={4}
            streakWidth={1.2}
            streakLength={1.0}
            glow={0.8}
            density={0.5}
            twinkle={0.8}
            zoom={2.5}
            backgroundGlow={0.3}
            opacity={1}
            mouseInteraction={true}
            mouseStrength={0.5}
            mouseRadius={0.8}
          />
        </div>
        <div className='max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10'>
          
          <div className='lg:col-span-9 space-y-6 text-left'>
            <div className='inline-flex items-center gap-2 bg-white/5 border border-[#333] px-3 py-1 rounded-full text-[10px] text-white font-mono hero-fade-in'>
              <Sparkles className='h-3.5 w-3.5' />
              PSB HACKATHON 2026 • WORKFLOW SPEC
            </div>
            
            <h1 className='text-5xl sm:text-7xl font-signifier tracking-tighter leading-[0.95] uppercase'>
              <span className='block hero-title-char overflow-hidden'>Alternate</span>
              <span className='block hero-title-char overflow-hidden text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-400 to-neutral-600'>Credit Scoring</span>
              <span className='block hero-title-char overflow-hidden'>For India</span>
            </h1>

            <p className='text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed hero-fade-in font-light'>
              190 million Indian adults remain credit-invisible. AltGrade parses consented mobile recharges, location logs, and psychometrics to estimate scores in 30 seconds.
            </p>

            <div className='flex flex-wrap items-center gap-4 hero-fade-in pt-4'>
              <Button onClick={() => navigate({ to: '/' })} size='lg' className='rounded-md bg-white text-black hover:bg-white/90 px-8 h-12 font-medium flex items-center gap-2 group'>
                Enter Sandbox App
                <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-1' />
              </Button>
              <a href='#stats' className='text-xs text-muted-foreground border border-[#333] rounded-md px-6 h-12 flex items-center hover:bg-white/5 transition-all font-mono'>
                [ Scroll for Pitch ]
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* STATS SECTION */}
      <section id='stats' className='min-h-screen py-24 px-8 relative flex flex-col justify-center border-t border-[#1a1a1a]'>
        <div className='max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center'>
          <div className='space-y-6'>
            <span className='text-xs font-mono text-white uppercase tracking-widest'>The Credit Gap</span>
            <h2 className='text-4xl sm:text-5xl font-signifier tracking-tight leading-[1.1] uppercase'>
              The cascading failure of bureau exclusion
            </h2>
            <p className='text-muted-foreground text-sm leading-relaxed font-light'>
              Lenders reject first-time borrowers, gig workers, and rural users by default because standard algorithms require prior loan history to function. This drives credit seekers to unorganized, high-interest informal markets.
            </p>
            <div className='border-l border-[#333] pl-4 py-2 text-xs text-muted-foreground font-mono bg-white/[0.01] rounded-r-md'>
              Compliance: AI scoring tools risk violating India's DPDP Act 2023 without explicit, user-consented alternate data pipelines.
            </div>
          </div>

          <div className='grid grid-cols-2 gap-6'>
            <div className='p-6 bg-white/[0.01] border border-[#222] rounded-lg space-y-4 hover:border-[#333] transition-all'>
              <h3 className='text-[10px] text-muted-foreground font-mono uppercase'>Credit Invisible Adults</h3>
              <div className='text-4xl sm:text-5xl font-semibold tracking-tight text-white stat-card-val' data-target='190' data-suffix='M+'>0</div>
              <p className='text-[10px] text-muted-foreground font-light'>Locked out of formal institutional borrowing entirely.</p>
            </div>
            <div className='p-6 bg-white/[0.01] border border-[#222] rounded-lg space-y-4 hover:border-[#333] transition-all'>
              <h3 className='text-[10px] text-muted-foreground font-mono uppercase'>Loan Rejections Value</h3>
              <div className='text-4xl sm:text-5xl font-semibold tracking-tight text-white stat-card-val' data-target='3.5' data-prefix='₹' data-suffix='L Cr'>0</div>
              <p className='text-[10px] text-muted-foreground font-light'>Untapped market value rejecting first-time applicants.</p>
            </div>
            <div className='p-6 bg-white/[0.01] border border-[#222] rounded-lg space-y-4 hover:border-[#333] transition-all'>
              <h3 className='text-[10px] text-muted-foreground font-mono uppercase'>Scoring Reduction</h3>
              <div className='text-4xl sm:text-5xl font-semibold tracking-tight text-white stat-card-val' data-target='90' data-is-percentage='true'>0</div>
              <p className='text-[10px] text-muted-foreground font-light'>Reduction in typical verification process timeframes.</p>
            </div>
            <div className='p-6 bg-white/[0.01] border border-[#222] rounded-lg space-y-4 hover:border-[#333] transition-all'>
              <h3 className='text-[10px] text-muted-foreground font-mono uppercase'>Resolution Time</h3>
              <div className='text-4xl sm:text-5xl font-semibold tracking-tight text-white stat-card-val' data-target='30' data-suffix=' Sec'>0</div>
              <p className='text-[10px] text-muted-foreground font-light'>Complete user onboarding and scorecard generation window.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HORIZONTAL PINNING PRESENTATION SLIDES */}
      <div ref={pinRef} className='overflow-hidden'>
        <div ref={horizontalSectionRef} className='w-[400vw] h-screen flex flex-row relative'>
          
          {/* Slide 1: THE PIPELINE */}
          <section className='horizontal-panel w-screen h-screen bg-black flex flex-col justify-center px-8 relative border-r border-[#1a1a1a]'>
            <div className='max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center'>
              <div className='space-y-6'>
                <span className='text-white font-mono text-xs uppercase tracking-widest'>Slide 01</span>
                <h3 className='text-4xl sm:text-5xl font-signifier tracking-tighter uppercase leading-[1.0]'>
                  6 PARALLEL DATA WORKERS
                </h3>
                <p className='text-sm text-muted-foreground font-light leading-relaxed'>
                  AltGrade runs 6 decoupled data collection threads concurrently, capturing digital indicators across the applicant's lifecycle under explicit user consent.
                </p>
                <ul className='grid grid-cols-2 gap-3 text-xs text-muted-foreground font-mono'>
                  <li className='flex items-center gap-2'><div className='h-1.5 w-1.5 rounded-full bg-white' /> UPI transaction volumes</li>
                  <li className='flex items-center gap-2'><div className='h-1.5 w-1.5 rounded-full bg-white' /> Telecom bill punctuality</li>
                  <li className='flex items-center gap-2'><div className='h-1.5 w-1.5 rounded-full bg-white' /> Ecommerce spend depth</li>
                  <li className='flex items-center gap-2'><div className='h-1.5 w-1.5 rounded-full bg-white' /> Geolocation history</li>
                  <li className='flex items-center gap-2'><div className='h-1.5 w-1.5 rounded-full bg-white' /> Psychometric inputs</li>
                  <li className='flex items-center gap-2'><div className='h-1.5 w-1.5 rounded-full bg-white' /> GST merchant logs</li>
                </ul>
              </div>
              <div className='flex items-center justify-center p-8 bg-white/[0.01] border border-[#222] rounded-lg relative'>
                <div className='absolute inset-0 bg-white/[0.01] blur-[50px] pointer-events-none' />
                <Database className='h-40 w-40 text-white/10' />
              </div>
            </div>
          </section>

          {/* Slide 2: THE ML MODEL */}
          <section className='horizontal-panel w-screen h-screen bg-[#050505] flex flex-col justify-center px-8 relative border-r border-[#1a1a1a]'>
            <div className='max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center'>
              <div className='space-y-6'>
                <span className='text-white font-mono text-xs uppercase tracking-widest'>Slide 02</span>
                <h3 className='text-4xl sm:text-5xl font-signifier tracking-tighter uppercase leading-[1.0]'>
                  TWO-TIER SCORECARD ENGINE
                </h3>
                <p className='text-sm text-muted-foreground font-light leading-relaxed'>
                  Features feed into a calibrated model suite that aligns scoring output to the classic 300-850 credit band:
                </p>
                <div className='space-y-4'>
                  <div className='p-4 bg-white/[0.01] border border-[#222] rounded-md'>
                    <h4 className='text-xs font-semibold text-white flex items-center gap-2'>
                      <Layers className='h-4 w-4 text-white' />
                      Tier 1: Zero-History Scorecard
                    </h4>
                    <p className='text-[10px] text-muted-foreground mt-1'>Evaluates applicants with zero banking records using telecom payments, location stability, and psychometrics.</p>
                  </div>
                  <div className='p-4 bg-white/[0.01] border border-[#222] rounded-md'>
                    <h4 className='text-xs font-semibold text-white flex items-center gap-2'>
                      <Cpu className='h-4 w-4 text-white' />
                      Tier 2: Full alternate Scorecard
                    </h4>
                    <p className='text-[10px] text-muted-foreground mt-1'>Blends all 6 indicators including UPI flow, e-commerce purchases, and GST returns for comprehensive scoring.</p>
                  </div>
                </div>
              </div>
              <div className='flex items-center justify-center p-8 bg-white/[0.01] border border-[#222] rounded-lg relative'>
                <div className='absolute inset-0 bg-white/[0.01] blur-[50px] pointer-events-none' />
                <Cpu className='h-40 w-40 text-white/10' />
              </div>
            </div>
          </section>

          {/* Slide 3: SHAP EXPLAINABILITY */}
          <section className='horizontal-panel w-screen h-screen bg-black flex flex-col justify-center px-8 relative border-r border-[#1a1a1a]'>
            <div className='max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center'>
              <div className='space-y-6'>
                <span className='text-white font-mono text-xs uppercase tracking-widest'>Slide 03</span>
                <h3 className='text-4xl sm:text-5xl font-signifier tracking-tighter uppercase leading-[1.0]'>
                  SHAP EXPLAINABILITY & RAG ADVISOR
                </h3>
                <p className='text-sm text-muted-foreground font-light leading-relaxed'>
                  Lenders must provide clear reasons for rejection under RBI Guidelines. We compute SHAP (Shapley Additive exPlanations) values to trace point contributions:
                </p>
                <div className='space-y-3 font-mono text-xs text-muted-foreground'>
                  <div className='flex justify-between border-b border-[#222] pb-1'>
                    <span>Telecom billing punctuality</span>
                    <span className='text-white'>+42 points</span>
                  </div>
                  <div className='flex justify-between border-b border-[#222] pb-1'>
                    <span>Address volatility</span>
                    <span className='text-muted-foreground'>-18 points</span>
                  </div>
                  <div className='flex justify-between border-b border-[#222] pb-1'>
                    <span>UPI transaction frequency</span>
                    <span className='text-white'>+55 points</span>
                  </div>
                </div>
                <div className='text-xs text-muted-foreground bg-white/[0.02] border border-[#222] p-3 rounded-md'>
                  <strong>Local RAG Integration:</strong> Employs local Ollama embedding pipelines to parse compliance guidelines, answering officer overrides instantly in clear language.
                </div>
              </div>
              <div className='flex items-center justify-center p-8 bg-white/[0.01] border border-[#222] rounded-lg relative'>
                <div className='absolute inset-0 bg-white/[0.01] blur-[50px] pointer-events-none' />
                <FileText className='h-40 w-40 text-white/10' />
              </div>
            </div>
          </section>

          {/* Slide 4: FAIRNESS LOOPS */}
          <section className='horizontal-panel w-screen h-screen bg-[#080808] flex flex-col justify-center px-8 relative'>
            <div className='max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center'>
              <div className='space-y-6'>
                <span className='text-white font-mono text-xs uppercase tracking-widest'>Slide 04</span>
                <h3 className='text-4xl sm:text-5xl font-signifier tracking-tighter uppercase leading-[1.0]'>
                  BIAS CORRECTION & FAIRNESS
                </h3>
                <p className='text-sm text-muted-foreground font-light leading-relaxed'>
                  Machine Learning models naturally favor metro residents due to richer spending logs. We apply a fairness post-processing calibration offset boost:
                </p>
                <div className='grid grid-cols-2 gap-4 text-center'>
                  <div className='p-4 bg-white/[0.01] border border-[#222] rounded-md'>
                    <div className='text-2xl font-bold text-muted-foreground flex items-center justify-center gap-1'>
                      0.71
                      <TrendingDown className='h-4 w-4' />
                    </div>
                    <div className='text-[10px] text-muted-foreground mt-1'>Uncorrected Parity Ratio</div>
                  </div>
                  <div className='p-4 bg-white/10 border border-white/20 rounded-md'>
                    <div className='text-2xl font-bold text-white flex items-center justify-center gap-1'>
                      0.96
                      <ShieldCheck className='h-4 w-4 text-white' />
                    </div>
                    <div className='text-[10px] text-muted-foreground mt-1'>Fairness Corrected Ratio</div>
                  </div>
                </div>
                <p className='text-xs text-muted-foreground leading-relaxed'>
                  A **+55 point calibration boost** is applied to Tier 1 non-metro residents, bringing demographic parity above the strict 0.80 regulatory threshold.
                </p>
              </div>
              <div className='flex items-center justify-center p-8 bg-white/[0.01] border border-[#222] rounded-lg relative'>
                <div className='absolute inset-0 bg-white/[0.01] blur-[50px] pointer-events-none' />
                <ShieldCheck className='h-40 w-40 text-white/10' />
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* COMPLIANCE & IMPACT SECTION */}
      <section className='min-h-screen py-24 px-8 relative flex flex-col justify-center border-t border-[#1a1a1a] bg-black'>
        <div className='max-w-4xl mx-auto space-y-12 text-center'>
          <div className='space-y-4'>
            <span className='text-xs font-mono text-white uppercase tracking-widest'>Impact & compliance</span>
            <h2 className='text-4xl sm:text-5xl font-signifier tracking-tight uppercase leading-[1.1]'>
              COMPLIANT BY DESIGN. SECURED FOR LENDERS.
            </h2>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-3 gap-6 text-left'>
            <div className='p-6 bg-white/[0.01] border border-[#222] rounded-md space-y-3'>
              <ShieldCheck className='h-8 w-8 text-white' />
              <h4 className='text-sm font-semibold text-white'>DPDP Act 2023</h4>
              <p className='text-xs text-muted-foreground leading-relaxed font-light'>
                Strict per-source granular consent flows prevent unauthorized scraping and keep applicant information secure.
              </p>
            </div>
            <div className='p-6 bg-white/[0.01] border border-[#222] rounded-md space-y-3'>
              <Cpu className='h-8 w-8 text-white' />
              <h4 className='text-sm font-semibold text-white'>Audit Persistence</h4>
              <p className='text-xs text-muted-foreground leading-relaxed font-light'>
                Decisions are committed to PostgreSQL audit trails for verification, ensuring full internal traceability.
              </p>
            </div>
            <div className='p-6 bg-white/[0.01] border border-[#222] rounded-md space-y-3'>
              <AlertCircle className='h-8 w-8 text-white' />
              <h4 className='text-sm font-semibold text-white'>Fraud Mitigation</h4>
              <p className='text-xs text-muted-foreground leading-relaxed font-light'>
                Wilful defaulters and high EMI burden applicants trigger immediate hard-cap limits to insulate lenders from risk.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE TRIONN-STYLE FOOTER */}
      <section className='border-t border-[#222] bg-black pt-24 pb-0 relative overflow-hidden'>
        <div className='max-w-6xl mx-auto space-y-16 px-8 relative z-10'>
          
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-12 items-start'>
            {/* Left Brand block */}
            <div className='lg:col-span-6 space-y-4'>
              <span className='text-[10px] text-muted-foreground font-mono tracking-widest uppercase block'>
                LET'S BUILD CREDIT THAT INSPIRES.
              </span>
              <h2 className='text-4xl sm:text-6xl font-signifier tracking-tight leading-[1.0] uppercase text-white'>
                Ready to score<br />something bold?
              </h2>
              <p className='text-xs text-muted-foreground font-mono mt-4'>
                © DIET CODE 2026
              </p>
            </div>

            {/* Right details block */}
            <div className='lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left sm:pt-6'>
              <div className='space-y-3'>
                <h4 className='text-[10px] text-muted-foreground font-mono uppercase tracking-widest'>COLLABORATION</h4>
                <Button 
                  onClick={() => navigate({ to: '/' })}
                  variant='link' 
                  className='p-0 h-auto text-xs text-white hover:text-white/80 font-mono font-normal flex items-center gap-1 group'
                >
                  START APP SANDBOX
                  <ArrowRight className='h-3 w-3 transition-transform group-hover:translate-x-1' />
                </Button>
                <Button 
                  onClick={() => navigate({ to: '/dashboard' })}
                  variant='link' 
                  className='p-0 h-auto text-xs text-white hover:text-white/80 font-mono font-normal flex items-center gap-1 group'
                >
                  OFFICER PANEL
                  <ArrowRight className='h-3 w-3 transition-transform group-hover:translate-x-1' />
                </Button>
              </div>

              <div className='space-y-2'>
                <h4 className='text-[10px] text-muted-foreground font-mono uppercase tracking-widest'>BUSINESS ENQUIRY</h4>
                <p className='text-xs font-mono text-muted-foreground'>
                  E. <a href='mailto:hello@altgrade.in' className='text-white hover:underline'>hello@altgrade.in</a>
                </p>
                <p className='text-xs font-mono text-muted-foreground'>
                  P. <span className='text-white'>+91 98765 43210</span>
                </p>
              </div>

              <div className='space-y-2'>
                <h4 className='text-[10px] text-muted-foreground font-mono uppercase tracking-widest'>SOCIAL</h4>
                <div className='grid grid-cols-2 gap-2 text-xs font-mono text-white'>
                  <a href='#' className='hover:underline'>Linkedin</a>
                  <a href='#' className='hover:underline'>Github</a>
                  <a href='#' className='hover:underline'>Dribbble</a>
                  <a href='#' className='hover:underline'>Twitter</a>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Full-color Brand Watermark (SYSTFLOW Style) */}
        <div className='relative mt-20 w-full flex flex-col items-center justify-center pt-4 select-none overflow-hidden'>
          <style>{`
            .brand-watermark {
              fill: rgba(255, 255, 255, 0.04);
              stroke: rgba(255, 255, 255, 0.08);
              stroke-width: 1.5px;
              transition: fill 0.4s, stroke 0.4s;
              cursor: pointer;
            }
            .brand-watermark:hover {
              fill: rgba(255, 255, 255, 0.08);
              stroke: rgba(255, 255, 255, 0.16);
            }
          `}</style>
          <div className='w-full px-0'>
            <svg 
              viewBox="0 0 1200 240" 
              className='w-full h-auto select-none'
            >
              <text 
                x="50%" 
                y="76%" 
                textAnchor="middle" 
                fontSize="200" 
                fontWeight="900" 
                fontFamily="'Inter', 'Montserrat', system-ui, sans-serif" 
                letterSpacing="4"
                className="brand-watermark"
              >
                ALTGRADE
              </text>
            </svg>
          </div>
        </div>

      </section>
    </div>
  )
}
