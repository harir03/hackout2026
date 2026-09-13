import { useEffect, useState, useMemo, useRef } from 'react'
import { useSearch, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ShieldAlert,
  MessageSquare,
  Loader2,
  IndianRupee,
  Send,
  Bot,
  User,
  ChevronDown,
  Volume2,
  VolumeX,
  PhoneCall,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
  Wallet,
  ArrowUpRight,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  fetchScore,
  fetchScoreById,
  fetchUserNotifications,
  submitInterviewSummary,
  fetchPersonalization,
  fetchOfficerMessages,
} from '@/lib/api'
import type { ScoreResponse, ShapFeature } from '@/lib/types'

function bandColor(band: string): string {
  const colors: Record<string, string> = {
    Excellent: 'text-brand-blue',
    Good: 'text-graphite',
    Fair: 'text-slate',
    Poor: 'text-rust',
  }
  return colors[band] || 'text-destructive'
}

function scoreGradient(score: number): string {
  if (score >= 700) return '#0284c7'
  if (score >= 500) return '#4b5563'
  return '#dc2626'
}

function ShapBar({ feature, maxAbs }: { feature: ShapFeature; maxAbs: number }) {
  const [expanded, setExpanded] = useState(false)
  const pct = Math.min((Math.abs(feature.points) / maxAbs) * 100, 100)
  const positive = feature.points > 0

  return (
    <div className='mb-1'>
      <button
        type='button'
        onClick={() => setExpanded(!expanded)}
        className='flex items-center gap-3 py-1.5 w-full text-left hover:bg-muted/30 rounded-md px-1 transition-colors group'
      >
        <div className='w-40 shrink-0 text-right text-xs font-medium text-muted-foreground truncate'>
          {feature.label.replace(/^(bank_|telecom_|ecom_|loc_|psych_|merchant_)/, '')}
        </div>
        <div className='flex flex-1 items-center gap-1'>
          <div className='relative flex h-5 w-full items-center'>
            <div className='absolute left-1/2 h-full w-px bg-border' />
            {positive ? (
              <div
                className='absolute left-1/2 h-4 rounded-r bg-brand-blue/80'
                style={{ width: `${pct / 2}%` }}
              />
            ) : (
              <div
                className='absolute h-4 rounded-l bg-rust/80'
                style={{
                  width: `${pct / 2}%`,
                  right: '50%',
                  }}
                />
              )}
            </div>
          </div>
          <div className='w-20 shrink-0 text-right'>
            <span
              className={`text-xs font-semibold ${
                positive
                  ? 'text-brand-blue'
                  : 'text-rust'
              }`}
            >
            {feature.points > 0 ? '+' : ''}
            {feature.points.toFixed(1)}
          </span>
        </div>
        <Badge variant='outline' className='w-28 justify-center text-xs'>
          {feature.worker}
        </Badge>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && feature.explanation && (
        <div className='ml-[11rem] mr-2 mt-1 mb-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 animate-fade-up'>
          <p className='text-xs text-muted-foreground leading-relaxed'>{feature.explanation}</p>
        </div>
      )}
    </div>
  )
}


function sanitizeText(text: string): string {
  if (!text) return ''
  return text.replace(/_+$/, '').trim()
}

const SCORE_I18N = {
  en: {
    pageTitle: 'Your Sanctioned Credit Result',
    pageSubtitle: 'Verified alternative financial footprint • Pre-approved credit limit & government subsidies',
    technicalView: 'Technical Breakdown (Advanced)',
    simpleView: 'Simple Banking View',
    sanctionApproved: 'Loan Sanction Approved',
    scoreCalculated: 'Score Calculated',
    subsidizedApr: '10.5% Subsidized APR',
    tenure36: '36 Months Tenure',
    listen: 'Listen',
    pause: 'Pause',
    outOf850: 'Out of 850',
    eligibleBanking: 'Eligible for Regulated Banking Products',
    highTrust: 'High Financial Trust',
    goodStanding: 'Good Financial Standing',
    preApprovedLimit: 'Pre-Approved Credit Limit',
    speakLoanOfficer: 'Speak with Loan Officer',
    askAiAdvisor: 'Ask AI Credit Advisor →',
    whyQualified: 'Why You Qualified',
    officerNoteTitle: "Officer Anand's Advisory Note",
    topSchemesTitle: 'Top Matched Schemes',
    topSchemesSubtitle: 'Subsidized government safety nets and credit lines selected for your economic profile',
    match: 'Match',
    portal: 'Portal',
    enroll: 'Enroll',
    officerModalTitle: 'Connect with Field Loan Officer',
    officerModalDesc: 'A local Business Correspondent or MFI Field Officer will assist you with paperwork and government subsidy enrollment.',
    assignedOfficer: 'Assigned Branch Officer',
    officerDetails: 'Anand Varma (District MFI Agent • Kovvur/Madurai Zone)',
    availableVisit: 'Available for in-person village visit',
    contactNumber: 'Your Contact Number:',
    confirmFieldVisit: 'Confirm Field Visit Request',
    requestDispatched: 'Request Dispatched',
    requestDispatchedDesc: 'Your local field representative will call you or visit your village location within 24–48 hours.',
    close: 'Close',
    whyQualifiedFarmer: 'Based on your long-term land stability and disciplined utility payments, you qualify for subsidized agricultural credit.',
    whyQualifiedMsme: 'You qualify for up to ₹200,000 collateral-free MUDRA business credit.',
    whyQualifiedGig: 'Based on your platform payout consistency, you qualify for instant revolving credit lines.',
    whyQualifiedGeneral: 'Based on your verified digital payment discipline, you qualify for low-interest credit.',
    officerNoteFarmer: "We've pre-attached PMFBY crop insurance and activated a 60-day harvest grace period on your repayments.",
    officerNoteMsme: "We've pre-approved collateral-free MUDRA working capital with flexible turnover-aligned repayments.",
    officerNoteGig: "We've enabled a zero-prepayment digital credit facility with daily platform earnings sweep.",
    officerNoteGeneral: "We've verified your digital payment discipline and recommended instant collateral-free disbursement.",
  },
  gu: {
    pageTitle: 'તમારું મંજૂર થયેલ ક્રેડિટ પરિણામ',
    pageSubtitle: 'ચકાસાયેલ વૈકલ્પિક નાણાકીય માહિતી • પૂર્વ-મંજૂર ક્રેડિટ મર્યાદા અને સરકારી સબસિડી',
    technicalView: 'તકનીકી વિશ્લેષણ (વિગતવાર)',
    simpleView: 'સરળ બેંકિંગ દૃશ્ય',
    sanctionApproved: 'લોન મંજૂરી સ્વીકૃત',
    scoreCalculated: 'સ્કોર ગણતરી પૂર્ણ',
    subsidizedApr: '10.5% સબસિડીયુક્ત વાર્ષિક વ્યાજદર',
    tenure36: '36 મહિનાની મુદત',
    listen: 'સાંભળો',
    pause: 'રોકો',
    outOf850: '850 માંથી',
    eligibleBanking: 'નિયમનકારી બેંકિંગ ઉત્પાદનો માટે પાત્ર',
    highTrust: 'ઉચ્ચ નાણાકીય વિશ્વસનીયતા',
    goodStanding: 'સારી નાણાકીય સ્થિતિ',
    preApprovedLimit: 'પૂર્વ-મંજૂર ક્રેડિટ મર્યાદા',
    speakLoanOfficer: 'લોન અધિકારી સાથે વાત કરો',
    askAiAdvisor: 'એઆઈ ક્રેડિટ સલાહકારને પૂછો →',
    whyQualified: 'તમે શા માટે પાત્ર બન્યા',
    officerNoteTitle: 'અધિકારી આનંદની સલાહ નોંધ',
    topSchemesTitle: 'શ્રેષ્ઠ મેળ ખાતી સરકારી યોજનાઓ',
    topSchemesSubtitle: 'તમારી આર્થિક પ્રોફાઇલ માટે પસંદ કરાયેલ સબસિડીયુક્ત સરકારી સહાય અને ક્રેડિટ સુવિધાઓ',
    match: 'મેળ',
    portal: 'પોર્ટલ',
    enroll: 'નોંધણી કરો',
    officerModalTitle: 'ફિલ્ડ લોન અધિકારી સાથે જોડાઓ',
    officerModalDesc: 'સ્થાનિક બિઝનેસ કોરેસ્પોન્ડન્ટ અથવા એમએફઆઈ ફિલ્ડ અધિકારી તમને કાગળકામ અને સરકારી સબસિડી નોંધણીમાં મદદ કરશે.',
    assignedOfficer: 'સોંપાયેલ શાખા અધિકારી',
    officerDetails: 'આનંદ વર્મા (જિલ્લા એમએફઆઈ એજન્ટ • કોવ્વુર/મદુરાઇ ઝોન)',
    availableVisit: 'રૂબરૂ ગામ મુલાકાત માટે ઉપલબ્ધ',
    contactNumber: 'તમારો સંપર્ક નંબર:',
    confirmFieldVisit: 'રૂબરૂ મુલાકાતની વિનંતી કન્ફર્મ કરો',
    requestDispatched: 'વિનંતી મોકલાઈ ગઈ છે',
    requestDispatchedDesc: 'તમારા સ્થાનિક ફિલ્ડ પ્રતિનિધિ 24-48 કલાકમાં તમને કૉલ કરશે અથવા તમારા ગામની મુલાકાત લેશે.',
    close: 'બંધ કરો',
    whyQualifiedFarmer: 'તમારા લાંબા ગાળાના રહેઠાણ અને નિયમિત બિલ ચુકવણીના આધારે, તમે સબસિડીયુક્ત કૃષિ લોન માટે પાત્ર છો.',
    whyQualifiedMsme: 'તમે ₹2,00,000 સુધીની જામીનમુક્ત મુદ્રા બિઝનેસ લોન માટે પાત્ર છો.',
    whyQualifiedGig: 'તમારી પ્લેટફોર્મ કમાણી સાતત્યના આધારે, તમે ત્વરિત ક્રેડિટ લાઇન માટે પાત્ર છો.',
    whyQualifiedGeneral: 'તમારી ચકાસાયેલ ચુકવણી શિસ્તના આધારે, તમે ઓછા વ્યાજની લોન માટે પાત્ર છો.',
    officerNoteFarmer: 'અમે પીએમએફબીવાય પાક વીમો જોડી દીધો છે અને ચુકવણી પર 60 દિવસનો લણણી ગ્રેસ પીરિયડ સક્રિય કર્યો છે.',
    officerNoteMsme: 'અમે ટર્નઓવર-આધારિત લવચીક ચુકવણી સાથે જામીનમુક્ત મુદ્રા વર્કિંગ કેપિટલ મંજૂર કર્યું છે.',
    officerNoteGig: 'અમે દૈનિક કમાણી સ્વીપ સાથે શૂન્ય-પ્રીપેમેન્ટ ડિજિટલ ક્રેડિટ સુવિધા સક્ષમ કરી છે.',
    officerNoteGeneral: 'અમે તમારી નિયમિત ચુકવણી ચકાસી છે અને ત્વરિત જામીનમુક્ત વિતરણની ભલામણ કરી છે.',
  },
  hi: {
    pageTitle: 'आपका स्वीकृत क्रेडिट परिणाम',
    pageSubtitle: 'सत्यापित वैकल्पिक वित्तीय पदचिह्न • पूर्व-स्वीकृत क्रेडिट सीमा और सरकारी सब्सिडी',
    technicalView: 'तकनीकी विश्लेषण (उन्नत)',
    simpleView: 'सरल बैंकिंग दृश्य',
    sanctionApproved: 'ऋण स्वीकृति स्वीकृत',
    scoreCalculated: 'स्कोर गणना पूर्ण',
    subsidizedApr: '10.5% रियायती वार्षिक ब्याज दर',
    tenure36: '36 महीने की अवधि',
    listen: 'सुनें',
    pause: 'रोकें',
    outOf850: '850 में से',
    eligibleBanking: 'विनियमित बैंकिंग उत्पादों के लिए पात्र',
    highTrust: 'उच्च वित्तीय विश्वास',
    goodStanding: 'अच्छी वित्तीय स्थिति',
    preApprovedLimit: 'पूर्व-स्वीकृत क्रेडिट सीमा',
    speakLoanOfficer: 'ऋण अधिकारी से बात करें',
    askAiAdvisor: 'एआई क्रेडिट सलाहकार से पूछें →',
    whyQualified: 'आप क्यों पात्र बने',
    officerNoteTitle: 'अधिकारी आनंद का परामर्श नोट',
    topSchemesTitle: 'शीर्ष अनुशंसित सरकारी योजनाएं',
    topSchemesSubtitle: 'आपकी आर्थिक प्रोफ़ाइल के लिए चुनी गई रियायती सरकारी सुरक्षा योजनाएं और ऋण सुविधाएं',
    match: 'मैच',
    portal: 'पोर्टल',
    enroll: 'आवेदन करें',
    officerModalTitle: 'फील्ड ऋण अधिकारी से जुड़ें',
    officerModalDesc: 'एक स्थानीय व्यापार प्रतिनिधि या एमएफआई फील्ड अधिकारी कागजी कार्रवाई और सरकारी सब्सिडी नामांकन में आपकी सहायता करेगा।',
    assignedOfficer: 'आवंटित शाखा अधिकारी',
    officerDetails: 'आनंद वर्मा (जिला एमएफआई एजेंट • कोव्वुर/मदुरै जोन)',
    availableVisit: 'व्यक्तिगत गांव यात्रा के लिए उपलब्ध',
    contactNumber: 'आपका संपर्क नंबर:',
    confirmFieldVisit: 'फील्ड विज़िट अनुरोध की पुष्टि करें',
    requestDispatched: 'अनुरोध भेज दिया गया',
    requestDispatchedDesc: 'आपका स्थानीय प्रतिनिधि 24-48 घंटों के भीतर आपको कॉल करेगा या आपके गांव का दौरा करेगा।',
    close: 'बंद करें',
    whyQualifiedFarmer: 'आपकी दीर्घकालिक भूमि स्थिरता और अनुशासित बिल भुगतान के आधार पर, आप रियायती कृषि ऋण के पात्र हैं।',
    whyQualifiedMsme: 'आप ₹2,00,000 तक के संपार्श्विक-मुक्त मुद्रा व्यापार ऋण के पात्र हैं।',
    whyQualifiedGig: 'आपकी नियमित प्लेटफॉर्म डिलीवरी कमाई के आधार पर, आप त्वरित क्रेडिट लाइन के पात्र हैं।',
    whyQualifiedGeneral: 'आपके सत्यापित भुगतान अनुशासन के आधार पर, आप कम ब्याज वाले ऋण के पात्र हैं।',
    officerNoteFarmer: 'हमने पीएमएफबीवाई फसल बीमा जोड़ दिया है और पुनर्भुगतान पर 60 दिनों की फसल रियायत अवधि सक्रिय की है।',
    officerNoteMsme: 'हमने टर्नओवर-संरेखित लचीले पुनर्भुगतान के साथ संपार्श्विक-मुक्त मुद्रा कार्यशील पूंजी स्वीकृत की है।',
    officerNoteGig: 'हमने दैनिक प्लेटफॉर्म कमाई स्वीप के साथ शून्य-प्रीपेमेंट डिजिटल क्रेडिट सुविधा सक्षम की है।',
    officerNoteGeneral: 'हमने आपके नियमित डिजिटल भुगतान को सत्यापित किया है और त्वरित संपार्श्विक-मुक्त संवितरण की सिफारिश की है।',
  },
  ta: {
    pageTitle: 'உங்கள் அனுமதிக்கப்பட்ட கடன் முடிவு',
    pageSubtitle: 'சரிபார்க்கப்பட்ட மாற்று நிதி விவரங்கள் • முன் அங்கீகரிக்கப்பட்ட கடன் வரம்பு & அரசு மானியங்கள்',
    technicalView: 'தொழில்நுட்ப பகுப்பாய்வு (மேம்பட்ட)',
    simpleView: 'எளிய வங்கி பார்வை',
    sanctionApproved: 'கடன் அனுமதி வழங்கப்பட்டது',
    scoreCalculated: 'மதிப்பீடு கணக்கிடப்பட்டது',
    subsidizedApr: '10.5% மானிய வருடாந்திர வட்டி விகிதம்',
    tenure36: '36 மாத தவணைக்காலம்',
    listen: 'கேளுங்கள்',
    pause: 'நிறுத்து',
    outOf850: '850 இல்',
    eligibleBanking: 'ஒழுங்குபடுத்தப்பட்ட வங்கி தயாரிப்புகளுக்கு தகுதியுடையவர்',
    highTrust: 'உயர் நிதி நம்பிக்கை',
    goodStanding: 'நல்ல நிதி நிலை',
    preApprovedLimit: 'முன் அங்கீகரிக்கப்பட்ட கடன் வரம்பு',
    speakLoanOfficer: 'கடன் அதிகாரியுடன் பேசுங்கள்',
    askAiAdvisor: 'AI கடன் ஆலோசகரிடம் கேளுங்கள் →',
    whyQualified: 'நீங்கள் ஏன் தகுதி பெற்றீர்கள்',
    officerNoteTitle: 'அதிகாரி ஆனந்தின் ஆலோசனை குறிப்பு',
    topSchemesTitle: 'சிறந்த அரசு திட்டங்கள்',
    topSchemesSubtitle: 'உங்கள் பொருளாதார நிலைக்கு தேர்ந்தெடுக்கப்பட்ட மானிய அரசு பாதுகாப்பு மற்றும் கடன் திட்டங்கள்',
    match: 'பொருத்தம்',
    portal: 'இணையதளம்',
    enroll: 'விண்ணப்பிக்கவும்',
    officerModalTitle: 'கள கடன் அதிகாரியுடன் இணையுங்கள்',
    officerModalDesc: 'உள்ளூர் வணிக நிருபர் அல்லது கள அதிகாரி உங்களுக்கு ஆவணங்கள் மற்றும் அரசு திட்டங்களில் விண்ணப்பிக்க உதவுவார்.',
    assignedOfficer: 'ஒதுக்கப்பட்ட கிளை அதிகாரி',
    officerDetails: 'ஆனந்த் வர்மா (மாவட்ட கள முகவர் • மதுரை மண்டலம்)',
    availableVisit: 'நேரடி கிராம வருகைக்கு கிடைக்கும்',
    contactNumber: 'உங்கள் தொடர்பு எண்:',
    confirmFieldVisit: 'கள வருகை கோரிக்கையை உறுதிப்படுத்தவும்',
    requestDispatched: 'கோரிக்கை அனுப்பப்பட்டது',
    requestDispatchedDesc: 'உங்கள் உள்ளூர் பிரதிநிதி 24-48 மணி நேரத்திற்குள் உங்களை தொடர்புகொள்வார் அல்லது கிராமத்திற்கு வருவார்.',
    close: 'மூடுக',
    whyQualifiedFarmer: 'உங்கள் நீண்ட கால நில நிலைத்தன்மை மற்றும் முறையான கட்டணங்களின் அடிப்படையில் விவசாயக் கடனுக்கு தகுதியுடையவர்.',
    whyQualifiedMsme: 'நீங்கள் ₹2,00,000 வரை பிணையில்லா முத்ரா வணிகக் கடனுக்கு தகுதியுடையவர்.',
    whyQualifiedGig: 'உங்கள் வழக்கமான வருவாயின் அடிப்படையில் விரைவு கடனுக்கு தகுதியுடையவர்.',
    whyQualifiedGeneral: 'உங்கள் முறையான கட்டணங்களின் அடிப்படையில் குறைந்த வட்டிக் கடனுக்கு தகுதியுடையவர்.',
    officerNoteFarmer: 'பயிர் காப்பீடு இணைக்கப்பட்டுள்ளது மற்றும் 60 நாட்கள் அறுவடை சலுகைக்காலம் செயல்படுத்தப்பட்டுள்ளது.',
    officerNoteMsme: 'நெகிழ்வான தவணைகளுடன் பிணையில்லா முத்ரா மூலதன கடன் முன் அனுமதிக்கப்பட்டுள்ளது.',
    officerNoteGig: 'முன்கூட்டியே கட்டண அபராதம் இல்லாத எளிய கடன் வசதி செயல்படுத்தப்பட்டுள்ளது.',
    officerNoteGeneral: 'உங்கள் கட்டண ஒழுங்கு சரிபார்க்கப்பட்டு உடனடி பிணையில்லா கடன் பரிந்துரைக்கப்பட்டுள்ளது.',
  },
}

export function ScorePage() {
  const { t, i18n } = useTranslation()
  const search = useSearch({ strict: false }) as {
    userId?: string
    sources?: string
    consentId?: string
    phone?: string
    answers?: string
    timeTaken?: string
    changesCount?: string
    locationHistory?: string
  }
  const userId = search.userId || 'test-user-001'
  const consentedSources = search.sources?.split(',').filter(Boolean) ?? []
  const consentId = search.consentId
  const phone = search.phone || ''
  const answers = search.answers
  const timeTaken = search.timeTaken ? parseInt(search.timeTaken, 10) : undefined
  const changesCount = search.changesCount ? parseInt(search.changesCount, 10) : undefined
  const locationHistory = search.locationHistory

  const [data, setData] = useState<ScoreResponse | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pipelineStep, setPipelineStep] = useState(0)
  const [notification, setNotification] = useState<{
    has_notification: boolean
    decision?: string
    interest_rate?: number
    terms?: string
  } | null>(null)

  // AI Interview State
  const [interviewOpen, setInterviewOpen] = useState(false)
  const [interviewStep, setInterviewStep] = useState(0)
  const [interviewMessages, setInterviewMessages] = useState<Array<{ role: 'bot' | 'user'; content: string }>>([])
  const [interviewInput, setInterviewInput] = useState('')
  const [isInterviewSubmitted, setIsInterviewSubmitted] = useState(false)
  const [submittingSummary, setSubmittingSummary] = useState(false)
  const [userAnswersLog, setUserAnswersLog] = useState<string[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  const activePipelines = useMemo(() => {
    return consentedSources.map((s) => {
      if (s === 'd1_bank') return 'Bank & UPI Transactions'
      if (s === 'd2_telecom') return 'Telecom Payment History'
      if (s === 'd3_ecommerce') return 'E-commerce Activity'
      if (s === 'd4_location') return 'Geolocation Stability'
      if (s === 'd5_questionnaire') return 'Psychometric Assessment'
      if (s === 'd6_merchant') return 'Merchant & GST Records'
      return s
    })
  }, [consentedSources])

  useEffect(() => {
    const request = consentedSources.length > 0
      ? fetchScore(userId, consentedSources, consentId, phone, answers, timeTaken, changesCount, locationHistory)
      : fetchScoreById(userId, consentId)
    request
      .then((res) => {
        setData(res)
        setDataLoaded(true)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })

    fetchUserNotifications(userId)
      .then((n) => setNotification(n))
      .catch(() => {})

    fetchPersonalization(userId)
      .then((p) => setPersonalizeData(p))
      .catch((err) => console.error("Failed to load personalization:", err))

    fetchOfficerMessages(userId)
      .then((res) => {
        if (res?.messages) setOfficerMessages(res.messages)
      })
      .catch((err) => console.warn("Failed to load officer messages:", err))
  }, [userId])

  const [personalizeData, setPersonalizeData] = useState<any | null>(null)
  const [officerMessages, setOfficerMessages] = useState<Array<{
    message: string
    category: string
    channel: string
    officer_name: string
    timestamp: string
    status: string
  }>>([])
  const [viewMode, setViewMode] = useState<'simple' | 'technical'>('simple')
  const [audioLang, setAudioLang] = useState<'gu' | 'hi' | 'ta' | 'en'>(() => {
    const l = i18n.language?.split('-')[0]
    if (l === 'gu' || l === 'hi' || l === 'ta' || l === 'en') return l as any
    return 'gu'
  })
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [officerModalOpen, setOfficerModalOpen] = useState(false)
  const [officerRequested, setOfficerRequested] = useState(false)

  // Synchronize when i18n language changes globally
  useEffect(() => {
    const l = i18n.language?.split('-')[0]
    if (l === 'gu' || l === 'hi' || l === 'ta' || l === 'en') {
      setAudioLang(l as any)
    }
  }, [i18n.language])

  const handleLanguageSwitch = (code: 'gu' | 'hi' | 'ta' | 'en') => {
    setAudioLang(code)
    i18n.changeLanguage(code)
    if (isPlayingAudio) {
      window.speechSynthesis?.cancel()
      setIsPlayingAudio(false)
    }
  }

  const cur = SCORE_I18N[audioLang] || SCORE_I18N.en
  const isSanctionApproved = notification?.decision === 'approved' || (data && data.score >= 500)
  const seg = personalizeData?.segment?.segment || (userId.includes('msme') ? 'msme' : userId.includes('farmer') ? 'farmer' : 'msme')

  const whyQualifiedText = audioLang === 'en' && personalizeData?.borrower_summary?.plain_summary
    ? personalizeData.borrower_summary.plain_summary
    : seg === 'msme'
    ? cur.whyQualifiedMsme
    : seg === 'farmer'
    ? cur.whyQualifiedFarmer
    : seg === 'gig_worker'
    ? cur.whyQualifiedGig
    : cur.whyQualifiedGeneral

  const officerNoteText = officerMessages?.[0]?.message
    || (audioLang === 'en' && personalizeData?.borrower_summary?.officer_note
      ? personalizeData.borrower_summary.officer_note
      : seg === 'msme'
      ? cur.officerNoteMsme
      : seg === 'farmer'
      ? cur.officerNoteFarmer
      : seg === 'gig_worker'
      ? cur.officerNoteGig
      : cur.officerNoteGeneral)

  const handlePlayAudio = (langToPlay?: 'gu' | 'hi' | 'ta' | 'en') => {
    const targetLang = langToPlay || audioLang
    if (isPlayingAudio) {
      window.speechSynthesis?.cancel()
      setIsPlayingAudio(false)
      return
    }

    if (!('speechSynthesis' in window)) {
      toast.error('Voice synthesis not supported in this browser')
      return
    }

    window.speechSynthesis.cancel()
    const script = personalizeData?.borrower_summary?.audio_scripts?.[targetLang] ||
      (targetLang === 'gu'
        ? (seg === 'msme' ? cur.whyQualifiedMsme + '. ' + cur.officerNoteMsme : cur.whyQualifiedFarmer + '. ' + cur.officerNoteFarmer)
        : targetLang === 'hi'
        ? (seg === 'msme' ? cur.whyQualifiedMsme + '. ' + cur.officerNoteMsme : cur.whyQualifiedFarmer + '. ' + cur.officerNoteFarmer)
        : personalizeData?.borrower_summary?.plain_summary) ||
      `Your AltGrade credit score is ${data?.score || 700}. You qualify for loan approval.`

    const utterance = new SpeechSynthesisUtterance(script)
    const langCodes: Record<string, string> = {
      gu: 'gu-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      en: 'en-IN',
    }
    utterance.lang = langCodes[targetLang] || 'en-US'
    utterance.rate = 0.92

    utterance.onend = () => setIsPlayingAudio(false)
    utterance.onerror = () => setIsPlayingAudio(false)

    setIsPlayingAudio(true)
    window.speechSynthesis.speak(utterance)
  }

  useEffect(() => {
    if (activePipelines.length > 0) {
      const interval = setInterval(() => {
        setPipelineStep((prev) => {
          if (prev >= activePipelines.length - 1) {
            clearInterval(interval)
            const checkDataInterval = setInterval(() => {
              if (dataLoaded || error) {
                clearInterval(checkDataInterval)
                setLoading(false)
              }
            }, 100)
            return prev
          }
          return prev + 1
        })
      }, 1200)
      return () => clearInterval(interval)
    } else {
      setLoading(false)
    }
  }, [activePipelines, dataLoaded, error])

  const sortedShap = useMemo(() => {
    if (!data) return []
    return [...data.shap_details].sort(
      (a, b) => Math.abs(b.points) - Math.abs(a.points)
    )
  }, [data])

  const maxAbs = useMemo(() => {
    if (!sortedShap.length) return 1
    return Math.abs(sortedShap[0].points)
  }, [sortedShap])

  const interviewQuestions = useMemo(() => {
    if (!data) return []

    const feat = (label: string) => data.shap_details.find(f => f.label === label)
    const val = (label: string) => feat(label)?.feature_value ?? 0

    const formatInr = (v: number) => {
      if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`
      if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`
      if (v >= 1_000) return `₹${(v / 1_000).toFixed(1)}K`
      return `₹${v.toFixed(0)}`
    }

    const questions: Array<{ type: 'conflict' | 'financial' | 'verification'; text: string }> = []

    const bankInflow = val('bank_avg_monthly_inflow')
    const bankVolatility = val('bank_balance_volatility')
    const telecomMissed = val('telecom_missed_payments')
    const psychEngagement = val('psych_engagement_score')
    const completionTime = val('psych_completion_time_sec')
    const straightLine = val('psych_straight_line_ratio')
    const bankPaymentReg = val('bank_payment_regularity')

    const emailLower = userId.toLowerCase()
    const isFarmer = emailLower.includes('farmer')
    const isMsme = emailLower.includes('msme')

    if (isFarmer) {
      if (bankVolatility > 0.3) {
        questions.push({ type: 'conflict', text:
          `Your bank balance fluctuates by ${(bankVolatility * 100).toFixed(0)}% month-to-month. For agricultural income, seasonal variation is expected — but we need to understand your harvest cycle. Which months do you receive harvest income, and which months have the lowest cash flow? Do you receive PM-Kisan installments regularly?`
        })
      }

      if (psychEngagement < 60) {
        questions.push({ type: 'conflict', text:
          `Your psychometric assessment scored ${psychEngagement.toFixed(0)}/100 on financial discipline. As a farmer, understanding crop loan terms and KCC repayment schedules is important. Did you rush through the questionnaire, or do you find financial planning difficult during non-harvest months?`
        })
      }

      if (completionTime < 25 && straightLine > 0.4) {
        questions.push({ type: 'conflict', text:
          `You completed the assessment in ${completionTime.toFixed(0)} seconds with ${(straightLine * 100).toFixed(0)}% identical answers. This suggests you may not have read the questions carefully. Why should we trust your self-reported financial attitudes?`
        })
      }

      if (telecomMissed > 1) {
        questions.push({ type: 'conflict', text:
          `You have ${Math.round(telecomMissed)} missed telecom payments. Even with seasonal agricultural income, a small phone recharge should be manageable. Were these missed during a difficult harvest season, or is it a general pattern?`
        })
      }

      questions.push({ type: 'financial', text:
        `Describe your primary agricultural income sources. How many acres do you farm, what crops do you grow, and what is your approximate annual harvest income? Do you receive PM-Kisan Direct Benefit Transfer (₹6,000/year)? Do you have a Kisan Credit Card (KCC) — if yes, what is the credit limit and current outstanding?`
      })

      questions.push({ type: 'financial', text:
        `What are your main farming expenses — seeds, fertilizers, labor, equipment rental? How do you fund these during non-harvest months? Do you take seasonal crop loans from any bank or cooperative?`
      })

      questions.push({ type: 'verification', text:
        `Do you have any existing loans — KCC, tractor loan, SHG borrowing, or informal debts from moneylenders? List each with the lender, amount, and repayment status. Have you ever defaulted on a crop loan?`
      })

      questions.push({ type: 'verification', text:
        `If we verify your PM-Kisan enrollment and KCC records with the district agriculture office, will everything match what you have told us? Is there anything about your financial situation — pending land disputes, shared farming income, or family obligations — that you have not disclosed?`
      })

    } else if (isMsme) {
      const gstTurnover = val('merchant_annual_turnover')
      const gstFiling = val('merchant_filing_regularity')
      const gstMonths = val('merchant_months_operating')
      const hasGst = val('merchant_has_gst')

      if (hasGst < 0.5 || gstTurnover < 50000) {
        if (bankInflow > 20000) {
          questions.push({ type: 'conflict', text:
            `Your bank account receives ${formatInr(bankInflow)}/month in inflows, but your GST records show ${hasGst < 0.5 ? 'no registered GSTIN' : `only ${formatInr(gstTurnover)} annual turnover`}. For an MSME, this gap needs explanation. Is your business below the GST threshold, or are you operating informally? Provide exact revenue sources.`
          })
        }
      } else if (gstTurnover > 100000 && bankInflow < gstTurnover / 24) {
        questions.push({ type: 'conflict', text:
          `Your GST filings declare ${formatInr(gstTurnover)} annual turnover (~${formatInr(gstTurnover / 12)}/month). But bank inflows show only ${formatInr(bankInflow)}/month — ${((bankInflow * 12 / gstTurnover) * 100).toFixed(0)}% of declared revenue. Where is the remaining ${formatInr(gstTurnover / 12 - bankInflow)}/month? Are customers paying in cash?`
        })
      }

      if (gstFiling < 0.8 && gstMonths > 12) {
        questions.push({ type: 'conflict', text:
          `Your business has operated for ${Math.round(gstMonths)} months, but GST filing regularity is ${(gstFiling * 100).toFixed(0)}%. For an MSME seeking credit, irregular filings suggest cash flow problems or poor compliance. Which months were missed and why?`
        })
      }

      if (psychEngagement < 60 && (bankInflow > 30000 || gstTurnover > 200000)) {
        questions.push({ type: 'conflict', text:
          `Your business generates ${bankInflow > 30000 ? `${formatInr(bankInflow)}/month in bank inflows` : `${formatInr(gstTurnover)} annual turnover`}, but your financial literacy assessment scored only ${psychEngagement.toFixed(0)}/100. As a business owner handling this revenue, the gap is concerning. Did you rush the questionnaire?`
        })
      }

      questions.push({ type: 'financial', text:
        `What is your MSME's exact monthly revenue and profit margin? Break down your top 3 business expenses (rent, inventory, salaries) with amounts. What is your average monthly supplier payment cycle — do you pay within 15 days, 30 days, or longer?`
      })

      questions.push({ type: 'financial', text:
        `What is your business's yearly turnover for the last financial year? How much working capital do you maintain? Do you have any outstanding supplier credit or trade payables?`
      })

      questions.push({ type: 'verification', text:
        `Do you have any existing business loans, CC/OD facilities, or equipment financing? List each with lender, EMI, and remaining tenure. Have you ever restructured a business loan?`
      })

      questions.push({ type: 'verification', text:
        `If we verify your GST returns and bank statements with your CA, will the turnover figures match exactly? Are there any pending tax disputes, legal matters, or undisclosed business obligations?`
      })

    } else {
      const gstTurnover = val('merchant_annual_turnover')
      const hasGst = val('merchant_has_gst')
      const isMetro = val('loc_is_metro')

      if (hasGst < 0.5 || gstTurnover < 50000) {
        if (isMetro >= 0.5) {
          questions.push({ type: 'conflict', text:
            `Your location data shows you are in a Tier-1 metro city, yet your GST records show ${hasGst < 0.5 ? 'no registered GSTIN' : `an annual turnover of only ${formatInr(gstTurnover)}`}. Are you salaried, self-employed, or running an unregistered business? Explain your exact income source.`
          })
        }
        if (bankInflow > 20000) {
          questions.push({ type: 'conflict', text:
            `Your bank receives ${formatInr(bankInflow)}/month, but GST records show ${hasGst < 0.5 ? 'no GSTIN' : `only ${formatInr(gstTurnover)} annual turnover`}. If you are salaried, provide your employer name and designation. If self-employed, explain the income sources.`
          })
        }
      }

      if (psychEngagement < 60 && bankInflow > 30000) {
        questions.push({ type: 'conflict', text:
          `Your bank inflows are ${formatInr(bankInflow)}/month, but your financial literacy scored only ${psychEngagement.toFixed(0)}/100. Someone earning this much should demonstrate basic financial awareness. Did you rush through the questionnaire?`
        })
      }

      if (completionTime < 25 && straightLine > 0.4) {
        questions.push({ type: 'conflict', text:
          `You completed the assessment in ${completionTime.toFixed(0)} seconds with ${(straightLine * 100).toFixed(0)}% identical answers. This strongly suggests you did not read the questions. Why should we trust your self-reported attitudes?`
        })
      }

      if (telecomMissed > 1 && bankInflow > 20000) {
        questions.push({ type: 'conflict', text:
          `You have ${Math.round(telecomMissed)} missed telecom payments, yet your bank receives ${formatInr(bankInflow)}/month. If money is coming in, why are small bills being missed?`
        })
      }

      if (bankVolatility > 0.3 && bankPaymentReg < 0.7) {
        questions.push({ type: 'conflict', text:
          `Your bank balance swings by ${(bankVolatility * 100).toFixed(0)}% month-to-month and payment regularity is only ${(bankPaymentReg * 100).toFixed(0)}%. How will you handle an additional EMI?`
        })
      }

      questions.push({ type: 'financial', text:
        `State your exact monthly take-home income (salary or business profit after all costs). Then list your top 3 fixed monthly expenses (rent, EMIs, utilities) with exact amounts. We will cross-verify these against your bank data.`
      })

      questions.push({ type: 'financial', text:
        `How much do you save or invest each month? Where — bank savings, mutual funds, gold, cash at home? Does the math add up with your stated income and expenses?`
      })

      questions.push({ type: 'verification', text:
        `Do you have any existing loans, EMIs, or credit card outstanding balances? List each with lender name, monthly EMI, and remaining tenure. Have you ever taken a loan before?`
      })

      questions.push({ type: 'verification', text:
        `If we verify your income with your employer or CA, would the numbers match? Is there anything about your finances you have not disclosed — informal debts, family obligations, or pending liabilities?`
      })
    }

    if (questions.length < 5 && data.signal_conflicts.length > 0) {
      const c = data.signal_conflicts[0]
      const negFeats = data.shap_details.filter(f => f.worker === c.negative_worker && f.points < 0)
      const posFeats = data.shap_details.filter(f => f.worker === c.positive_worker && f.points > 0)
      const topNeg = negFeats[0]
      const topPos = posFeats[0]
      if (topNeg && topPos) {
        questions.push({ type: 'conflict', text:
          `${topPos.explanation.split('.')[0]}. But on the other hand, ${topNeg.explanation.split('.')[0].toLowerCase()}. These directly contradict each other. Explain precisely what is happening.`
        })
      }
    }

    const ordered = [
      ...questions.filter(q => q.type === 'conflict').slice(0, 4),
      ...questions.filter(q => q.type === 'financial'),
      ...questions.filter(q => q.type === 'verification'),
    ]
    return ordered.slice(0, 8)
  }, [data, userId])

  const totalInterviewQuestions = interviewQuestions.length

  const analyzeAnswer = (answer: string, questionIndex: number): { reaction: string; credibility: number } => {
    const words = answer.trim().split(/\s+/)
    const wordCount = words.length
    const hasNumbers = /\d/.test(answer)
    const hasRupee = /₹|rs|lakh|lac|crore|thousand|k\/month|per month/i.test(answer)
    const vagueWords = ['sometimes', 'usually', 'maybe', 'probably', 'i think', 'not sure', 'it depends', 'hard to say', 'generally', 'approximately', 'around', 'roughly']
    const vagueCount = vagueWords.filter(w => answer.toLowerCase().includes(w)).length
    const deflectionPhrases = ['none of your', 'why do you', 'i don\'t see why', 'that\'s personal', 'i prefer not', 'no comment']
    const isDeflecting = deflectionPhrases.some(p => answer.toLowerCase().includes(p))
    const q = interviewQuestions[questionIndex]

    let credibility = 50
    let reaction = ''

    if (wordCount < 5) {
      credibility -= 30
      reaction = `That is an extremely short answer for a question about your financial situation. A one-line response does not inspire confidence.`
    } else if (wordCount < 15) {
      credibility -= 15
      reaction = `Your answer lacks detail. When a loan officer reviews this, they will want specifics — not general statements.`
    } else if (wordCount > 30) {
      credibility += 10
    }

    if (q.type === 'financial' && !hasNumbers && !hasRupee) {
      credibility -= 20
      reaction += ` You were asked for exact amounts but did not provide any numbers. This makes your response unverifiable.`
    } else if (hasNumbers && hasRupee) {
      credibility += 15
      if (!reaction) reaction = `Thank you for providing specific numbers.`
    } else if (hasNumbers) {
      credibility += 5
    }

    if (vagueCount >= 2) {
      credibility -= 15
      reaction += ` Your answer uses vague language ("${vagueWords.find(w => answer.toLowerCase().includes(w))}") multiple times. This suggests uncertainty about your own financial situation.`
    }

    if (isDeflecting) {
      credibility -= 25
      reaction += ` Refusing to answer a financial verification question is a significant red flag that will be noted in your report.`
    }

    if (q.type === 'verification' && wordCount > 20 && hasNumbers) {
      credibility += 20
      if (!reaction) reaction = `Detailed and verifiable — this strengthens your credibility.`
    }

    credibility = Math.max(10, Math.min(95, credibility))
    if (!reaction) reaction = `Recorded.`

    return { reaction: reaction.trim(), credibility }
  }

  const [answerCredibilities, setAnswerCredibilities] = useState<number[]>([])

  useEffect(() => {
    if (interviewOpen && interviewMessages.length === 0) {
      setInterviewMessages([
        {
          role: 'bot',
          content: `I am the AltGrade AI Verification Auditor. I've found contradictions in your scoring data that require clarification.\n\nThis interview has ${totalInterviewQuestions} questions in 3 phases:\n• Conflict Resolution — explain data contradictions\n• Financial Verification — provide exact income and expense figures\n• Cross-Verification — confirm consistency and disclose obligations\n\nYour answers will be scored for credibility and sent to the Loan Officer.\n\nQuestion 1 of ${totalInterviewQuestions} [${interviewQuestions[0]?.type?.toUpperCase()}]:\n${interviewQuestions[0]?.text}`
        }
      ])
      setInterviewStep(0)
      setIsInterviewSubmitted(false)
      setUserAnswersLog([])
      setAnswerCredibilities([])
    }
  }, [interviewOpen, interviewQuestions, totalInterviewQuestions])

  const handleSendInterviewMessage = async () => {
    if (!interviewInput.trim()) return
    const userMsg = interviewInput.trim()
    setInterviewInput('')

    const updatedMessages = [...interviewMessages, { role: 'user' as const, content: userMsg }]
    const updatedAnswersLog = [...userAnswersLog, userMsg]
    setInterviewMessages(updatedMessages)
    setUserAnswersLog(updatedAnswersLog)

    const { reaction, credibility } = analyzeAnswer(userMsg, interviewStep)
    const updatedCredibilities = [...answerCredibilities, credibility]
    setAnswerCredibilities(updatedCredibilities)

    setTimeout(async () => {
      if (interviewStep < totalInterviewQuestions - 1) {
        const nextStep = interviewStep + 1
        setInterviewStep(nextStep)
        const nextQ = interviewQuestions[nextStep]
        const credLabel = credibility >= 70 ? '✓ Credible' : credibility >= 40 ? '⚠ Needs verification' : '✗ Low credibility'

        setInterviewMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            content: `[Answer credibility: ${credLabel} (${credibility}/100)]\n\n${reaction}\n\nQuestion ${nextStep + 1} of ${totalInterviewQuestions} [${nextQ.type.toUpperCase()}]:\n${nextQ.text}`
          }
        ])
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      } else {
        setSubmittingSummary(true)
        const avgCred = Math.round(updatedCredibilities.reduce((a, b) => a + b, 0) / updatedCredibilities.length)
        const overallLabel = avgCred >= 70 ? 'HIGH' : avgCred >= 45 ? 'MEDIUM' : 'LOW'

        const credLabel = credibility >= 70 ? '✓ Credible' : credibility >= 40 ? '⚠ Needs verification' : '✗ Low credibility'

        setInterviewMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            content: `[Answer credibility: ${credLabel} (${credibility}/100)]\n\n${reaction}\n\n━━━ Interview Complete ━━━\n\nOverall Credibility Score: ${avgCred}/100 (${overallLabel})\n\nCompiling detailed report with per-answer analysis and forwarding to your Loan Officer...`
          }
        ])
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

        const summaryLines = updatedAnswersLog.map((ans, i) => {
          const cred = updatedCredibilities[i] || 50
          const label = cred >= 70 ? 'CREDIBLE' : cred >= 40 ? 'NEEDS_VERIFICATION' : 'LOW_CREDIBILITY'
          return `[${interviewQuestions[i].type.toUpperCase()}] Q${i + 1}: "${interviewQuestions[i].text}"\nAnswer: "${ans}"\nCredibility: ${cred}/100 (${label})`
        }).join('\n\n')
        const summary = `AI VERIFICATION INTERVIEW REPORT\nDate: ${new Date().toISOString().split('T')[0]}\nOverall Credibility: ${avgCred}/100 (${overallLabel})\nQuestions: ${totalInterviewQuestions} (${interviewQuestions.filter(q => q.type === 'conflict').length} conflict, ${interviewQuestions.filter(q => q.type === 'financial').length} financial, ${interviewQuestions.filter(q => q.type === 'verification').length} verification)\n\n${summaryLines}\n\nRECOMMENDATION: ${avgCred >= 70 ? 'Applicant responses are detailed and consistent. Proceed with standard verification.' : avgCred >= 45 ? 'Some answers lack specificity. Recommend manual follow-up on financial verification answers.' : 'Multiple evasive or vague answers detected. Recommend in-person interview before proceeding.'}`

        try {
          await submitInterviewSummary(userId, summary)
          setInterviewMessages((prev) => [
            ...prev,
            {
              role: 'bot',
              content: `Report submitted to Loan Officer.\n\nYour overall credibility score is ${avgCred}/100 (${overallLabel}). ${avgCred >= 70 ? 'Your responses were detailed and consistent.' : avgCred >= 45 ? 'Some of your answers need further verification.' : 'Several of your answers were flagged as evasive or vague.'}\n\nYou may now close this window.`
            }
          ])
          setIsInterviewSubmitted(true)
        } catch (err) {
          console.error("Failed to submit summary:", err)
          setInterviewMessages((prev) => [
            ...prev,
            {
              role: 'bot',
              content: "Submission failed, but your responses have been saved locally. You may close this window."
            }
          ])
          setIsInterviewSubmitted(true)
        } finally {
          setSubmittingSummary(false)
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        }
      }
    }, 1200)
  }

  if (loading) {
    return (
      <div className='max-w-md mx-auto py-12 px-4 space-y-6 animate-fade-up'>
        <div className='text-center mb-6'>
          <h1 className='font-signifier text-3xl font-normal leading-[1.2] text-foreground flex items-center justify-center gap-2'>
            <Loader2 className='h-6 w-6 animate-spin text-brand-blue' />
            Running Pipeline Workers
          </h1>
          <p className='text-sm text-muted-foreground mt-2'>
            Analyzing alternative data footprint and validating risk bands...
          </p>
        </div>

        <div className='space-y-4'>
          {activePipelines.map((name, idx) => {
            const isCompleted = idx < pipelineStep
            const isActive = idx === pipelineStep
            return (
              <Card key={idx} className={`shadow-subtle transition-all duration-300 ${isActive ? 'border-brand-blue bg-brand-blue/5' : ''} ${isCompleted ? 'opacity-60' : ''}`}>
                <CardHeader className='py-3 px-4 flex flex-row items-center justify-between space-y-0'>
                  <div className='flex items-center gap-3'>
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${isCompleted ? 'bg-white text-black' : isActive ? 'bg-white/20 text-white animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    <span className={`text-sm font-medium ${isActive ? 'text-white font-semibold' : ''}`}>{name}</span>
                  </div>
                  {isActive && <span className='text-xs text-white/70 font-mono animate-pulse'>Processing...</span>}
                  {isCompleted && <span className='text-xs text-graphite font-medium'>Completed</span>}
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Alert variant='destructive'>
        <AlertTriangle className='h-4 w-4' />
        <AlertTitle>Unable to retrieve your score</AlertTitle>
        <AlertDescription>{error || 'Please try again later'}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className='pb-24 sm:pb-32'>
      {notification?.has_notification && viewMode === 'technical' && (
        <div className='mb-6 rounded-lg border border-white/20 bg-black p-4 flex items-start gap-3 animate-fade-up text-white'>
          <div className='mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-white/10 text-white border border-white/20'>
            {notification.decision === 'approved' ? (
              <CheckCircle2 className='h-4 w-4 text-white' />
            ) : (
              <ShieldAlert className='h-4 w-4 text-white/80' />
            )}
          </div>
          <div>
            <p className='text-sm font-semibold font-mono text-white'>
              Loan Application {notification.decision === 'approved' ? 'Approved' : 'Decision Logged'}
            </p>
            <p className='text-xs text-white/60 mt-0.5 font-mono'>
              {notification.decision === 'approved'
                ? `Your loan application has been approved at ${notification.interest_rate}% interest for ${notification.terms}.`
                : 'Your loan application was reviewed by the loan officer with inclusive restructuring options.'}
            </p>
          </div>
        </div>
      )}

      <div className='mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <h1 className='font-signifier text-[36px] sm:text-[44px] font-normal leading-[1.1] tracking-[-0.66px] text-foreground'>
            {viewMode === 'simple' ? cur.pageTitle : t('score.title', 'AltGrade Alternate Credit Score')}
          </h1>
          <p className='text-sm text-muted-foreground mt-1'>
            {viewMode === 'simple'
              ? cur.pageSubtitle
              : t('score.subtitle', 'Explainable risk estimation based on multi-source non-traditional financial data')}
          </p>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setViewMode(viewMode === 'simple' ? 'technical' : 'simple')}
          className='self-start sm:self-auto text-xs font-mono gap-1.5 rounded-md border border-white/15 bg-black text-white hover:bg-white hover:text-black transition-colors'
        >
          {viewMode === 'simple' ? (
            <>
              <Eye className='h-3.5 w-3.5 text-white/80' />
              <span>{cur.technicalView}</span>
            </>
          ) : (
            <>
              <EyeOff className='h-3.5 w-3.5 text-white/80' />
              <span>{cur.simpleView}</span>
            </>
          )}
        </Button>
      </div>

      {viewMode === 'simple' ? (
        /* ================= STREAMLINED, UNCLUTTERED RESULT VIEW ================= */
        <div className='space-y-6 animate-fade-up'>
          {/* 1. CORE SANCTION CARD (Score + Approved Limit + Audio + Key Insights) */}
          <Card className='overflow-hidden border border-white/15 bg-black shadow-xl'>
            {/* Top Clean Status Strip */}
            <div className='flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] px-6 py-3'>
              <div className='flex items-center gap-2 text-xs font-mono'>
                <div className='flex h-4 w-4 items-center justify-center rounded-full bg-white text-black'>
                  <CheckCircle2 className='h-3 w-3' />
                </div>
                <span className='font-semibold uppercase tracking-wider text-white'>
                  {isSanctionApproved ? cur.sanctionApproved : cur.scoreCalculated}
                </span>
                <span className='text-white/30'>•</span>
                <span className='text-white/70'>
                  {notification?.interest_rate ? `${notification.interest_rate}% ${cur.subsidizedApr}` : cur.subsidizedApr}
                </span>
                <span className='text-white/30'>•</span>
                <span className='text-white/70'>
                  {notification?.terms || cur.tenure36}
                </span>
              </div>

              {/* Minimalist Audio & Language Control */}
              <div className='flex items-center gap-2'>
                <div className='flex items-center gap-1 border border-white/15 rounded-md p-0.5 bg-black'>
                  {(
                    [
                      { code: 'gu', label: 'ગુજરાતી' },
                      { code: 'hi', label: 'हिंदी' },
                      { code: 'ta', label: 'தமிழ்' },
                      { code: 'en', label: 'Eng' },
                    ] as const
                  ).map((l) => (
                    <button
                      key={l.code}
                      type='button'
                      onClick={() => handleLanguageSwitch(l.code)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                        audioLang === l.code
                          ? 'bg-white text-black font-semibold'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>

                <Button
                  size='sm'
                  onClick={() => handlePlayAudio()}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-mono gap-1.5 transition-all ${
                    isPlayingAudio
                      ? 'bg-white text-black animate-pulse font-semibold'
                      : 'border border-white/20 bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {isPlayingAudio ? (
                    <>
                      <VolumeX className='h-3 w-3' />
                      <span>{cur.pause}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className='h-3 w-3' />
                      <span>{cur.listen}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Score & Sanction Amount */}
            <div className='p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6'>
              <div className='flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left'>
                {/* Radial Gauge */}
                <div className='relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-black border border-white/15'>
                  <svg className='absolute h-full w-full -rotate-90' viewBox='0 0 100 100'>
                    <circle
                      cx='50' cy='50' r='42'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='4'
                      className='text-white/10'
                    />
                    <circle
                      cx='50' cy='50' r='42'
                      fill='none'
                      strokeWidth='4'
                      strokeLinecap='round'
                      strokeDasharray={`${(data.score / 850) * 264} 264`}
                      stroke='#ffffff'
                      className='transition-all duration-1000'
                    />
                  </svg>
                  <div className='flex flex-col items-center justify-center'>
                    <span className='text-3xl font-extrabold tracking-tight text-white font-mono'>{data.score}</span>
                    <span className='text-[9px] uppercase tracking-widest text-white/50 font-mono'>{cur.outOf850}</span>
                  </div>
                </div>

                {/* Score Details & Limit */}
                <div className='space-y-2'>
                  <div className='inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/15 px-2.5 py-0.5 text-[11px] font-mono text-white/80'>
                    <CheckCircle2 className='h-3 w-3 text-white' />
                    <span>{cur.eligibleBanking}</span>
                  </div>
                  <h2 className='text-2xl font-bold tracking-tight text-white'>
                    {data.score >= 700 ? cur.highTrust : cur.goodStanding}
                  </h2>
                  <div className='pt-1'>
                    <span className='text-[10px] font-mono uppercase tracking-wider text-white/50'>
                      {cur.preApprovedLimit}
                    </span>
                    <div className='text-3xl font-bold font-mono text-white'>
                      ₹{personalizeData?.credit_limit ? personalizeData.credit_limit.toLocaleString('en-IN') : '1,00,000'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct Action Buttons */}
              <div className='flex flex-col gap-2 w-full sm:w-auto shrink-0'>
                <Button
                  size='lg'
                  onClick={() => setOfficerModalOpen(true)}
                  className='h-11 px-6 rounded-md bg-white text-black hover:bg-white/90 font-mono text-xs font-semibold gap-2 shadow-none'
                >
                  <PhoneCall className='h-3.5 w-3.5' />
                  <span>{cur.speakLoanOfficer}</span>
                </Button>
                <Link
                  to='/advisor'
                  search={{ userId }}
                  className='w-full'
                >
                  <Button
                    variant='outline'
                    size='sm'
                    className='w-full h-9 rounded-md text-xs font-mono gap-1.5 border-white/15 hover:bg-white/5 text-white/80'
                  >
                    <Bot className='h-3.5 w-3.5' />
                    <span>{cur.askAiAdvisor}</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* Bottom Shelf: Why You Qualify + Officer Recommendation (Compact & Clean) */}
            <div className='border-t border-white/10 bg-white/[0.01] p-5 grid sm:grid-cols-2 gap-4'>
              <div className='space-y-1'>
                <div className='flex items-center gap-1.5 text-xs font-semibold text-white'>
                  <Sparkles className='h-3.5 w-3.5 text-white/80' />
                  <span>{cur.whyQualified}</span>
                </div>
                <p className='text-xs text-white/70 leading-relaxed font-sans'>
                  {whyQualifiedText}
                </p>
              </div>

              <div className='space-y-1'>
                <div className='flex items-center gap-1.5 text-xs font-semibold text-white'>
                  <ShieldCheck className='h-3.5 w-3.5 text-white/80' />
                  <span>{cur.officerNoteTitle}</span>
                </div>
                <p className='text-xs text-white/70 leading-relaxed font-sans'>
                  {officerNoteText}
                </p>
              </div>
            </div>
          </Card>

          {/* 2. TOP 3 RECOMMENDED SCHEMES (CURATED, MINIMALIST, ZERO CLUTTER) */}
          <div className='space-y-3 pt-2'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-mono text-xs uppercase tracking-widest text-white flex items-center gap-2'>
                  <Wallet className='h-3.5 w-3.5 text-white/80' />
                  {cur.topSchemesTitle} ({Math.min(3, (personalizeData?.recommendations || []).length)})
                </h3>
                <p className='text-xs text-white/50 font-sans mt-0.5'>
                  {cur.topSchemesSubtitle}
                </p>
              </div>
            </div>

            {/* Exactly 3 Clean Cards */}
            <div className='grid gap-3 sm:grid-cols-3'>
              {(personalizeData?.recommendations || []).slice(0, 3).map((rec: any, i: number) => (
                <div
                  key={i}
                  className='rounded-lg border border-white/10 bg-black p-4 flex flex-col justify-between space-y-3 transition-all hover:border-white/30'
                >
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between text-[10px] font-mono'>
                      <span className='px-1.5 py-0.5 rounded border border-white/15 bg-white/5 text-white/70 truncate max-w-[140px]'>
                        {rec.category}
                      </span>
                      <span className='text-white font-semibold'>
                        {rec.fit_score || 95}% {cur.match}
                      </span>
                    </div>

                    <h4 className='font-sans font-semibold text-sm text-white leading-snug'>
                      {rec.name}
                    </h4>

                    <div className='font-mono text-xs text-white font-medium'>
                      {rec.max_benefit}
                    </div>

                    <p className='font-sans text-xs text-white/60 leading-relaxed line-clamp-2'>
                      {sanitizeText(rec.description)}
                    </p>
                  </div>

                  <div className='pt-2 border-t border-white/10 flex items-center justify-between gap-2'>
                    {rec.official_portal ? (
                      <a
                        href={rec.official_portal}
                        target='_blank'
                        rel='noreferrer'
                        className='inline-flex items-center gap-1 text-[10px] font-mono text-white/50 hover:text-white'
                      >
                        <span>{cur.portal}</span>
                        <ArrowUpRight className='h-2.5 w-2.5' />
                      </a>
                    ) : <span />}
                    <Button
                      size='sm'
                      onClick={() => setOfficerModalOpen(true)}
                      className='h-7 text-[10px] font-mono bg-white text-black hover:bg-white/90 px-3 rounded'
                    >
                      {cur.enroll}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ================= TECHNICAL UNDERWRITER VIEW (SHAP FACTORS & ADVANCED METRICS) ================= */
        <div className='grid gap-4 md:grid-cols-3 animate-fade-up'>
          <Card className='md:col-span-1'>
            <CardContent className='flex flex-col items-center justify-center py-8'>
              <div className='relative flex h-40 w-40 items-center justify-center'>
                <svg className='absolute h-full w-full -rotate-90' viewBox='0 0 100 100'>
                  <circle
                    cx='50' cy='50' r='42'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='6'
                    className='text-muted'
                  />
                  <circle
                    cx='50' cy='50' r='42'
                    fill='none'
                    strokeWidth='6'
                    strokeLinecap='round'
                    strokeDasharray={`${(data.score / 850) * 264} 264`}
                    stroke={scoreGradient(data.score)}
                    className='transition-all duration-1000'
                  />
                </svg>
                <div className='text-center'>
                  <div className='text-4xl font-bold tracking-[-0.04em]'>{data.score}</div>
                  <div className='text-xs text-muted-foreground'>of 850</div>
                </div>
              </div>
              <div className={`mt-4 text-xl font-bold tracking-[-0.02em] ${bandColor(data.risk_band)}`}>
                {data.risk_band}
              </div>
              <Badge variant='outline' className='mt-2'>
                {data.tier}
              </Badge>
            </CardContent>
          </Card>

          <Card className='md:col-span-2'>
            <CardHeader>
              <CardTitle className='text-base'>What Affected Your Score (SHAP Attribution)</CardTitle>
              <CardDescription>
                How each alternative data factor contributed (baseline: 600 pts). Click any row for mathematical explanation.
              </CardDescription>
            </CardHeader>
            <CardContent className='max-h-[500px] overflow-y-auto'>
              {sortedShap.map((feat) => (
                <ShapBar key={feat.label} feature={feat} maxAbs={maxAbs} />
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {data.has_hard_cap && (
        <Alert variant='destructive' className='mt-4'>
          <ShieldAlert className='h-4 w-4' />
          <AlertTitle>Score Cap Applied</AlertTitle>
          <AlertDescription>
            {data.hard_caps_applied.map((cap, i) => (
              <p key={i}>{cap}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {data.has_conflicts && viewMode === 'technical' && (
        <Card className='mt-4 border-white/20 bg-black text-white shadow-none'>
          <CardHeader>
            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
              <div>
                <CardTitle className='flex items-center gap-2 text-base text-white font-mono'>
                  <AlertTriangle className='h-4 w-4 text-white' />
                  Conflicting Signals
                </CardTitle>
                <CardDescription className='text-white/60 text-xs font-mono'>
                  Some of your data sources provided contradicting information
                </CardDescription>
              </div>
              <Button
                variant='outline'
                size='sm'
                className='border-white/20 bg-white/5 text-white hover:bg-white hover:text-black font-semibold text-xs rounded-full font-mono'
                onClick={() => setInterviewOpen(true)}
              >
                Resolve via AI Interview
              </Button>
            </div>
          </CardHeader>
          <CardContent className='space-y-3'>
            {data.signal_conflicts.map((conflict, i) => (
              <div
                key={i}
                className='flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3'
              >
                <div className='flex items-center gap-2'>
                  <Badge className='bg-white/10 text-white border-white/20 font-mono text-[10px]' variant='outline'>
                    {conflict.positive_worker}: {conflict.positive_net_points > 0 ? '+' : ''}{conflict.positive_net_points.toFixed(1)} pts
                  </Badge>
                  <span className='text-xs text-white/40 font-mono'>vs</span>
                  <Badge className='bg-white/5 text-white/70 border-white/15 font-mono text-[10px]' variant='outline'>
                    {conflict.negative_worker}: {conflict.negative_net_points.toFixed(1)} pts
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {data.tier1_reweight && (
        <Alert className='mt-4'>
          <AlertTitle>Score Adjustment</AlertTitle>
          <AlertDescription>{data.tier1_reweight}</AlertDescription>
        </Alert>
      )}

      <div className='mt-6 flex gap-3'>
        <Link
          to='/eligibility'
          search={{ userId, score: String(data.score), band: data.risk_band }}
        >
          <Button>
            <IndianRupee className='mr-2 h-4 w-4' />
            View Loan Eligibility
          </Button>
        </Link>
        <Link to='/advisor' search={{ userId }}>
          <Button variant='outline'>
            <MessageSquare className='mr-2 h-4 w-4' />
            Ask About Your Score
          </Button>
        </Link>
        <Link to='/'>
          <Button variant='ghost'>Modify Consent</Button>
        </Link>
      </div>

      {/* AI Conflict Resolution Interview Modal */}
      <Dialog open={interviewOpen} onOpenChange={setInterviewOpen}>
        <DialogContent className='sm:max-w-[500px] max-h-[80vh] flex flex-col p-6 bg-black border border-white/15 text-white rounded-2xl'>
          <DialogHeader className='pb-3 border-b border-white/10 shrink-0'>
            <DialogTitle className='flex items-center gap-2 text-white font-mono tracking-tight'>
              <AlertTriangle className='h-5 w-5 text-white' />
              AI Verification Interview
            </DialogTitle>
            <DialogDescription className='text-xs text-white/50 font-mono'>
              Your answers are scored for credibility and sent to the Loan Officer.
            </DialogDescription>
          </DialogHeader>

          {/* Conversation history area */}
          <div className='flex-1 overflow-y-auto py-4 space-y-4 pr-1 min-h-[250px] font-mono'>
            {interviewMessages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'bot' && (
                  <div className='h-7 w-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20'>
                    <Bot className='h-4 w-4 text-white' />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-white text-black rounded-tr-none font-medium'
                    : 'bg-white/[0.04] border border-white/10 text-white/90 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className='h-7 w-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20'>
                    <User className='h-4 w-4 text-white' />
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input field */}
          <div className='pt-3 border-t border-white/10 shrink-0 flex gap-2'>
            <input
              type='text'
              value={interviewInput}
              onChange={(e) => setInterviewInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isInterviewSubmitted && handleSendInterviewMessage()}
              placeholder={isInterviewSubmitted ? 'Conversation finished.' : 'Explain details here...'}
              disabled={isInterviewSubmitted || submittingSummary}
              className='flex-1 rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white disabled:opacity-50 font-mono'
            />
            <Button
              size='sm'
              onClick={handleSendInterviewMessage}
              disabled={isInterviewSubmitted || submittingSummary || !interviewInput.trim()}
              className='rounded-xl bg-white text-black hover:bg-white/90 px-4 h-9 text-xs font-mono font-semibold gap-1.5'
            >
              {submittingSummary ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin text-black' />
              ) : (
                <><Send className='h-3.5 w-3.5' /> Send</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Field Officer Contact Request Modal - Vercel Minimalist */}
      <Dialog open={officerModalOpen} onOpenChange={setOfficerModalOpen}>
        <DialogContent className='sm:max-w-[420px] p-6 rounded-xl border border-white/10 bg-black text-white shadow-2xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-base font-medium tracking-tight text-white'>
              <PhoneCall className='h-4 w-4 text-white/80' />
              <span>{cur.officerModalTitle}</span>
            </DialogTitle>
            <DialogDescription className='text-xs text-white/50 leading-relaxed'>
              {cur.officerModalDesc}
            </DialogDescription>
          </DialogHeader>

          {officerRequested ? (
            <div className='py-6 text-center space-y-3'>
              <div className='mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white border border-white/20'>
                <CheckCircle2 className='h-5 w-5' />
              </div>
              <h4 className='text-sm font-semibold text-white'>{cur.requestDispatched}</h4>
              <p className='text-xs text-white/60 max-w-xs mx-auto leading-relaxed'>
                {cur.requestDispatchedDesc}
              </p>
              <Button size='sm' className='font-mono text-xs bg-white text-black hover:bg-white/90 rounded-md px-4 h-9' onClick={() => { setOfficerModalOpen(false); setOfficerRequested(false); }}>
                {cur.close}
              </Button>
            </div>
          ) : (
            <div className='space-y-4 py-2'>
              <div className='rounded-lg border border-white/10 bg-white/[0.02] p-3.5 space-y-1 text-xs'>
                <div className='font-mono font-medium text-white'>{cur.assignedOfficer}</div>
                <div className='text-white/60'>{cur.officerDetails}</div>
                <div className='text-[11px] text-white/80 font-mono flex items-center gap-1.5 pt-0.5'>
                  <span className='h-1.5 w-1.5 rounded-full bg-white'></span>
                  {cur.availableVisit}
                </div>
              </div>

              <div className='space-y-2 text-xs'>
                <label className='font-mono text-[11px] text-white/60'>{cur.contactNumber}</label>
                <input
                  type='text'
                  defaultValue={phone || '98765 43215'}
                  className='w-full h-9 rounded-md border border-white/15 bg-black px-3 text-xs text-white font-mono focus:border-white/40 focus:outline-none'
                />
              </div>

              <Button
                className='w-full rounded-md bg-white text-black hover:bg-white/90 font-mono text-xs h-10'
                onClick={() => {
                  setOfficerRequested(true)
                  toast.success('Field officer visit request dispatched!')
                }}
              >
                {cur.confirmFieldVisit}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
