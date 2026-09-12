import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Vapi from '@vapi-ai/web'
import { PhoneCall, PhoneOff, Smartphone } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface VapiIvrProps {
  apiKey?: string
  assistantId?: string
}

export function VapiIvrModal({ apiKey, assistantId }: VapiIvrProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle')
  const [activeKeypad, setActiveKeypad] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const vapiRef = useRef<any>(null)

  useEffect(() => {
    if (apiKey) {
      try {
        const vapi = new Vapi(apiKey)
        vapiRef.current = vapi

        vapi.on('call-start', () => {
          setCallState('connected')
          addLog('Vapi IVR Agent connected. Playing audio prompt...')
        })

        vapi.on('call-end', () => {
          setCallState('ended')
          addLog('Call ended by Vapi Agent.')
        })

        vapi.on('message', (message: any) => {
          if (message.type === 'transcript') {
            addLog(`${message.role}: ${message.transcript}`)
          }
        })

        vapi.on('error', (err: any) => {
          console.error('Vapi Error:', err)
          addLog(`Error: ${err.message || 'Call failed'}`)
        })
      } catch (e) {
        console.error('Vapi init failed:', e)
      }
    }
  }, [apiKey])

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev.slice(-6), msg])
  }

  const handleStartCall = async () => {
    setCallState('calling')
    addLog('Dialing Toll-Free IVR: 1800-258-4723...')

    if (vapiRef.current && assistantId) {
      try {
        await vapiRef.current.start(assistantId)
      } catch (err) {
        console.error('Vapi call start failed, falling back to simulated IVR:', err)
        startSimulatedIvr()
      }
    } else {
      startSimulatedIvr()
    }
  }

  const startSimulatedIvr = () => {
    setTimeout(() => {
      setCallState('connected')
      addLog('IVR Voice: Namaste! Welcome to AltGrade Farmers Credit Helpline.')
      addLog('IVR Voice: Press 1 for Hindi, Press 2 for Gujarati, Press 3 for English.')
    }, 1500)
  }

  const handleKeyPress = (digit: string) => {
    setActiveKeypad(digit)
    setTimeout(() => setActiveKeypad(null), 300)

    if (callState !== 'connected') return

    addLog(`Keypad DTMF Sent: [${digit}]`)

    if (digit === '1') {
      addLog('IVR Voice: Hindi selected. Question 1: Do you hold a Kisan Credit Card (KCC)? Press 1 for Yes, 2 for No.')
    } else if (digit === '2') {
      addLog('IVR Voice: Gujarati selected. Question 1: શું તમારી પાસે કિસાન ક્રેડિટ કાર્ડ (KCC) છે? હા માટે 1, ના માટે 2 દબાવો.')
    } else if (digit === '3') {
      addLog('IVR Voice: English selected. Question 1: What is your estimated harvest income? Press 1 for <1L, 2 for >1L.')
    }
  }

  const handleEndCall = () => {
    if (vapiRef.current) {
      try {
        vapiRef.current.stop()
      } catch (e) {
        // ignore
      }
    }
    setCallState('ended')
    addLog('Call disconnected.')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-emerald-500/40 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/40 hover:text-white">
          <Smartphone className="h-4 w-4" />
          {t('ivr.button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-zinc-800 bg-zinc-950 text-white sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold sm:text-lg">
            <PhoneCall className="h-5 w-5 text-emerald-400" />
            {t('ivr.modalTitle')}
          </DialogTitle>
          <p className="text-xs text-zinc-400">{t('ivr.modalDesc')}</p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Status Indicator */}
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${
                callState === 'connected' ? 'bg-emerald-500 animate-pulse' :
                callState === 'calling' ? 'bg-amber-500 animate-ping' : 'bg-zinc-600'
              }`} />
              <span className="text-xs font-semibold capitalize text-zinc-200">
                {callState === 'idle' ? 'Ready to Call' : callState}
              </span>
            </div>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">
              Toll Free 1800-258-4723
            </Badge>
          </div>

          {/* Interactive DTMF Phone Keypad */}
          <div className="mx-auto max-w-[240px] rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-inner">
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeyPress(key)}
                  className={`flex h-12 flex-col items-center justify-center rounded-xl font-bold transition-colors ${
                    activeKeypad === key
                      ? 'bg-emerald-500 text-black'
                      : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 active:scale-95'
                  }`}
                >
                  <span className="text-sm">{key}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Call Logs / IVR Audio Feed */}
          <div className="h-32 overflow-y-auto rounded-xl border border-zinc-850 bg-black/60 p-3 text-[11px] font-mono text-zinc-300 space-y-1 scrollbar-thin">
            {logs.length === 0 ? (
              <p className="text-zinc-600 italic">Call logs will appear here when call starts...</p>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className={log.startsWith('IVR') ? 'text-emerald-400' : 'text-zinc-300'}>
                  {log}
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            {callState !== 'connected' && callState !== 'calling' ? (
              <Button
                onClick={handleStartCall}
                className="w-full gap-2 bg-emerald-500 text-black font-semibold hover:bg-emerald-400"
              >
                <PhoneCall className="h-4 w-4" />
                {t('ivr.startCall')}
              </Button>
            ) : (
              <Button
                onClick={handleEndCall}
                variant="destructive"
                className="w-full gap-2 font-semibold"
              >
                <PhoneOff className="h-4 w-4" />
                {t('ivr.endCall')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
