import { useRef, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Lenis from 'lenis'
import {
  Cpu,
  ArrowRight,
  ShieldCheck,
  Database,
  HeartHandshake,
  MessageSquareText,
  BadgePercent,
  PhoneCall,
  Languages,
  Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StarBorder } from '@/components/ui/star-border'
import { Lightfall } from '@/components/ui/lightfall'
import RotatingText from '@/components/ui/rotating-text'
import { getCookie, setCookie } from '@/lib/cookies'

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
      <div className="noise-overlay" />

      {/* Dynamic Cursor Light Grid Highlight */}
      <div 
        className='absolute inset-0 bg-[linear-gradient(to_right,#222_1px,transparent_1px),linear-gradient(to_bottom,#222_1px,transparent_1px)] bg-[size:5rem_5rem] pointer-events-none'
        style={{
          maskImage: `radial-gradient(320px circle at var(--mouse-x, -9999px) var(--mouse-y, -9999px), black 20%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(320px circle at var(--mouse-x, -9999px) var(--mouse-y, -9999px), black 20%, transparent 100%)`,
          opacity: 0.9
        }}
      />

      <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[40rem] h-[30rem] rounded-full bg-white/[0.02] blur-[130px] pointer-events-none' />
      <div className='absolute top-[120vh] right-1/4 w-[30rem] h-[30rem] rounded-full bg-white/[0.01] blur-[150px] pointer-events-none' />

      {/* GLASSMORPHISM PILL NAVBAR WITH LIGHTNING BORDER */}
      <div className='fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl pointer-events-auto'>
        <StarBorder
          as="header"
          color="white"
          speed="6s"
          thickness={1}
          className="rounded-full overflow-hidden w-full !block"
          innerClassName="flex items-center justify-between px-5 py-2 rounded-full bg-black/40 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] w-full"
        >
          <div className='flex items-center gap-2.5'>
            <span className='font-signifier text-sm font-semibold tracking-tight'>AltGrade</span>
          </div>
          <div className='flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground font-mono'>
            <span className='text-amber-300/90 font-medium'>Minions</span>
            <span className='h-3 w-px bg-white/10' />
            <div className='flex items-center gap-1.5 sm:gap-2 ml-1 sm:ml-2'>
              <a
                href="https://canva.link/r9fg4t8p2s37lqy"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black text-white text-[10px] sm:text-xs px-3 py-1.5 rounded-full border border-[#222] font-medium transition-colors hover:bg-neutral-900 cursor-pointer whitespace-nowrap"
              >
                Canva PPT
              </a>
              <a
                href="https://github.com/harir03/altgrade"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black text-white text-[10px] sm:text-xs px-3 py-1.5 rounded-full border border-[#222] font-medium transition-colors hover:bg-neutral-900 cursor-pointer whitespace-nowrap"
              >
                Git Repo
              </a>
              <button
                onClick={() => navigate({ to: '/sign-in' })}
                className="bg-black text-white text-[10px] sm:text-xs px-3 py-1.5 rounded-full border border-[#222] font-medium transition-colors hover:bg-neutral-900 cursor-pointer whitespace-nowrap"
              >
                Officer Panel
              </button>
            </div>
          </div>
        </StarBorder>
      </div>

      {/* HERO SECTION */}
      <section className='min-h-screen flex flex-col justify-center px-8 relative overflow-hidden pt-20'>
        {/* Lightfall background */}
        <div className='absolute inset-0 pointer-events-none opacity-20 z-0'>
          <Lightfall
            colors={['#ffffff', '#999999', '#595959', '#333333', '#191919']}
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
            <h1 className='text-5xl sm:text-7xl font-signifier tracking-tighter leading-[0.95] uppercase flex flex-col items-start'>
              <span className='block hero-title-char overflow-hidden'>Online Banking</span>
              <span className='block hero-title-char overflow-hidden text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-300 to-neutral-500'>For All</span>
              <span className='inline-flex items-center gap-3 hero-title-char overflow-hidden whitespace-nowrap'>
                <span>Across</span>
                <RotatingText
                  texts={['ALL OF BHARAT', 'TIER 2/3/4 TOWNS', 'FIRST-TIME USERS', 'FARMERS & AGRI', 'MSMEs & MERCHANTS', 'EVERY BORROWER']}
                  mainClassName="text-zinc-500 inline-block uppercase"
                  staggerFrom="last"
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-120%", opacity: 0 }}
                  staggerDuration={0.02}
                  splitLevelClassName="overflow-hidden pb-0.5"
                  transition={{ type: "spring", damping: 30, stiffness: 400 }}
                  rotationInterval={2500}
                />
              </span>
            </h1>

            <p className='text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed hero-fade-in font-light'>
              Breaking the one-size-fits-all digital banking barrier. AltGrade analyzes transactional flows, spending patterns, and life-stage events to deliver proactive product recommendations, vernacular voice onboarding, and empathetic financial stress interventions.
            </p>

            <div className='flex flex-wrap items-center gap-4 hero-fade-in pt-4'>
              <Button 
                onClick={() => {
                  const cookieState = getCookie('thisisjustarandomstring')
                  if (!cookieState) {
                    setCookie('thisisjustarandomstring', JSON.stringify('guest-applicant-token'))
                  }
                  navigate({ to: '/' })
                }} 
                size='lg' 
                className='rounded-md bg-white text-black hover:bg-white/90 px-8 h-12 font-medium flex items-center gap-2 group shadow-lg shadow-white/10'
              >
                Start Banking Journey
                <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-1' />
              </Button>
              <button
                onClick={() => {
                  window.location.href = '/score?userId=msme@altgrade.in'
                }}
                className='text-xs text-white/90 border border-white/20 rounded-md px-6 h-12 flex items-center hover:bg-white/10 transition-all font-mono'
              >
                [ Personalized Banking Hub ]
              </button>
              <a href='#pillars' className='text-xs text-muted-foreground border border-[#333] rounded-md px-6 h-12 flex items-center hover:bg-white/5 transition-all font-mono'>
                [ Architecture & Challenge Specs ]
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* STATS & CHALLENGE PROBLEM SECTION */}
      <section id='pillars' className='min-h-screen py-24 px-8 relative flex flex-col justify-center border-t border-[#1a1a1a]'>
        <div className='max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center'>
          <div className='space-y-6'>
            <span className='text-xs font-mono text-amber-400/90 uppercase tracking-widest'>The Digital Disconnect in Bharat</span>
            <h2 className='text-4xl sm:text-5xl font-signifier tracking-tight leading-[1.1] uppercase'>
              Beyond Generic One-Size-Fits-All Banking
            </h2>
            <p className='text-muted-foreground text-sm leading-relaxed font-light'>
              Despite massive strides in UPI, net banking, and video KYC, millions in Tier 2/3/4 towns find banking apps confusing, generic, and disconnected from their real financial needs. Banks face rising customer acquisition costs and high drop-offs by pushing generic pop-ups instead of understanding customers' actual life-stage realities.
            </p>
            <div className='border-l-2 border-amber-400/80 pl-4 py-2.5 text-xs text-muted-foreground font-mono bg-white/[0.02] rounded-r-md space-y-1'>
              <p className='text-white/90 font-semibold'>Challenge Mandate:</p>
              <p>1. Proactive recommendations (loans, insurance, investments) at the exact right moment.</p>
              <p>2. Conversational vernacular journeys (Hindi, Gujarati, Tamil) to eliminate onboarding drop-offs.</p>
              <p>3. Early warning signals for financial stress with empathetic restructuring rather than punitive default flags.</p>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-6'>
            <div className='p-6 bg-white/[0.01] border border-[#222] rounded-lg space-y-4 hover:border-[#333] transition-all'>
              <h3 className='text-[10px] text-muted-foreground font-mono uppercase'>Bharat Users Disconnected</h3>
              <div className='text-4xl sm:text-5xl font-semibold tracking-tight text-white stat-card-val' data-target='190' data-suffix='M+'>0</div>
              <p className='text-[10px] text-muted-foreground font-light'>Struggling with complex, English-first generic banking apps.</p>
            </div>
            <div className='p-6 bg-white/[0.01] border border-[#222] rounded-lg space-y-4 hover:border-[#333] transition-all'>
              <h3 className='text-[10px] text-muted-foreground font-mono uppercase'>Journey Drop-Off Cut</h3>
              <div className='text-4xl sm:text-5xl font-semibold tracking-tight text-white stat-card-val' data-target='68' data-is-percentage='true'>0</div>
              <p className='text-[10px] text-muted-foreground font-light'>Drop-off reduction via native vernacular voice & chatbot flows.</p>
            </div>
            <div className='p-6 bg-white/[0.01] border border-[#222] rounded-lg space-y-4 hover:border-[#333] transition-all'>
              <h3 className='text-[10px] text-muted-foreground font-mono uppercase'>Signal Matching Speed</h3>
              <div className='text-4xl sm:text-5xl font-semibold tracking-tight text-white stat-card-val' data-target='30' data-suffix=' Sec'>0</div>
              <p className='text-[10px] text-muted-foreground font-light'>Instant ingestion of transaction history, salary credits, and AA statements.</p>
            </div>
            <div className='p-6 bg-white/[0.01] border border-[#222] rounded-lg space-y-4 hover:border-[#333] transition-all'>
              <h3 className='text-[10px] text-muted-foreground font-mono uppercase'>Proactive Care Rate</h3>
              <div className='text-4xl sm:text-5xl font-semibold tracking-tight text-white stat-card-val' data-target='100' data-is-percentage='true'>0</div>
              <p className='text-[10px] text-muted-foreground font-light'>Early stress detected & restructured before punitive penalties strike.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HORIZONTAL PINNING PRESENTATION SLIDES */}
      <div ref={pinRef} className='overflow-hidden'>
        <div ref={horizontalSectionRef} className='w-[400vw] h-screen flex flex-row relative'>
          
          {/* Slide 1: MULTI-SOURCE SIGNAL INGESTION */}
          <section className='horizontal-panel w-screen h-screen bg-black flex flex-col justify-center px-8 relative border-r border-[#1a1a1a]'>
            <div className='max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center'>
              <div className='space-y-6'>
                <span className='text-amber-400 font-mono text-xs uppercase tracking-widest'>Pillar 01 • Life-Stage Signals</span>
                <h3 className='text-4xl sm:text-5xl font-signifier tracking-tighter uppercase leading-[1.0]'>
                  MULTI-SOURCE SIGNAL INGESTION
                </h3>
                <p className='text-sm text-muted-foreground font-light leading-relaxed'>
                  Rather than relying on static bureau histories, AltGrade ingests rich transactional and behavioral data across the customer's actual lifecycle under explicit DPDP consent:
                </p>
                <ul className='grid grid-cols-2 gap-3 text-xs text-muted-foreground font-mono'>
                  <li className='flex items-center gap-2'><div className='h-1.5 w-1.5 rounded-full bg-amber-400' /> UPI transaction velocity</li>
                  <li className='flex items-center gap-2'><div className='h-1.5 w-1.5 rounded-full bg-amber-400' /> Salary credits & delays</li>
                  <li className='flex items-center gap-2'><div className='h-1.5 w-1.5 rounded-full bg-amber-400' /> Seasonal harvest cashflow</li>
                  <li className='flex items-center gap-2'><div className='h-1.5 w-1.5 rounded-full bg-amber-400' /> Telecom bill punctuality</li>
                  <li className='flex items-center gap-2'><div className='h-1.5 w-1.5 rounded-full bg-amber-400' /> Mandi e-NAM & DBT receipts</li>
                  <li className='flex items-center gap-2'><div className='h-1.5 w-1.5 rounded-full bg-amber-400' /> Account Aggregator statements</li>
                </ul>
              </div>
              <div className='flex items-center justify-center p-8 bg-white/[0.01] border border-[#222] rounded-lg relative'>
                <div className='absolute inset-0 bg-white/[0.01] blur-[50px] pointer-events-none' />
                <Database className='h-40 w-40 text-white/10' />
              </div>
            </div>
          </section>

          {/* Slide 2: AI HYPER-PERSONALIZATION */}
          <section className='horizontal-panel w-screen h-screen bg-[#050505] flex flex-col justify-center px-8 relative border-r border-[#1a1a1a]'>
            <div className='max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center'>
              <div className='space-y-6'>
                <span className='text-amber-400 font-mono text-xs uppercase tracking-widest'>Pillar 02 • Precision Matching</span>
                <h3 className='text-4xl sm:text-5xl font-signifier tracking-tighter uppercase leading-[1.0]'>
                  AI HYPER-PERSONALIZATION ENGINE
                </h3>
                <p className='text-sm text-muted-foreground font-light leading-relaxed'>
                  Replaces generic, annoying pop-up ads with contextual product recommendations delivered at the precise moment of customer need:
                </p>
                <div className='space-y-4'>
                  <div className='p-4 bg-white/[0.01] border border-[#222] rounded-md'>
                    <h4 className='text-xs font-semibold text-white flex items-center gap-2'>
                      <BadgePercent className='h-4 w-4 text-amber-400' />
                      Tailored Lending & Working Capital
                    </h4>
                    <p className='text-[10px] text-muted-foreground mt-1'>Mudra Shishu micro-OD for merchants, crop-cycle Kisan Credit Cards (KCC) with harvest-aligned bullet repayment.</p>
                  </div>
                  <div className='p-4 bg-white/[0.01] border border-[#222] rounded-md'>
                    <h4 className='text-xs font-semibold text-white flex items-center gap-2'>
                      <ShieldCheck className='h-4 w-4 text-emerald-400' />
                      Micro-Insurance & Goal-Saver Accounts
                    </h4>
                    <p className='text-[10px] text-muted-foreground mt-1'>PM Fasal Bima crop protection, ₹2L PMJJBY life cover at ₹436/yr, and automated micro-savings for emergencies.</p>
                  </div>
                </div>
              </div>
              <div className='flex items-center justify-center p-8 bg-white/[0.01] border border-[#222] rounded-lg relative'>
                <div className='absolute inset-0 bg-white/[0.01] blur-[50px] pointer-events-none' />
                <Cpu className='h-40 w-40 text-white/10' />
              </div>
            </div>
          </section>

          {/* Slide 3: VERNACULAR CONVERSATIONAL JOURNEYS */}
          <section className='horizontal-panel w-screen h-screen bg-black flex flex-col justify-center px-8 relative border-r border-[#1a1a1a]'>
            <div className='max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center'>
              <div className='space-y-6'>
                <span className='text-amber-400 font-mono text-xs uppercase tracking-widest'>Pillar 03 • Zero Drop-Off KYC</span>
                <h3 className='text-4xl sm:text-5xl font-signifier tracking-tighter uppercase leading-[1.0]'>
                  VERNACULAR CONVERSATIONAL JOURNEYS
                </h3>
                <p className='text-sm text-muted-foreground font-light leading-relaxed'>
                  Complex forms cause massive drop-offs for first-time digital users in Bharat. AltGrade replaces forms with human-like voice and chat in native regional tongues:
                </p>
                <div className='space-y-3 font-mono text-xs text-muted-foreground'>
                  <div className='flex justify-between border-b border-[#222] pb-1'>
                    <span className='flex items-center gap-1.5'><Languages className='h-3.5 w-3.5 text-white' /> Hindi, Gujarati, Tamil, English</span>
                    <span className='text-emerald-400'>100% Native</span>
                  </div>
                  <div className='flex justify-between border-b border-[#222] pb-1'>
                    <span className='flex items-center gap-1.5'><MessageSquareText className='h-3.5 w-3.5 text-white' /> Voice Questionnaire & Speech Matching</span>
                    <span className='text-white'>Hands-Free</span>
                  </div>
                  <div className='flex justify-between border-b border-[#222] pb-1'>
                    <span className='flex items-center gap-1.5'><PhoneCall className='h-3.5 w-3.5 text-white' /> AI Outbound Phone Callback</span>
                    <span className='text-white'>Keypad / Telephony</span>
                  </div>
                </div>
                <div className='text-xs text-muted-foreground bg-white/[0.02] border border-[#222] p-3 rounded-md'>
                  <strong>Empowering Non-Tech Users:</strong> Borrowers can listen to audio explanations, answer by speaking naturally, or receive an automated phone call in their village dialect.
                </div>
              </div>
              <div className='flex items-center justify-center p-8 bg-white/[0.01] border border-[#222] rounded-lg relative'>
                <div className='absolute inset-0 bg-white/[0.01] blur-[50px] pointer-events-none' />
                <MessageSquareText className='h-40 w-40 text-white/10' />
              </div>
            </div>
          </section>

          {/* Slide 4: PROACTIVE FINANCIAL STRESS & CARE */}
          <section className='horizontal-panel w-screen h-screen bg-[#080808] flex flex-col justify-center px-8 relative'>
            <div className='max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center'>
              <div className='space-y-6'>
                <span className='text-amber-400 font-mono text-xs uppercase tracking-widest'>Pillar 04 • Empathetic Interventions</span>
                <h3 className='text-4xl sm:text-5xl font-signifier tracking-tighter uppercase leading-[1.0]'>
                  EARLY STRESS WARNING & CARE
                </h3>
                <p className='text-sm text-muted-foreground font-light leading-relaxed'>
                  Traditional banks slap punitive default fees when unexpected shocks hit. AltGrade detects early stress signals and triggers proactive, non-punitive assistance:
                </p>
                <div className='grid grid-cols-2 gap-4 text-center'>
                  <div className='p-4 bg-white/[0.01] border border-[#222] rounded-md'>
                    <div className='text-lg font-bold text-rose-400 flex items-center justify-center gap-1'>
                      <Activity className='h-4 w-4' />
                      Early Triggers
                    </div>
                    <div className='text-[10px] text-muted-foreground mt-1'>Missed EMI risk, delayed wages, sudden hospital spend</div>
                  </div>
                  <div className='p-4 bg-white/10 border border-white/20 rounded-md'>
                    <div className='text-lg font-bold text-emerald-400 flex items-center justify-center gap-1'>
                      <HeartHandshake className='h-4 w-4' />
                      Proactive Restructuring
                    </div>
                    <div className='text-[10px] text-muted-foreground mt-1'>3-month grace periods, tenure extension & field officer visits</div>
                  </div>
                </div>
                <p className='text-xs text-muted-foreground leading-relaxed'>
                  Fairness calibration offsets boost demographic parity for non-metro borrowers, ensuring automated systems never unfairly penalize regional income volatility.
                </p>
              </div>
              <div className='flex items-center justify-center p-8 bg-white/[0.01] border border-[#222] rounded-lg relative'>
                <div className='absolute inset-0 bg-white/[0.01] blur-[50px] pointer-events-none' />
                <HeartHandshake className='h-40 w-40 text-white/10' />
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* ETHICAL SAFEGUARDS & REGULATORY COMPLIANCE SECTION */}
      <section className='min-h-screen py-24 px-8 relative flex flex-col justify-center border-t border-[#1a1a1a] bg-black'>
        <div className='max-w-5xl mx-auto space-y-12 text-center'>
          <div className='space-y-4'>
            <span className='text-xs font-mono text-amber-400/90 uppercase tracking-widest'>Ethical Safeguards & RBI Compliance</span>
            <h2 className='text-4xl sm:text-5xl font-signifier tracking-tight uppercase leading-[1.1]'>
              SAFEGUARDS BY DESIGN. TRUSTED FOR BHARAT.
            </h2>
            <p className='text-sm text-muted-foreground max-w-2xl mx-auto font-light'>
              Full adherence to India's regulatory frameworks, ensuring zero predatory practices and complete data privacy.
            </p>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-3 gap-6 text-left'>
            <div className='p-6 bg-white/[0.01] border border-[#222] rounded-md space-y-3 hover:border-[#333] transition-all'>
              <ShieldCheck className='h-8 w-8 text-amber-400' />
              <h4 className='text-sm font-semibold text-white'>DPDP Act 2023 Consent</h4>
              <p className='text-xs text-muted-foreground leading-relaxed font-light'>
                Granular, purpose-limited consent per data source with real-time revocation rights. Zero unauthorized background scraping.
              </p>
            </div>
            <div className='p-6 bg-white/[0.01] border border-[#222] rounded-md space-y-3 hover:border-[#333] transition-all'>
              <Cpu className='h-8 w-8 text-emerald-400' />
              <h4 className='text-sm font-semibold text-white'>RBI Data Localization</h4>
              <p className='text-xs text-muted-foreground leading-relaxed font-light'>
                100% domestic Indian data storage, SHA-256 tokenization, and immutable PostgreSQL audit trails for full bank inspection.
              </p>
            </div>
            <div className='p-6 bg-white/[0.01] border border-[#222] rounded-md space-y-3 hover:border-[#333] transition-all'>
              <HeartHandshake className='h-8 w-8 text-sky-400' />
              <h4 className='text-sm font-semibold text-white'>Non-Predatory Guardrails</h4>
              <p className='text-xs text-muted-foreground leading-relaxed font-light'>
                Algorithmic hard-caps suppress debt upsells to financially stressed users. Enforces demographic parity (DIR ≥ 0.80).
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
              <span className='text-[10px] text-amber-400 font-mono tracking-widest uppercase block'>
                ONLINE BANKING FOR ALL • BHARAT EDITION
              </span>
              <h2 className='text-4xl sm:text-6xl font-signifier tracking-tight leading-[1.0] uppercase text-white'>
                Hyper-personalized<br />banking for everyone.
              </h2>
              <p className='text-xs text-muted-foreground font-mono mt-4'>
                AltGrade • AI-Powered Lending & Inclusion Platform • Team Minions
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
                  onClick={() => navigate({ to: '/sign-in' })}
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
                fontFamily="'Chakra Petch', sans-serif" 
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
