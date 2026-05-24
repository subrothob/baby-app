import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const accent = '#ff6400'
const accentDim = 'rgba(255,100,0,0.12)'
const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '16px 18px' }

const MOVEMENTS = {
  '🏋️ Strength': ['Back Squat','Front Squat','Overhead Squat','Deadlift','Romanian Deadlift','Bench Press','Overhead Press','Push Press','Weighted Pull-up','Weighted Dip'],
  '🥇 Olympic': ['Clean','Power Clean','Hang Power Clean','Snatch','Power Snatch','Hang Power Snatch','Clean & Jerk','Thruster','Push Jerk','Split Jerk'],
  '🤸 Gymnastics': ['Pull-ups','Chest-to-Bar Pull-ups','Bar Muscle-up','Ring Muscle-up','Handstand Push-up','Strict HSPU','Toes-to-Bar','Knees-to-Elbow','Wall Walk','L-Sit Hold'],
  '🏃 Running': ['400m Run','800m Run','1km Run','1 Mile Run','5km Run','10km Run','21km Half Marathon','42km Marathon'],
  '🔥 Hyrox': ['SkiErg 1km','Row Erg 1km','Farmers Carry','Sled Push','Sled Pull','Burpee Broad Jump','Wall Balls','Sandbag Lunges','Box Step-overs','Full Hyrox Race'],
  '⚡ Conditioning': ['KB Swing','American KB Swing','Box Jump','Double Unders','Single Unders','Air Bike Cal','Row Cal','SkiErg Cal','Burpees','Wall Ball'],
  '⏱️ Benchmark WODs': ['Fran','Grace','Helen','Annie','Isabel','Karen','Nancy','Cindy','Murph','DT']
}


// VAPID helper
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

function MiniLineChart({ data, color = accent }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width, h = canvas.height
    const pad = 8
    const vals = data.map(d => parseFloat(d.value_numeric || d.value) || 0)
    const min = Math.min(...vals), max = Math.max(...vals)
    const range = max - min || 1
    ctx.clearRect(0, 0, w, h)
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, color + '55')
    grad.addColorStop(1, 'transparent')
    ctx.beginPath()
    data.forEach((d, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2)
      const y = h - pad - ((parseFloat(d.value_numeric || d.value) - min) / range) * (h - pad * 2)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.lineTo(pad + (w - pad * 2), h)
    ctx.lineTo(pad, h)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()
    ctx.beginPath()
    data.forEach((d, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2)
      const y = h - pad - ((parseFloat(d.value_numeric || d.value) - min) / range) * (h - pad * 2)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.stroke()
    data.forEach((d, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2)
      const y = h - pad - ((parseFloat(d.value_numeric || d.value) - min) / range) * (h - pad * 2)
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
    })
  }, [data, color])
  if (data.length < 2) return <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Log at least 2 entries to see graph</div>
  return <canvas ref={canvasRef} width={320} height={80} style={{ width: '100%', height: 80 }} />
}

export default function MemberHome() {
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [wod, setWod] = useState(null)
  const [pbs, setPbs] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [checkedIn, setCheckedIn] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [scoredToday, setScoredToday] = useState(false)
  const [tab, setTab] = useState('home')
  const [notifStatus, setNotifStatus] = useState('idle')
  const [toast, setToast] = useState(null)

  const [showScoreForm, setShowScoreForm] = useState(false)
  const [scoreForm, setScoreForm] = useState({ rounds: '', time_minutes: '', time_seconds: '', weight_kg: '', reps: '', notes: '' })
  const [savingScore, setSavingScore] = useState(false)

  const [showPBForm, setShowPBForm] = useState(false)
  const [pbForm, setPbForm] = useState({ movement: '', custom_movement: '', pb_type: 'Weight', value: '' })
  const [savingPB, setSavingPB] = useState(false)

  const [progressMovement, setProgressMovement] = useState('')
  const [customProgress, setCustomProgress] = useState('')
  const [progressData, setProgressData] = useState([])
  const [wodScoreHistory, setWodScoreHistory] = useState([])
  const [loadingProgress, setLoadingProgress] = useState(false)
  const [progressCategory, setProgressCategory] = useState(Object.keys(MOVEMENTS)[0])

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setNotifStatus('unsupported')
    } else if (Notification.permission === 'granted') {
      setNotifStatus('granted')
    } else if (Notification.permission === 'denied') {
      setNotifStatus('denied')
    }
  }, [])

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const stored = sessionStorage.getItem('baby_member')
    if (!stored) { navigate('/login'); return }
    const m = JSON.parse(stored)
    setMember(m)
    fetchWod()
    fetchPbs(m.id)
    fetchLeaderboard()
    checkTodayAttendance(m.id)
    checkTodayScore(m.id)
  }, [])

  const fetchWod = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('wods').select('*')
      .eq('scheduled_date', today).order('posted_at', { ascending: false }).limit(1)
    if (data && data.length > 0) { setWod(data[0]); return }
    const { data: data2 } = await supabase.from('wods').select('*')
      .gte('posted_at', today + 'T00:00:00').lte('posted_at', today + 'T23:59:59')
      .order('posted_at', { ascending: false }).limit(1)
    if (data2 && data2.length > 0) setWod(data2[0])
  }

  const fetchPbs = async (memberId) => {
    const { data } = await supabase.from('personal_bests').select('*')
      .eq('member_id', memberId).order('updated_at', { ascending: false })
    if (data) setPbs(data)
  }

 const fetchLeaderboard = async () => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data } = await supabase.from('workout_logs')
    .select('member_id, member_name, logged_at')
    .gte('logged_at', weekAgo)
  if (data) {
    const counts = {}
    data.forEach(row => {
      if (!counts[row.member_id]) counts[row.member_id] = { name: row.member_name || 'Unknown', days: new Set() }
      counts[row.member_id].days.add(row.logged_at)
    })
    const sorted = Object.values(counts)
      .map(m => ({ name: m.name, count: m.days.size }))
      .sort((a, b) => b.count - a.count).slice(0, 10)
    setLeaderboard(sorted)
  }
}

  const checkTodayAttendance = async (memberId) => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('workout_logs').select('id')
      .eq('member_id', memberId).eq('logged_at', today).limit(1)
    if (data && data.length > 0) setCheckedIn(true)
  }

  const checkTodayScore = async (memberId) => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('workout_logs').select('id')
      .eq('member_id', memberId).eq('logged_at', today)
      .not('rounds', 'is', null)
      .limit(1)
    if (data && data.length > 0) setScoredToday(true)
  }

  const handleCheckIn = async () => {
    if (checkedIn || !member) return
    setCheckingIn(true)
    const { error } = await supabase.from('workout_logs').insert([{
      member_id: member.id, member_name: member.full_name,
      wod_name: wod?.name || 'Check-in', workout_type: wod?.type || 'Check-in',
      logged_at: new Date().toISOString().split('T')[0]
    }])
    if (!error) { setCheckedIn(true); showToast('🔥 Checked in! Let\'s get it!', 'success'); fetchLeaderboard() }
    else showToast('Something went wrong. Try again.', 'error')
    setCheckingIn(false)
  }

  const handleLogScore = async () => {
    if (!member || !wod) return
    setSavingScore(true)
    const totalSecs = (parseInt(scoreForm.time_minutes || 0) * 60) + parseInt(scoreForm.time_seconds || 0)
    const { error } = await supabase.from('workout_logs').insert([{
      member_id: member.id, member_name: member.full_name,
      wod_name: wod.name || wod.type, workout_type: wod.type,
      rounds: parseInt(scoreForm.rounds) || null,
      time_seconds: totalSecs || null,
      weight_kg: parseFloat(scoreForm.weight_kg) || null,
      reps: parseInt(scoreForm.reps) || null,
      notes: scoreForm.notes || null,
      logged_at: new Date().toISOString().split('T')[0]
    }])
    if (!error) {
      showToast('💪 Score logged!', 'success')
      setShowScoreForm(false)
      setScoredToday(true)
      setScoreForm({ rounds: '', time_minutes: '', time_seconds: '', weight_kg: '', reps: '', notes: '' })
    } else showToast('Something went wrong.', 'error')
    setSavingScore(false)
  }

  const handleSavePB = async () => {
    if (!member) return
    const movement = pbForm.movement === 'custom' ? pbForm.custom_movement : pbForm.movement
    if (!movement || !pbForm.value) { showToast('⚠ Fill in movement and value', 'error'); return }
    setSavingPB(true)
    const numVal = parseFloat(pbForm.value)
    // Save to pb_history for graph tracking
    await supabase.from('pb_history').insert([{
      member_id: member.id, member_name: member.full_name,
      movement, pb_type: pbForm.pb_type,
      value: pbForm.value, value_numeric: numVal || null,
      achieved_at: new Date().toISOString().split('T')[0]
    }])
    // Upsert current best
    const { error } = await supabase.from('personal_bests').upsert([{
      member_id: member.id, member_name: member.full_name,
      movement, pb_type: pbForm.pb_type,
      value: pbForm.value, value_numeric: numVal || null,
      achieved_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    }], { onConflict: 'member_id,movement' })
    if (!error) {
      showToast('🏆 Personal Best saved!', 'success')
      setShowPBForm(false)
      setPbForm({ movement: '', custom_movement: '', pb_type: 'Weight', value: '' })
      fetchPbs(member.id)
    } else showToast('Something went wrong.', 'error')
    setSavingPB(false)
  }

  const fetchProgress = async (movementName) => {
    if (!member || !movementName) return
    setLoadingProgress(true)
    // Use pb_history for graph (multiple entries over time)
    const { data: pbData } = await supabase.from('pb_history').select('*')
      .eq('member_id', member.id).eq('movement', movementName)
      .order('achieved_at', { ascending: true })
    if (pbData) setProgressData(pbData)
    // WOD score history
    const { data: scoreData } = await supabase.from('workout_logs').select('*')
      .eq('member_id', member.id).ilike('wod_name', `%${movementName}%`)
      .order('logged_at', { ascending: true }).limit(20)
    if (scoreData) setWodScoreHistory(scoreData)
    setLoadingProgress(false)
  }

  const handleProgressSelect = (movement) => {
    setProgressMovement(movement)
    fetchProgress(movement)
  }

  const enableNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setNotifStatus('unsupported'); return
    }
    setNotifStatus('loading')
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setNotifStatus('denied'); return }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
      })
      const { error } = await supabase.from('push_subscriptions').upsert({
        member_id: member?.id,
        subscription: JSON.stringify(subscription),
        updated_at: new Date().toISOString()
      }, { onConflict: 'member_id' })
      if (error) throw error
      setNotifStatus('granted')
      showToast('🔔 Notifications enabled!', 'success')
    } catch (err) {
      console.error('Push setup failed:', err)
      setNotifStatus('idle')
      showToast('Could not enable notifications.', 'error')
    }
  }

  const handleLogout = () => { sessionStorage.removeItem('baby_member'); navigate('/login') }

  const firstName = member?.full_name?.split(' ')[0] || 'Athlete'
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'wod', label: 'WOD', icon: '⚡' },
    { id: 'progress', label: 'Progress', icon: '📈' },
    { id: 'pbs', label: 'My PBs', icon: '🏆' },
    { id: 'board', label: 'Board', icon: '📊' },
  ]

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none',
    fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box'
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: "'DM Sans', sans-serif", paddingBottom: 80, maxWidth: 480, margin: '0 auto', position: 'relative' }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{ padding: '48px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{today}</div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: 2, lineHeight: 1 }}>HEY {firstName.toUpperCase()} 👊</div>
        </div>
        <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}>Sign Out</button>
      </div>

      <div style={{ padding: '0 20px' }}>

        {tab === 'home' && (
          <>
            <div style={{ ...card, marginBottom: 14, background: checkedIn ? 'rgba(0,200,100,0.08)' : accentDim, border: `1px solid ${checkedIn ? 'rgba(0,200,100,0.25)' : 'rgba(255,100,0,0.3)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Today's Attendance</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{checkedIn ? "✅ You're checked in!" : 'Ready to train?'}</div>
                  {!checkedIn && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Tap to mark your attendance</div>}
                </div>
                <button onClick={handleCheckIn} disabled={checkedIn || checkingIn}
                  style={{ background: checkedIn ? 'rgba(0,200,100,0.2)' : accent, border: 'none', borderRadius: 12, padding: '12px 18px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: checkedIn ? 'default' : 'pointer', opacity: checkingIn ? 0.6 : 1 }}>
                  {checkedIn ? '🔥 Done' : checkingIn ? '...' : 'Check In'}
                </button>
              </div>
            </div>

            <div style={{ ...card, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Today's WOD</div>
              {wod ? (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    {wod.type && <span style={{ background: accentDim, color: accent, fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 600 }}>{wod.type}</span>}
                    {wod.name && <span style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', fontSize: 11, padding: '3px 10px', borderRadius: 99 }}>{wod.name}</span>}
                  </div>
                  {wod.conditioning && <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>{wod.conditioning.slice(0, 80)}...</div>}
                  <button onClick={() => setTab('wod')} style={{ background: 'none', border: 'none', color: accent, fontSize: 13, cursor: 'pointer', padding: 0, fontWeight: 500 }}>See full WOD →</button>
                </>
              ) : <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No WOD posted yet. Check back soon! 💤</div>}
            </div>

            <div style={{ ...card, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>My Personal Bests</div>
                <button onClick={() => setTab('pbs')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>See all →</button>
              </div>
              {pbs.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {pbs.slice(0, 4).map((pb, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{pb.movement}</div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{pb.value}<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 2 }}>{pb.pb_type === 'Weight' ? 'kg' : ''}</span></div>
                    </div>
                  ))}
                </div>
              ) : <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No PBs logged yet. Start tracking! 🏋️</div>}
            </div>

            <div style={{ ...card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>This Week's Leaders</div>
                <button onClick={() => setTab('board')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>Full board →</button>
              </div>
              {leaderboard.slice(0, 3).map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#000', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, fontSize: 14 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: accent, fontWeight: 600 }}>{m.count} sessions</div>
                </div>
              ))}
              {leaderboard.length === 0 && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Check in to appear on the board! 🏅</div>}
            </div>
          </>
        )}

            {/* Notifications Card */}
            <div style={{ ...card, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: '#ff6400', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Push Notifications</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>Get notified when today\'s WOD is posted 🔔</div>
              <button
                onClick={enableNotifications}
                disabled={notifStatus !== 'idle'}
                style={{ width: '100%', background: notifStatus === 'granted' ? 'rgba(0,200,100,0.15)' : notifStatus === 'denied' ? 'rgba(255,50,50,0.1)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '13px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: notifStatus === 'idle' ? 'pointer' : 'default', fontFamily: "'DM Sans'" }}>
                {{'idle': '🔔 Enable Notifications', 'loading': 'Setting up...', 'granted': '✅ Notifications On', 'denied': '🚫 Notifications Blocked', 'unsupported': 'Not Supported'}[notifStatus]}
              </button>
              {notifStatus === 'denied' && <div style={{ fontSize: 12, color: 'rgba(255,100,100,0.7)', marginTop: 8, textAlign: 'center' }}>Allow notifications in browser settings.</div>}
            </div>

        {tab === 'wod' && (
          <>
            <div style={{ ...card, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>Today's Full WOD</div>
              {wod ? (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    {wod.type && <span style={{ background: accentDim, color: accent, fontSize: 12, padding: '4px 12px', borderRadius: 99, fontWeight: 600 }}>{wod.type}</span>}
                    {wod.name && <span style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 12, padding: '4px 12px', borderRadius: 99 }}>{wod.name}</span>}
                  </div>
                  {[{ label: '🔥 Warmup', val: wod.warmup }, { label: '💪 Strength', val: wod.strength }, { label: '⚡ Conditioning', val: wod.conditioning }, { label: '🧊 Cooldown', val: wod.cooldown }, { label: '📐 Scaling', val: wod.scaling }]
                    .filter(s => s.val).map((s, i) => (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, letterSpacing: 1 }}>{s.label}</div>
                        <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.val}</div>
                      </div>
                    ))}
                  {scoredToday ? (
                    <div style={{ textAlign: 'center', padding: '14px', color: 'rgba(0,200,100,0.9)', fontWeight: 600, fontSize: 15, background: 'rgba(0,200,100,0.08)', borderRadius: 12, marginTop: 8 }}>
                      ✅ Score logged today! Great work 💪
                    </div>
                  ) : (
                    <button onClick={() => setShowScoreForm(!showScoreForm)}
                      style={{ width: '100%', background: accent, border: 'none', borderRadius: 12, padding: '14px', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'", marginTop: 8 }}>
                      {showScoreForm ? '✕ Cancel' : '📝 Log My Score'}
                    </button>
                  )}
                </>
              ) : <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '40px 0' }}>No WOD posted yet 💤</div>}
            </div>

            {showScoreForm && wod && !scoredToday && (
              <div style={{ ...card, marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 14 }}>Log Your Score</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Rounds</div>
                      <input style={inputStyle} type="number" placeholder="e.g. 12" value={scoreForm.rounds} onChange={e => setScoreForm(f => ({ ...f, rounds: e.target.value }))} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Reps</div>
                      <input style={inputStyle} type="number" placeholder="e.g. 5" value={scoreForm.reps} onChange={e => setScoreForm(f => ({ ...f, reps: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Time (min : sec)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <input style={inputStyle} type="number" placeholder="Minutes" value={scoreForm.time_minutes} onChange={e => setScoreForm(f => ({ ...f, time_minutes: e.target.value }))} />
                      <input style={inputStyle} type="number" placeholder="Seconds" value={scoreForm.time_seconds} onChange={e => setScoreForm(f => ({ ...f, time_seconds: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Weight Used (kg)</div>
                    <input style={inputStyle} type="number" placeholder="e.g. 42.5" value={scoreForm.weight_kg} onChange={e => setScoreForm(f => ({ ...f, weight_kg: e.target.value }))} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Notes</div>
                    <input style={inputStyle} placeholder="How did it feel? Any notes..." value={scoreForm.notes} onChange={e => setScoreForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <button onClick={handleLogScore} disabled={savingScore}
                    style={{ background: accent, border: 'none', borderRadius: 12, padding: '14px', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'", opacity: savingScore ? 0.6 : 1 }}>
                    {savingScore ? 'Saving...' : '💾 Save Score'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'progress' && (
          <div>
            <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 14 }}>Progress Tracker 📈</div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 12, scrollbarWidth: 'none' }}>
              {Object.keys(MOVEMENTS).map(cat => (
                <button key={cat} onClick={() => setProgressCategory(cat)}
                  style={{ background: progressCategory === cat ? accentDim : 'rgba(255,255,255,0.04)', border: `1px solid ${progressCategory === cat ? 'rgba(255,100,0,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 20, padding: '6px 14px', color: progressCategory === cat ? accent : 'rgba(255,255,255,0.5)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'DM Sans'" }}>
                  {cat}
                </button>
              ))}
            </div>
            <div style={{ ...card, marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Select Movement</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {MOVEMENTS[progressCategory].map(m => (
                  <button key={m} onClick={() => handleProgressSelect(m)}
                    style={{ background: progressMovement === m ? accentDim : 'rgba(255,255,255,0.04)', border: `1px solid ${progressMovement === m ? 'rgba(255,100,0,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, padding: '6px 12px', color: progressMovement === m ? accent : 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                    {m}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...inputStyle, flex: 1 }} placeholder="Or type custom movement..." value={customProgress}
                  onChange={e => setCustomProgress(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && customProgress) { handleProgressSelect(customProgress); setProgressMovement(customProgress) } }} />
                <button onClick={() => { if (customProgress) { handleProgressSelect(customProgress); setProgressMovement(customProgress) } }}
                  style={{ background: accent, border: 'none', borderRadius: 10, padding: '0 16px', color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans'", fontWeight: 600 }}>Go</button>
              </div>
            </div>

            {progressMovement && (
              <>
                {loadingProgress ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
                ) : (
                  <>
                    <div style={{ ...card, marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Personal Best — {progressMovement}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Weight / Value over time</div>
                      {progressData.length > 0 ? (
                        <>
                          <MiniLineChart data={progressData} color={accent} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>First</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{progressData[0]?.value}</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Current PB</div>
                              <div style={{ fontSize: 22, fontWeight: 700, color: accent }}>{progressData[progressData.length - 1]?.value}</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Entries</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{progressData.length}</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px 0', fontSize: 13 }}>
                          No PB data yet for {progressMovement}.<br />Log your first PB in the My PBs tab! 💪
                        </div>
                      )}
                    </div>

                    <div style={{ ...card, marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: '#00c8ff', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>WOD Score History</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Rounds/Reps logged over time</div>
                      {wodScoreHistory.length >= 2 ? (
                        <>
                          <MiniLineChart data={wodScoreHistory.map(s => ({ ...s, value_numeric: s.rounds || s.reps || 0 }))} color="#00c8ff" />
                          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {wodScoreHistory.slice(-5).reverse().map((s, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{new Date(s.logged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>
                                  {s.rounds ? `${s.rounds} rounds` : ''}{s.reps ? `+${s.reps} reps` : ''}
                                  {s.time_seconds ? ` ${Math.floor(s.time_seconds / 60)}:${String(s.time_seconds % 60).padStart(2, '0')}` : ''}
                                  {s.weight_kg ? ` @ ${s.weight_kg}kg` : ''}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px 0', fontSize: 13 }}>
                          No score history yet.<br />Log your WOD score after training! ⚡
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
            {!progressMovement && (
              <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📈</div>
                Select a movement above to see your progress graph!
              </div>
            )}
          </div>
        )}

        {tab === 'pbs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>My Personal Bests</div>
              <button onClick={() => setShowPBForm(!showPBForm)}
                style={{ background: showPBForm ? 'rgba(255,255,255,0.06)' : accent, border: 'none', borderRadius: 10, padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                {showPBForm ? '✕ Cancel' : '+ Add PB'}
              </button>
            </div>

            {showPBForm && (
              <div style={{ ...card, marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 14 }}>Log Personal Best</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Category</div>
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                      {Object.keys(MOVEMENTS).map(cat => (
                        <button key={cat} onClick={() => setProgressCategory(cat)}
                          style={{ background: progressCategory === cat ? accentDim : 'rgba(255,255,255,0.04)', border: `1px solid ${progressCategory === cat ? 'rgba(255,100,0,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 20, padding: '5px 12px', color: progressCategory === cat ? accent : 'rgba(255,255,255,0.5)', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'DM Sans'" }}>
                          {cat.split(' ')[1]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Movement</div>
                    <select style={{ ...inputStyle }} value={pbForm.movement} onChange={e => setPbForm(f => ({ ...f, movement: e.target.value }))}>
                      <option value="">Select movement...</option>
                      {MOVEMENTS[progressCategory].map(m => <option key={m} value={m}>{m}</option>)}
                      <option value="custom">✏️ Custom movement...</option>
                    </select>
                  </div>
                  {pbForm.movement === 'custom' && (
                    <input style={inputStyle} placeholder="Type movement name..." value={pbForm.custom_movement} onChange={e => setPbForm(f => ({ ...f, custom_movement: e.target.value }))} />
                  )}
                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Type</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      {['Weight', 'Reps', 'Time'].map(t => (
                        <button key={t} onClick={() => setPbForm(f => ({ ...f, pb_type: t }))}
                          style={{ background: pbForm.pb_type === t ? accentDim : 'rgba(255,255,255,0.04)', border: `1px solid ${pbForm.pb_type === t ? 'rgba(255,100,0,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '10px 8px', color: pbForm.pb_type === t ? accent : 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans'", fontWeight: pbForm.pb_type === t ? 600 : 400 }}>
                          {t === 'Weight' ? '⚖️ kg' : t === 'Reps' ? '🔁 Reps' : '⏱️ Time'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                      {pbForm.pb_type === 'Weight' ? 'Weight (kg)' : pbForm.pb_type === 'Reps' ? 'Reps' : 'Time (e.g. 4:32)'}
                    </div>
                    <input style={inputStyle} type={pbForm.pb_type === 'Time' ? 'text' : 'number'}
                      placeholder={pbForm.pb_type === 'Weight' ? 'e.g. 80' : pbForm.pb_type === 'Reps' ? 'e.g. 25' : 'e.g. 4:32'}
                      value={pbForm.value} onChange={e => setPbForm(f => ({ ...f, value: e.target.value }))} />
                  </div>
                  <button onClick={handleSavePB} disabled={savingPB}
                    style={{ background: accent, border: 'none', borderRadius: 12, padding: '14px', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'", opacity: savingPB ? 0.6 : 1 }}>
                    {savingPB ? 'Saving...' : '🏆 Save Personal Best'}
                  </button>
                </div>
              </div>
            )}

            {pbs.length > 0 ? pbs.map((pb, i) => (
              <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{pb.movement}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                    {pb.pb_type} • {pb.achieved_at ? new Date(pb.achieved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: accent }}>{pb.value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{pb.pb_type === 'Weight' ? 'kg' : pb.pb_type === 'Time' ? '' : 'reps'}</div>
                </div>
              </div>
            )) : !showPBForm && (
              <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🏋️</div>
                No personal bests yet.<br />Tap "+ Add PB" to start tracking!
              </div>
            )}
          </div>
        )}

        {tab === 'board' && (
          <div>
            <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>This Week's Leaderboard</div>
            {leaderboard.length > 0 ? leaderboard.map((m, i) => (
              <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {i < 3 ? ['🥇', '🥈', '🥉'][i] : <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{i + 1}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{m.count} sessions this week</div>
                </div>
                <div style={{ background: accentDim, color: accent, fontSize: 13, fontWeight: 700, padding: '6px 12px', borderRadius: 10 }}>{m.count}x</div>
              </div>
            )) : (
              <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>
                No sessions this week yet.<br />Check in to get on the board!
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'rgba(10,10,10,0.95)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', backdropFilter: 'blur(20px)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: 'none', border: 'none', padding: '12px 0 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{ fontSize: 9, color: tab === t.id ? accent : 'rgba(255,255,255,0.3)', fontWeight: tab === t.id ? 600 : 400, fontFamily: "'DM Sans'" }}>{t.label}</span>
          </button>
        ))}
      </div>

      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'success' ? 'rgba(0,200,100,0.9)' : toast.type === 'error' ? 'rgba(255,50,50,0.9)' : 'rgba(50,50,50,0.9)', color: '#fff', padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 500, zIndex: 999, whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}