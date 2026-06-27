import { useRef } from 'react'
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

gsap.registerPlugin(ScrollTrigger)

export function PitchDeckPage() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const horizontalSectionRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    // 1. Initialize Lenis Smooth Scroll
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

    // 2. Title & Hero Entrance Animations
    gsap.from('.hero-title-char', {
      y: 100,
      opacity: 0,
      duration: 1.0,
      stagger: 0.05,
      ease: 'power4.out',
    })

    gsap.from('.hero-fade-in', {
      opacity: 0,
      y: 30,
      duration: 1.2,
      stagger: 0.15,
      delay: 0.4,
      ease: 'power3.out',
    })

    // 3. Stat Card Numbers Count Up on Scroll
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

    // 4. Horizontal Slide Section Panning
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

    // Cleanup
    return () => {
      lenis.destroy()
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
    }
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className='bg-[#0A0A0A] text-white min-h-screen font-sans selection:bg-vercel-blue selection:text-white overflow-x-hidden'>
      {/* Immersive Particle/Grid Background */}
      <div className='absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none' />

      {/* Floating Neon Orbs */}
      <div className='absolute top-20 left-1/4 w-[35rem] h-[35rem] rounded-full bg-vercel-blue/5 blur-[120px] pointer-events-none' />
      <div className='absolute top-[120vh] right-1/4 w-[40rem] h-[40rem] rounded-full bg-vercel-blue/5 blur-[150px] pointer-events-none' />

      {/* HEADER NAVBAR */}
      <header className='fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-white/5 py-4 px-6 flex items-center justify-between bg-[#0A0A0A]/40'>
        <div className='flex items-center gap-2'>
          <div className='h-8 w-8 rounded-full bg-white flex items-center justify-center text-[#0A0A0A] font-bold text-sm'>i</div>
          <span className='font-signifier text-lg font-semibold tracking-tight'>IntelliCredit</span>
        </div>
        <div className='flex items-center gap-4 text-xs text-graphite'>
          <span>Diet Code</span>
          <span className='h-1 w-1 rounded-full bg-white/30' />
          <span>HACK-1D598347</span>
          <Button onClick={() => navigate({ to: '/' })} className='rounded-full bg-white text-[#0A0A0A] hover:bg-white/90 text-xs px-4 h-8 font-medium ml-4'>
            Demo Sandbox
          </Button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className='min-h-screen flex flex-col justify-center px-8 relative overflow-hidden pt-20'>
        <div className='max-w-5xl mx-auto space-y-6 z-10'>
          <div className='inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs text-vercel-blue font-mono hero-fade-in'>
            <Sparkles className='h-3.5 w-3.5' />
            PSB HACKATHON 2026 • WINNING ARCHITECTURE
          </div>
          
          <h1 className='text-6xl sm:text-8xl font-signifier tracking-tighter leading-[0.95] text-left uppercase'>
            <span className='block hero-title-char overflow-hidden'>Alternate</span>
            <span className='block hero-title-char overflow-hidden text-transparent bg-clip-text bg-gradient-to-r from-vercel-blue via-sky-300 to-white'>Credit Scoring</span>
            <span className='block hero-title-char overflow-hidden'>For India</span>
          </h1>

          <p className='text-lg sm:text-2xl text-graphite max-w-3xl leading-relaxed hero-fade-in font-light'>
            190 million Indians are credit-invisible. Traditional models reject them due to lack of bureau records. We build a fair, consented alternate score in 30 seconds.
          </p>

          <div className='flex flex-wrap items-center gap-4 hero-fade-in pt-4'>
            <Button onClick={() => navigate({ to: '/' })} size='lg' className='rounded-full bg-vercel-blue text-white hover:bg-vercel-blue/90 px-8 h-12 font-medium flex items-center gap-2 group'>
              Enter Sandbox App
              <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-1' />
            </Button>
            <a href='#stats' className='text-xs text-graphite border border-white/10 rounded-full px-6 h-12 flex items-center hover:bg-white/5 transition-all'>
              Scroll Down to Present
            </a>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section id='stats' className='min-h-screen py-24 px-8 relative flex flex-col justify-center border-t border-white/5'>
        <div className='max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center'>
          <div className='space-y-6'>
            <span className='text-xs font-mono text-vercel-blue uppercase tracking-widest'>The Credit Gap</span>
            <h2 className='text-4xl sm:text-5xl font-signifier tracking-tight leading-[1.1]'>
              THE CASCADING FAILURE OF BUREAU EXCLUSION
            </h2>
            <p className='text-graphite text-sm leading-relaxed font-light'>
              Lenders reject first-time borrowers, gig workers, and rural users by default because standard algorithms require prior loan history to function. This drives credit seekers to unorganized, high-interest informal markets.
            </p>
            <div className='border-l-2 border-vercel-blue pl-4 py-2 text-xs text-graphite font-mono'>
              Compliance constraint: AI scoring systems risk violating India's DPDP Act 2023 without explicit, user-consented alternate data pipelines.
            </div>
          </div>

          <div className='grid grid-cols-2 gap-6'>
            <div className='p-6 bg-white/[0.02] border border-white/5 rounded-[24px] space-y-4'>
              <h3 className='text-[10px] text-graphite font-mono uppercase'>Credit Invisible Adults</h3>
              <div className='text-4xl sm:text-5xl font-semibold tracking-tight stat-card-val' data-target='190' data-suffix='M+'>0</div>
              <p className='text-[10px] text-graphite font-light'>Locked out of formal institutional borrowing entirely.</p>
            </div>
            <div className='p-6 bg-white/[0.02] border border-white/5 rounded-[24px] space-y-4'>
              <h3 className='text-[10px] text-graphite font-mono uppercase'>Loan Rejections Value</h3>
              <div className='text-4xl sm:text-5xl font-semibold tracking-tight stat-card-val' data-target='3.5' data-prefix='₹' data-suffix='L Cr'>0</div>
              <p className='text-[10px] text-graphite font-light'>Untapped market value rejecting first-time applicants.</p>
            </div>
            <div className='p-6 bg-white/[0.02] border border-white/5 rounded-[24px] space-y-4'>
              <h3 className='text-[10px] text-graphite font-mono uppercase'>Scoring Reduction</h3>
              <div className='text-4xl sm:text-5xl font-semibold tracking-tight stat-card-val' data-target='90' data-is-percentage='true'>0</div>
              <p className='text-[10px] text-graphite font-light'>Reduction in typical verification process timeframes.</p>
            </div>
            <div className='p-6 bg-white/[0.02] border border-white/5 rounded-[24px] space-y-4'>
              <h3 className='text-[10px] text-graphite font-mono uppercase'>Resolution Time</h3>
              <div className='text-4xl sm:text-5xl font-semibold tracking-tight stat-card-val' data-target='30' data-suffix=' Sec'>0</div>
              <p className='text-[10px] text-graphite font-light'>Complete user onboarding and scorecard generation window.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HORIZONTAL PINNING PRESENTATION SLIDES */}
      <div ref={pinRef} className='overflow-hidden'>
        <div ref={horizontalSectionRef} className='w-[400vw] h-screen flex flex-row relative'>
          
          {/* Slide 1: THE PIPELINE */}
          <section className='horizontal-panel w-screen h-screen bg-[#0A0A0A] flex flex-col justify-center px-8 relative border-r border-white/5'>
            <div className='max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center'>
              <div className='space-y-6'>
                <span className='text-vercel-blue font-mono text-xs uppercase tracking-widest'>Core Engine: Slide 01</span>
                <h3 className='text-5xl sm:text-6xl font-signifier tracking-tighter uppercase leading-[1.0]'>
                  6 PARALLEL DATA WORKERS
                </h3>
                <p className='text-sm text-graphite font-light leading-relaxed'>
                  IntelliCredit runs 6 decoupled data collection threads concurrently, capturing digital indicators across the applicant's lifecycle under explicit user consent.
                </p>
                <ul className='grid grid-cols-2 gap-3 text-xs text-graphite font-mono'>
                  <li className='flex items-center gap-2'><div className='h-1.5 w-1.5 rounded-full bg-vercel-blue' /> UPI transaction volumes</li>
                  <li className='flex items-center gap-2'><div className='h-1.5 w-1.5 rounded-full bg-vercel-blue' /> Telecom bill punctuality</li>
                  <li className='flex items-center gap-2'><div className='h-1.5 w-1.5 rounded-full bg-vercel-blue' /> Ecommerce spend depth</li>
                  <li className='flex items-center gap-2'><div className='h-1.5 w-1.5 rounded-full bg-vercel-blue' /> Geolocation history</li>
                  <li className='flex items-center gap-2'><div className='h-1.5 w-1.5 rounded-full bg-vercel-blue' /> Psychometric inputs</li>
                  <li className='flex items-center gap-2'><div className='h-1.5 w-1.5 rounded-full bg-vercel-blue' /> GST merchant logs</li>
                </ul>
              </div>
              <div className='flex items-center justify-center p-8 bg-white/[0.01] border border-white/5 rounded-[24px] relative'>
                <div className='absolute inset-0 bg-vercel-blue/5 blur-[50px] pointer-events-none' />
                <Database className='h-40 w-40 text-vercel-blue/20 animate-pulse' />
              </div>
            </div>
          </section>

          {/* Slide 2: THE ML MODEL */}
          <section className='horizontal-panel w-screen h-screen bg-[#0E0E0E] flex flex-col justify-center px-8 relative border-r border-white/5'>
            <div className='max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center'>
              <div className='space-y-6'>
                <span className='text-vercel-blue font-mono text-xs uppercase tracking-widest'>Core Engine: Slide 02</span>
                <h3 className='text-5xl sm:text-6xl font-signifier tracking-tighter uppercase leading-[1.0]'>
                  TWO-TIER SCORECARD ENGINE
                </h3>
                <p className='text-sm text-graphite font-light leading-relaxed'>
                  Features feed into a calibrated model suite that aligns scoring output to the classic 300-850 credit band:
                </p>
                <div className='space-y-4'>
                  <div className='p-4 bg-white/[0.02] border border-white/5 rounded-[16px]'>
                    <h4 className='text-xs font-semibold text-white flex items-center gap-2'>
                      <Layers className='h-4 w-4 text-vercel-blue' />
                      Tier 1: Zero-History Scorecard
                    </h4>
                    <p className='text-[10px] text-graphite mt-1'>Evaluates applicants with zero banking records using telecom payments, location stability, and psychometrics.</p>
                  </div>
                  <div className='p-4 bg-white/[0.02] border border-white/5 rounded-[16px]'>
                    <h4 className='text-xs font-semibold text-white flex items-center gap-2'>
                      <Cpu className='h-4 w-4 text-vercel-blue' />
                      Tier 2: Full alternate Scorecard
                    </h4>
                    <p className='text-[10px] text-graphite mt-1'>Blends all 6 indicators including UPI flow, e-commerce purchases, and GST returns for comprehensive scoring.</p>
                  </div>
                </div>
              </div>
              <div className='flex items-center justify-center p-8 bg-white/[0.01] border border-white/5 rounded-[24px] relative'>
                <div className='absolute inset-0 bg-vercel-blue/5 blur-[50px] pointer-events-none' />
                <Cpu className='h-40 w-40 text-vercel-blue/20 animate-pulse' />
              </div>
            </div>
          </section>

          {/* Slide 3: SHAP EXPLAINABILITY */}
          <section className='horizontal-panel w-screen h-screen bg-[#0A0A0A] flex flex-col justify-center px-8 relative border-r border-white/5'>
            <div className='max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center'>
              <div className='space-y-6'>
                <span className='text-vercel-blue font-mono text-xs uppercase tracking-widest'>Core Engine: Slide 03</span>
                <h3 className='text-5xl sm:text-6xl font-signifier tracking-tighter uppercase leading-[1.0]'>
                  SHAP EXPLAINABILITY & RAG ADVISOR
                </h3>
                <p className='text-sm text-graphite font-light leading-relaxed'>
                  Lenders must provide clear reasons for rejection under RBI Guidelines. We compute SHAP (Shapley Additive exPlanations) values to trace point contributions:
                </p>
                <div className='space-y-3 font-mono text-xs text-graphite'>
                  <div className='flex justify-between border-b border-white/5 pb-1'>
                    <span>Telecom billing punctuality</span>
                    <span className='text-emerald-400'>+42 points</span>
                  </div>
                  <div className='flex justify-between border-b border-white/5 pb-1'>
                    <span>Address volatility</span>
                    <span className='text-rust'>-18 points</span>
                  </div>
                  <div className='flex justify-between border-b border-white/5 pb-1'>
                    <span>UPI transaction frequency</span>
                    <span className='text-emerald-400'>+55 points</span>
                  </div>
                </div>
                <div className='text-xs text-graphite bg-white/5 p-3 rounded-[12px]'>
                  <strong>Local RAG Integration:</strong> Employs local Ollama embedding pipelines to parse compliance guidelines, answering officer overrides instantly in clear language.
                </div>
              </div>
              <div className='flex items-center justify-center p-8 bg-white/[0.01] border border-white/5 rounded-[24px] relative'>
                <div className='absolute inset-0 bg-vercel-blue/5 blur-[50px] pointer-events-none' />
                <FileText className='h-40 w-40 text-vercel-blue/20 animate-pulse' />
              </div>
            </div>
          </section>

          {/* Slide 4: FAIRNESS LOOPS */}
          <section className='horizontal-panel w-screen h-screen bg-[#111111] flex flex-col justify-center px-8 relative'>
            <div className='max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center'>
              <div className='space-y-6'>
                <span className='text-vercel-blue font-mono text-xs uppercase tracking-widest'>Core Engine: Slide 04</span>
                <h3 className='text-5xl sm:text-6xl font-signifier tracking-tighter uppercase leading-[1.0]'>
                  BIAS CORRECTION & FAIRNESS
                </h3>
                <p className='text-sm text-graphite font-light leading-relaxed'>
                  Machine Learning models naturally favor metro residents due to richer spending logs. We apply a fairness post-processing calibration offset boost:
                </p>
                <div className='grid grid-cols-2 gap-4 text-center'>
                  <div className='p-4 bg-white/5 rounded-[16px]'>
                    <div className='text-2xl font-bold text-rust flex items-center justify-center gap-1'>
                      0.71
                      <TrendingDown className='h-4 w-4' />
                    </div>
                    <div className='text-[10px] text-graphite mt-1'>Uncorrected Parity Ratio</div>
                  </div>
                  <div className='p-4 bg-vercel-blue/10 border border-vercel-blue/20 rounded-[16px]'>
                    <div className='text-2xl font-bold text-emerald-400 flex items-center justify-center gap-1'>
                      0.96
                      <ShieldCheck className='h-4 w-4' />
                    </div>
                    <div className='text-[10px] text-graphite mt-1'>Fairness Corrected Ratio</div>
                  </div>
                </div>
                <p className='text-xs text-graphite leading-relaxed'>
                  A **+55 point calibration boost** is applied to Tier 1 non-metro residents, bringing demographic parity above the strict 0.80 regulatory threshold.
                </p>
              </div>
              <div className='flex items-center justify-center p-8 bg-white/[0.01] border border-white/5 rounded-[24px] relative'>
                <div className='absolute inset-0 bg-vercel-blue/5 blur-[50px] pointer-events-none' />
                <ShieldCheck className='h-40 w-40 text-vercel-blue/20 animate-pulse' />
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* COMPLIANCE & IMPACT SECTION */}
      <section className='min-h-screen py-24 px-8 relative flex flex-col justify-center border-t border-white/5 bg-[#0C0C0C]'>
        <div className='max-w-4xl mx-auto space-y-12 text-center'>
          <div className='space-y-4'>
            <span className='text-xs font-mono text-vercel-blue uppercase tracking-widest'>Impact & compliance</span>
            <h2 className='text-4xl sm:text-5xl font-signifier tracking-tight uppercase leading-[1.1]'>
              COMPLIANT BY DESIGN. SECURED FOR LENDERS.
            </h2>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-3 gap-6 text-left'>
            <div className='p-6 bg-white/[0.02] border border-white/5 rounded-[24px] space-y-3'>
              <ShieldCheck className='h-8 w-8 text-emerald-400' />
              <h4 className='text-sm font-semibold text-white'>DPDP Act 2023</h4>
              <p className='text-xs text-graphite leading-relaxed font-light'>
                Strict per-source granular consent flows prevent unauthorized scraping and keep applicant information secure.
              </p>
            </div>
            <div className='p-6 bg-white/[0.02] border border-white/5 rounded-[24px] space-y-3'>
              <Cpu className='h-8 w-8 text-vercel-blue' />
              <h4 className='text-sm font-semibold text-white'>Audit Persistence</h4>
              <p className='text-xs text-graphite leading-relaxed font-light'>
                Decisions are committed to PostgreSQL audit trails for verification, ensuring full internal traceability.
              </p>
            </div>
            <div className='p-6 bg-white/[0.02] border border-white/5 rounded-[24px] space-y-3'>
              <AlertCircle className='h-8 w-8 text-amber-400' />
              <h4 className='text-sm font-semibold text-white'>Fraud Mitigation</h4>
              <p className='text-xs text-graphite leading-relaxed font-light'>
                Wilful defaulters and high EMI burden applicants trigger immediate hard-cap limits to insulate lenders from risk.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FUTURE SCOPE & CALL TO ACTION */}
      <section className='min-h-screen py-24 px-8 relative flex flex-col justify-center border-t border-white/5 bg-[#0A0A0A]'>
        <div className='max-w-4xl mx-auto text-center space-y-8 relative z-10'>
          <h2 className='text-5xl sm:text-7xl font-signifier tracking-tighter uppercase leading-[1.0]'>
            THE FUTURE OF INCLUSIVE CREDIT
          </h2>
          <p className='text-base sm:text-xl text-graphite max-w-2xl mx-auto leading-relaxed font-light'>
            IntelliCredit is ready to deploy. Explore the fully functional sandbox application, link mock details, and run the real data pipelines.
          </p>
          <div className='flex flex-wrap items-center justify-center gap-4 pt-4'>
            <Button onClick={() => navigate({ to: '/' })} size='lg' className='rounded-full bg-vercel-blue text-white hover:bg-vercel-blue/90 px-8 h-12 font-medium flex items-center gap-2 group'>
              Launch Sandbox Application
              <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-1' />
            </Button>
            <Button onClick={() => navigate({ to: '/dashboard' })} variant='outline' size='lg' className='rounded-full border-white/10 hover:bg-white/5 text-xs text-graphite h-12 px-6'>
              Loan Officer Dashboard
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
