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

// Category each movement belongs to, for grouping PBs
const MOVEMENT_CATEGORY = {}
Object.entries(MOVEMENTS).forEach(([cat, moves]) => moves.forEach(m => { MOVEMENT_CATEGORY[m] = cat }))

// Convert "mm:ss" time string → seconds for chart plotting
function timeToSeconds(str) {
  if (!str || typeof str !== 'string') return null
  const parts = str.split(':').map(Number)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

// Format seconds back to mm:ss
function secondsToTime(secs) {
  if (secs == null) return ''
  const m = Math.floor(secs / 60), s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── VAPID helper ──────────────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

// ── Mini line chart — handles both numeric and time values ────────────────────
function MiniLineChart({ data, color = accent, isTime = false }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width, h = canvas.height
    const pad = 8

    // Resolve numeric value for each point
    const vals = data.map(d => {
      if (isTime) return timeToSeconds(d.value) ?? 0
      return parseFloat(d.value_numeric ?? d.value) || 0
    })

    const min = Math.min(...vals), max = Math.max(...vals)
    const range = max - min || 1

    // For time: lower = better, so flip the y-axis
    const yFor = (v) => {
      const norm = (v - min) / range
      return isTime
        ? pad + norm * (h - pad * 2)           // lower time → top of chart
        : h - pad - norm * (h - pad * 2)        // higher value → top of chart
    }

    ctx.clearRect(0, 0, w, h)

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, color + '44')
    grad.addColorStop(1, 'transparent')
    ctx.beginPath()
    data.forEach((d, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2)
      const y = yFor(vals[i])
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    const lastX = pad + (w - pad * 2)
    const firstX = pad
    ctx.lineTo(lastX, isTime ? 0 : h)
    ctx.lineTo(firstX, isTime ? 0 : h)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    // Line
    ctx.beginPath()
    data.forEach((d, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2)
      const y = yFor(vals[i])
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.stroke()

    // Dots + date labels
    data.forEach((d, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2)
      const y = yFor(vals[i])
      ctx.beginPath()
      ctx.arc(x, y, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
    })
  }, [data, color, isTime])

  if (data.length < 2) return (
    <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
      Log at least 2 entries to see graph
    </div>
  )
  return <canvas ref={canvasRef} width={320} height={90} style={{ width: '100%', height: 90 }} />
}

// ── B.A.B.Y Daily Ring — 3 concentric SVG rings, auto-filled ─────────────────
function DailyRing({ checkedIn, scoredToday, hasCommit }) {
  const score = [checkedIn, scoredToday, hasCommit].filter(Boolean).length
  const rings = [
    { done: checkedIn,   color: '#ff6400', track: 'rgba(255,100,0,0.12)',  r: 68, label: 'Show Up',  icon: '✅' },
    { done: scoredToday, color: '#00b4ff', track: 'rgba(0,180,255,0.1)',   r: 52, label: 'Perform',  icon: '🏆' },
    { done: hasCommit,   color: '#00c878', track: 'rgba(0,200,120,0.1)',   r: 36, label: 'Commit',   icon: '📅' },
  ]
  const cx = 84, cy = 84, sw = 11

  // Arc for a circle: full if done, tiny stub if not
  const arc = (r, pct) => {
    const circ = 2 * Math.PI * r
    return pct > 0 ? `${pct * circ} ${circ}` : `2 ${circ}`
  }
  // Rotate so arc starts from top (-90°)
  const rot = (r) => `rotate(-90 ${cx} ${cy})`

  const ringColor = score === 3 ? '#ffc200' : score === 2 ? '#ff6400' : score === 1 ? '#ff9500' : 'rgba(255,255,255,0.15)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      {/* SVG Rings */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width={168} height={168} style={{ display: 'block' }}>
          {rings.map(({ done, color, track, r }, i) => {
            const circ = 2 * Math.PI * r
            const dash = done ? circ - 2 : 4
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={track} strokeWidth={sw} />
                <circle cx={cx} cy={cy} r={r} fill="none"
                  stroke={done ? color : 'rgba(255,255,255,0.08)'}
                  strokeWidth={sw}
                  strokeDasharray={`${dash} ${circ}`}
                  strokeDashoffset={circ / 4}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${cx} ${cy})`}
                  style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1), stroke 0.5s' }}
                />
              </g>
            )
          })}
          {/* Centre score */}
          <text x={cx} y={cy - 8} textAnchor="middle" fontFamily="'Bebas Neue',sans-serif"
            fontSize={30} fill={ringColor} letterSpacing={2}>{score}/3</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontFamily="'DM Sans',sans-serif"
            fontSize={10} fill="rgba(255,255,255,0.4)" letterSpacing={3}>TODAY</text>
          {score === 3 && (
            <text x={cx} y={cy + 26} textAnchor="middle" fontSize={14}>🏆</text>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rings.map(({ done, color, label, icon }, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: done ? `${color}22` : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${done ? color : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              transition: 'all 0.4s'
            }}>{icon}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: done ? '#fff' : 'rgba(255,255,255,0.35)' }}>{label}</div>
              <div style={{ fontSize: 10, color: done ? color : 'rgba(255,255,255,0.2)' }}>{done ? 'Complete ✓' : 'Not yet'}</div>
            </div>
          </div>
        ))}
        {score === 3 && (
          <div style={{ fontSize: 11, color: '#ffc200', fontWeight: 600, letterSpacing: 1 }}>PERFECT DAY! 🔥</div>
        )}
      </div>
    </div>
  )
}

// ── Streak fire bar ───────────────────────────────────────────────────────────
function StreakBar({ streak, longestStreak }) {
  const fire = streak >= 14 ? '🔥🔥🔥' : streak >= 7 ? '🔥🔥' : '🔥'
  const color = streak >= 14 ? '#ff3a00' : streak >= 7 ? '#ff6400' : '#ff9500'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ fontSize: 28 }}>{fire}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1, fontFamily: "'Bebas Neue'" }}>
          {streak} DAY STREAK
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
          Best: {longestStreak} days
        </div>
      </div>
    </div>
  )
}

// ── 30-day attendance mini calendar dots ─────────────────────────────────────
function AttendanceDots({ attendedDates }) {
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (27 - i))
    return d.toISOString().split('T')[0]
  })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: 4, marginTop: 10 }}>
      {days.map(date => (
        <div key={date} title={date} style={{
          width: '100%', aspectRatio: '1', borderRadius: 3,
          background: attendedDates.has(date) ? accent : 'rgba(255,255,255,0.07)',
          boxShadow: attendedDates.has(date) ? `0 0 4px ${accent}88` : 'none'
        }} />
      ))}
    </div>
  )
}

// ── Board Tab — inline WOD leaderboard + weekly attendance board ──────────────
function BoardTab({ member, navigate, accent, accentDim, card }) {
  const [todayWod, setTodayWod] = useState(null)
  const [results, setResults] = useState([])
  const [weekBoard, setWeekBoard] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const medals = ['🥇', '🥈', '🥉']
  const rankColors = ['rgba(255,215,0,0.9)', 'rgba(192,192,192,0.9)', 'rgba(205,127,50,0.9)']
  const rankBg = ['rgba(255,215,0,0.08)', 'rgba(192,192,192,0.06)', 'rgba(205,127,50,0.06)']
  const rankBorder = ['rgba(255,215,0,0.2)', 'rgba(192,192,192,0.15)', 'rgba(205,127,50,0.15)']

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data: wod } = await supabase.from('wods').select('*')
      .eq('scheduled_date', today).order('posted_at', { ascending: false }).limit(1).single()
    if (wod) {
      setTodayWod(wod)
      const { data: res } = await supabase.from('wod_results').select('*').eq('wod_id', wod.id)
      if (res) setResults(sortWodResults(res))
    }
    // Weekly attendance board
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: logs } = await supabase.from('workout_logs')
      .select('member_id, member_name, logged_at').gte('logged_at', weekAgo)
    if (logs) {
      const counts = {}
      logs.forEach(r => {
        if (!counts[r.member_id]) counts[r.member_id] = { name: r.member_name || 'Unknown', days: new Set() }
        counts[r.member_id].days.add(r.logged_at)
      })
      setWeekBoard(Object.values(counts).map(m => ({ name: m.name, count: m.days.size })).sort((a, b) => b.count - a.count).slice(0, 10))
    }
    setLoading(false)
  }

  function sortWodResults(res) {
    if (!res.length) return res
    const type = res[0].score_type
    return [...res].sort((a, b) => {
      if (type === 'time') {
        const toSecs = v => { const [m, s] = (v || '0:0').split(':').map(Number); return m * 60 + s }
        return toSecs(a.score_value) - toSecs(b.score_value)
      }
      if (type === 'rounds') {
        const toTotal = v => { const [r, rp] = (v || '0').split('+').map(Number); return (r || 0) * 1000 + (rp || 0) }
        return toTotal(b.score_value) - toTotal(a.score_value)
      }
      return parseFloat(b.score_value) - parseFloat(a.score_value)
    })
  }

  const filtered = filter === 'all' ? results : results.filter(r => filter === 'rx' ? r.rx : !r.rx)

  if (loading) return <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>Loading board...</div>

  return (
    <div>
      {/* Today's WOD leaderboard */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>Today's WOD Board 🏅</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(0,220,100,0.8)', boxShadow: '0 0 5px rgba(0,220,100,0.6)' }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>LIVE</span>
        </div>
      </div>

      {todayWod ? (
        <>
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: todayWod.conditioning ? 8 : 0 }}>
              <span style={{ background: accentDim, color: accent, fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 600 }}>{todayWod.type}</span>
              {todayWod.name && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{todayWod.name}</span>}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{results.length} result{results.length !== 1 ? 's' : ''}</span>
            </div>
            {todayWod.conditioning && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{todayWod.conditioning.substring(0, 100)}{todayWod.conditioning.length > 100 ? '...' : ''}</div>}
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[{ id: 'all', label: `All (${results.length})` }, { id: 'rx', label: `RX (${results.filter(r => r.rx).length})` }, { id: 'scaled', label: `Scaled (${results.filter(r => !r.rx).length})` }].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                style={{ background: filter === f.id ? accentDim : 'rgba(255,255,255,0.04)', border: `1px solid ${filter === f.id ? 'rgba(255,100,0,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 99, padding: '6px 14px', color: filter === f.id ? accent : 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: filter === f.id ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.25)', marginBottom: 14 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🏁</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No results yet</div>
              <button onClick={() => navigate('/log-result')} style={{ marginTop: 8, background: accent, border: 'none', borderRadius: 12, padding: '12px 22px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                Log My Result
              </button>
            </div>
          ) : (
            filtered.map((r, i) => {
              const isMe = member && r.member_id === member.id
              const isTop3 = i < 3
              return (
                <div key={r.id} style={{ background: isMe ? 'rgba(255,100,0,0.07)' : isTop3 ? rankBg[i] : 'rgba(255,255,255,0.03)', border: `1px solid ${isMe ? 'rgba(255,100,0,0.25)' : isTop3 ? rankBorder[i] : 'rgba(255,255,255,0.06)'}`, borderRadius: 14, padding: '13px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, textAlign: 'center', flexShrink: 0 }}>
                    {isTop3 ? <div style={{ fontSize: 22 }}>{medals[i]}</div> : <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: 'rgba(255,255,255,0.2)' }}>#{i + 1}</div>}
                  </div>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: isTop3 ? rankBg[i] : 'rgba(255,255,255,0.06)', border: `1px solid ${isTop3 ? rankBorder[i] : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: isTop3 ? rankColors[i] : 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                    {(r.member_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: isTop3 ? rankColors[i] : '#fff' }}>{r.member_name}</span>
                      {isMe && <span style={{ background: accentDim, color: accent, fontSize: 9, padding: '2px 6px', borderRadius: 99, fontWeight: 700 }}>YOU</span>}
                    </div>
                    <span style={{ background: r.rx ? 'rgba(0,200,100,0.1)' : 'rgba(255,200,0,0.08)', color: r.rx ? 'rgba(0,220,100,0.8)' : 'rgba(255,200,0,0.7)', fontSize: 10, padding: '1px 6px', borderRadius: 99 }}>{r.rx ? 'RX' : 'Scaled'}</span>
                  </div>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: isTop3 ? 26 : 20, color: isTop3 ? rankColors[i] : '#fff', letterSpacing: 1 }}>{r.score_value}</div>
                </div>
              )
            })
          )}

          {member?.role === 'member' && !results.find(r => r.member_id === member.id) && (
            <button onClick={() => navigate('/log-result')} style={{ width: '100%', background: accent, border: 'none', borderRadius: 14, padding: '14px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'", marginTop: 4, marginBottom: 20 }}>
              + Log My Result
            </button>
          )}
        </>
      ) : (
        <div style={{ ...card, textAlign: 'center', padding: '30px 20px', color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          No WOD posted yet today. Check back later!
        </div>
      )}

      {/* Weekly attendance leaderboard */}
      <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>This Week's Grind 💪</div>
      {weekBoard.map((m, i) => (
        <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: i < 3 ? '#000' : 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{i + 1}</div>
          <div style={{ flex: 1, fontSize: 14 }}>{m.name}</div>
          <div style={{ fontSize: 12, color: accent, fontWeight: 600 }}>{m.count} {m.count === 1 ? 'day' : 'days'}</div>
          <div style={{ display: 'flex', gap: 2 }}>
            {Array.from({ length: 7 }, (_, j) => (
              <div key={j} style={{ width: 8, height: 8, borderRadius: 2, background: j < m.count ? accent : 'rgba(255,255,255,0.08)' }} />
            ))}
          </div>
        </div>
      ))}
      {weekBoard.length === 0 && <div style={{ ...card, textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No check-ins this week yet. Be first! 🏅</div>}
      <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.15)', marginTop: 16 }}>Board refreshes every 30 seconds</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
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
  const [toast, setToast] = useState(null)

  // Streak
  const [streak, setStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const [attendedDates, setAttendedDates] = useState(new Set())
  const [totalSessions, setTotalSessions] = useState(0)

  const [showPBForm, setShowPBForm] = useState(false)
  const [pbForm, setPbForm] = useState({ movement: '', custom_movement: '', pb_type: 'Weight', value: '' })
  const [savingPB, setSavingPB] = useState(false)

  const [progressMovement, setProgressMovement] = useState('')
  const [customProgress, setCustomProgress] = useState('')
  const [progressData, setProgressData] = useState([])
  const [wodScoreHistory, setWodScoreHistory] = useState([])
  const [loadingProgress, setLoadingProgress] = useState(false)
  const [progressCategory, setProgressCategory] = useState(Object.keys(MOVEMENTS)[0])

  // Goals
  const [goals, setGoals] = useState([]) // [{ movement, target_value, pb_type }]
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalForm, setGoalForm] = useState({ movement: '', target_value: '', pb_type: 'Weight' })
  const [savingGoal, setSavingGoal] = useState(false)

  // Classes & Bookings
  const [classes, setClasses] = useState([])
  const [myBookings, setMyBookings] = useState(new Set())
  const [classBookingLoading, setClassBookingLoading] = useState(new Set())
  const [selectedClassDate, setSelectedClassDate] = useState(new Date().toISOString().split('T')[0])

  // Body Stats
  const [bodyStats, setBodyStats] = useState([])
  const [showBodyForm, setShowBodyForm] = useState(false)
  const [bodyForm, setBodyForm] = useState({ weight: '', body_fat: '', waist: '', chest: '', arm: '', note: '' })
  const [savingBody, setSavingBody] = useState(false)

  // Notification state
  const [notifStatus, setNotifStatus] = useState('idle')

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Boot ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem('baby_member')
    if (!stored) { navigate('/login'); return }
    const m = JSON.parse(stored)
    setMember(m)
    fetchWod()
    fetchPbs(m.id)
    fetchLeaderboard()
    fetchAttendanceAndStreak(m.id)
    checkTodayScore(m.id)
    fetchGoals(m.id)
    fetchClasses(m.id)
    fetchBodyStats(m.id)
  }, [])

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setNotifStatus('unsupported')
    } else if (Notification.permission === 'denied') {
      setNotifStatus('denied')
    }
  }, [])

  // ── Data fetchers ───────────────────────────────────────────────────────────
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

  const fetchAttendanceAndStreak = async (memberId) => {
    const thirtyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data } = await supabase.from('workout_logs')
      .select('logged_at')
      .eq('member_id', memberId)
      .gte('logged_at', thirtyDaysAgo)
      .order('logged_at', { ascending: false })

    if (!data) return

    const dateSet = new Set(data.map(d => d.logged_at))
    setAttendedDates(dateSet)
    setTotalSessions(dateSet.size)

    // Check today's attendance
    const today = new Date().toISOString().split('T')[0]
    if (dateSet.has(today)) setCheckedIn(true)

    // Calculate current streak (consecutive days ending today or yesterday)
    let current = 0
    const check = new Date()
    // If not checked in today, start from yesterday
    if (!dateSet.has(today)) check.setDate(check.getDate() - 1)

    while (true) {
      const d = check.toISOString().split('T')[0]
      if (!dateSet.has(d)) break
      current++
      check.setDate(check.getDate() - 1)
      if (current > 365) break
    }
    setStreak(current)

    // Calculate longest streak in the data
    const allDates = [...dateSet].sort()
    let longest = 0, run = 0
    for (let i = 0; i < allDates.length; i++) {
      if (i === 0) { run = 1; continue }
      const prev = new Date(allDates[i - 1]), curr = new Date(allDates[i])
      const diff = (curr - prev) / (1000 * 60 * 60 * 24)
      run = diff === 1 ? run + 1 : 1
      if (run > longest) longest = run
    }
    setLongestStreak(Math.max(longest, current))
  }

  const checkTodayScore = async (memberId) => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('workout_logs').select('id')
      .eq('member_id', memberId).eq('logged_at', today)
      .not('rounds', 'is', null).limit(1)
    if (data && data.length > 0) setScoredToday(true)
  }

  const fetchGoals = async (memberId) => {
    const { data } = await supabase.from('member_goals').select('*')
      .eq('member_id', memberId).order('created_at', { ascending: false })
    if (data) setGoals(data)
  }

  const fetchBodyStats = async (memberId) => {
    const { data, error } = await supabase.from('member_body_stats')
      .select('*').eq('member_id', memberId)
      .order('logged_date', { ascending: true }).limit(14)
    console.log('[bodyStats] memberId:', memberId, 'data:', data, 'error:', error)
    if (data) setBodyStats(data)
  }

  const saveBodyStats = async () => {
    if (!member || !bodyForm.weight) { showToast('⚠ Weight is required', 'error'); return }
    setSavingBody(true)
    const today = new Date().toISOString().split('T')[0]
    const payload = {
      member_id: member.id, member_name: member.full_name,
      logged_date: today,
      weight_kg: bodyForm.weight ? parseFloat(bodyForm.weight) : null,
      body_fat_pct: bodyForm.body_fat ? parseFloat(bodyForm.body_fat) : null,
      waist_cm: bodyForm.waist ? parseFloat(bodyForm.waist) : null,
      chest_cm: bodyForm.chest ? parseFloat(bodyForm.chest) : null,
      arm_cm: bodyForm.arm ? parseFloat(bodyForm.arm) : null,
      note: bodyForm.note || null
    }
    const { error } = await supabase.from('member_body_stats')
      .upsert([payload], { onConflict: 'member_id,logged_date' })
    if (!error) {
      showToast('✅ Stats saved!', 'success')
      setShowBodyForm(false)
      setBodyForm({ weight: '', body_fat: '', waist: '', chest: '', arm: '', note: '' })
      fetchBodyStats(member.id)
    } else { showToast('Could not save. Try again.', 'error') }
    setSavingBody(false)
  }

  const fetchClasses = async (memberId) => {
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: slots } = await supabase.from('class_slots')
      .select('*').gte('date', today).lte('date', nextWeek)
      .order('date').order('start_time')
    if (!slots || slots.length === 0) return
    const slotIds = slots.map(s => s.id)
    const { data: bookings } = await supabase.from('class_bookings')
      .select('slot_id, member_id, status')
      .in('slot_id', slotIds).eq('status', 'confirmed')
    const countMap = {}
    const myBooked = new Set()
    bookings?.forEach(b => {
      countMap[b.slot_id] = (countMap[b.slot_id] || 0) + 1
      if (b.member_id === memberId) myBooked.add(b.slot_id)
    })
    setClasses(slots.map(s => ({ ...s, bookedCount: countMap[s.id] || 0 })))
    setMyBookings(myBooked)
  }

  const handleBookClass = async (slot) => {
    if (!member || myBookings.has(slot.id)) return
    if (slot.bookedCount >= slot.max_capacity) { showToast('❌ Class is full', 'error'); return }
    setClassBookingLoading(prev => new Set([...prev, slot.id]))
    const { error } = await supabase.from('class_bookings').insert([{
      slot_id: slot.id, member_id: member.id, member_name: member.full_name, status: 'confirmed'
    }])
    if (!error) {
      setMyBookings(prev => new Set([...prev, slot.id]))
      setClasses(prev => prev.map(s => s.id === slot.id ? { ...s, bookedCount: s.bookedCount + 1 } : s))
      showToast(`✅ Booked! ${slot.class_type} @ ${slot.start_time}`, 'success')
    } else { showToast('Could not book. Try again.', 'error') }
    setClassBookingLoading(prev => { const n = new Set(prev); n.delete(slot.id); return n })
  }

  const handleCancelBooking = async (slot) => {
    if (!member) return
    setClassBookingLoading(prev => new Set([...prev, slot.id]))
    const { error } = await supabase.from('class_bookings')
      .update({ status: 'cancelled' }).eq('slot_id', slot.id).eq('member_id', member.id)
    if (!error) {
      setMyBookings(prev => { const n = new Set(prev); n.delete(slot.id); return n })
      setClasses(prev => prev.map(s => s.id === slot.id ? { ...s, bookedCount: Math.max(0, s.bookedCount - 1) } : s))
      showToast('Booking cancelled', 'info')
    }
    setClassBookingLoading(prev => { const n = new Set(prev); n.delete(slot.id); return n })
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleCheckIn = async () => {
    if (checkedIn || !member) return
    setCheckingIn(true)
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('workout_logs').insert([{
      member_id: member.id, member_name: member.full_name,
      wod_name: wod?.name || 'Check-in', workout_type: wod?.type || 'Check-in',
      logged_at: today
    }])
    if (!error) {
      setCheckedIn(true)
      setAttendedDates(prev => new Set([...prev, today]))
      setStreak(prev => prev + 1)
      setTotalSessions(prev => prev + 1)
      showToast('🔥 Checked in! Let\'s get it!', 'success')
      fetchLeaderboard()
    } else showToast('Something went wrong. Try again.', 'error')
    setCheckingIn(false)
  }

  const handleSavePB = async () => {
    if (!member) return
    const movement = pbForm.movement === 'custom' ? pbForm.custom_movement : pbForm.movement
    if (!movement || !pbForm.value) { showToast('⚠ Fill in movement and value', 'error'); return }
    setSavingPB(true)
    const numVal = pbForm.pb_type === 'Time' ? null : parseFloat(pbForm.value)
    await supabase.from('pb_history').insert([{
      member_id: member.id, member_name: member.full_name,
      movement, pb_type: pbForm.pb_type,
      value: pbForm.value, value_numeric: numVal ?? null,
      achieved_at: new Date().toISOString().split('T')[0]
    }])
    const { error } = await supabase.from('personal_bests').upsert([{
      member_id: member.id, member_name: member.full_name,
      movement, pb_type: pbForm.pb_type,
      value: pbForm.value, value_numeric: numVal ?? null,
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
    const { data: pbData } = await supabase.from('pb_history').select('*')
      .eq('member_id', member.id).eq('movement', movementName)
      .order('achieved_at', { ascending: true })
    if (pbData) setProgressData(pbData)
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

  const handleSaveGoal = async () => {
    if (!member || !goalForm.movement || !goalForm.target_value) {
      showToast('⚠ Fill in movement and target', 'error'); return
    }
    setSavingGoal(true)
    const numVal = goalForm.pb_type === 'Time' ? null : parseFloat(goalForm.target_value)
    const { error } = await supabase.from('member_goals').insert([{
      member_id: member.id,
      member_name: member.full_name,
      movement: goalForm.movement,
      pb_type: goalForm.pb_type,
      target_value: goalForm.target_value,
      target_numeric: numVal ?? null,
      created_at: new Date().toISOString()
    }])
    if (!error) {
      showToast('🎯 Goal set!', 'success')
      setShowGoalForm(false)
      setGoalForm({ movement: '', target_value: '', pb_type: 'Weight' })
      fetchGoals(member.id)
    } else {
      // Table might not exist yet — show graceful message
      showToast('Goal saved locally (DB table needed)', 'info')
      setGoals(prev => [...prev, { ...goalForm, id: Date.now(), member_id: member.id }])
      setShowGoalForm(false)
    }
    setSavingGoal(false)
  }

  const handleDeleteGoal = async (goalId) => {
    await supabase.from('member_goals').delete().eq('id', goalId)
    setGoals(prev => prev.filter(g => g.id !== goalId))
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
        member_id: (() => { const s = sessionStorage.getItem('baby_member'); return s ? JSON.parse(s).id : member?.id })(),
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

  // ── Derived ─────────────────────────────────────────────────────────────────
  const firstName = member?.full_name?.split(' ')[0] || 'Athlete'
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

  // Group PBs by category
  const pbsByCategory = {}
  pbs.forEach(pb => {
    const cat = MOVEMENT_CATEGORY[pb.movement] || '⚡ Other'
    if (!pbsByCategory[cat]) pbsByCategory[cat] = []
    pbsByCategory[cat].push(pb)
  })

  const tabs = [
    { id: 'home',    label: 'Home',    icon: '🏠' },
    { id: 'classes', label: 'Classes', icon: '📅' },
    { id: 'wod',     label: 'WOD',     icon: '⚡' },
    { id: 'progress',label: 'Progress',icon: '📈' },
    { id: 'pbs',     label: 'My PBs',  icon: '🏆' },
    { id: 'board',   label: 'Board',   icon: '📊' },
  ]

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none',
    fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box'
  }

  const notifLabel = {
    idle: '🔔 Enable Notifications',
    loading: 'Setting up...',
    granted: '✅ Notifications On',
    denied: '🚫 Notifications Blocked',
    unsupported: 'Notifications Not Supported'
  }[notifStatus]

  const notifBg = notifStatus === 'granted'
    ? 'rgba(0,200,100,0.15)'
    : notifStatus === 'denied' || notifStatus === 'unsupported'
      ? 'rgba(255,50,50,0.1)'
      : 'rgba(255,255,255,0.06)'

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: "'DM Sans', sans-serif", paddingBottom: 80, maxWidth: 480, margin: '0 auto', position: 'relative' }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding: '48px 20px 12px' }}>
        {/* Brand bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* B.A.B.Y letter mark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {['B','A','B','Y'].map((letter, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: i % 2 === 0 ? 'linear-gradient(135deg, #ff6400, #ff2d00)' : 'rgba(255,100,0,0.1)',
                    border: i % 2 === 1 ? '1px solid rgba(255,100,0,0.35)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span style={{ fontFamily: "'Bebas Neue'", fontSize: 12, color: '#fff' }}>{letter}</span>
                  </div>
                  {i < 3 && <div style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'rgba(255,100,0,0.45)', margin: '0 1.5px' }} />}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2.5, textTransform: 'uppercase' }}>Build A Better You</div>
          </div>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '7px 13px', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer' }}>Sign Out</button>
        </div>
        {/* Greeting */}
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>{todayLabel}</div>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 34, letterSpacing: 2, lineHeight: 1 }}>HEY {firstName.toUpperCase()} 👊</div>
      </div>

      <div style={{ padding: '0 20px' }}>

        {/* ── HOME TAB ── */}
        {tab === 'home' && (
          <>
            {/* Streak card */}
            {streak > 0 && (
              <div style={{ ...card, marginBottom: 14, background: streak >= 7 ? 'rgba(255,100,0,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${streak >= 7 ? 'rgba(255,100,0,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                <StreakBar streak={streak} longestStreak={longestStreak} />
                <AttendanceDots attendedDates={attendedDates} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>← 28 days</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{totalSessions} total sessions</div>
                </div>
              </div>
            )}

            {/* ── B.A.B.Y Daily Ring ── */}
            <div style={{ ...card, marginBottom: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative' }}>
              {/* Glow behind ring */}
              {[checkedIn, scoredToday, myBookings.size > 0].filter(Boolean).length === 3 && (
                <div style={{ position:'absolute', top:-40, left:'50%', transform:'translateX(-50%)', width:200, height:200, background:'radial-gradient(circle, rgba(255,194,0,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />
              )}
              <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 14 }}>TODAY'S RING</div>
              <DailyRing
                checkedIn={checkedIn}
                scoredToday={scoredToday}
                hasCommit={myBookings.size > 0}
              />
              {/* Check-in button below ring */}
              {!checkedIn && (
                <button onClick={handleCheckIn} disabled={checkingIn}
                  style={{ width:'100%', marginTop:16, background: accent, border:'none', borderRadius:12, padding:'13px', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans'" }}>
                  {checkingIn ? '...' : '✅ Check In — Fill the Ring'}
                </button>
              )}
              {checkedIn && (
                <div style={{ marginTop:14, display:'flex', gap:8 }}>
                  {!scoredToday && (
                    <button onClick={() => navigate('/log-result')}
                      style={{ flex:1, background:'rgba(0,180,255,0.1)', border:'1px solid rgba(0,180,255,0.3)', borderRadius:10, padding:'10px', color:'#00b4ff', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans'" }}>
                      🏆 Log Result
                    </button>
                  )}
                  {myBookings.size === 0 && (
                    <button onClick={() => setTab('classes')}
                      style={{ flex:1, background:'rgba(0,200,120,0.1)', border:'1px solid rgba(0,200,120,0.3)', borderRadius:10, padding:'10px', color:'#00c878', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans'" }}>
                      📅 Book a Class
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* WOD preview */}
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
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={() => navigate('/log-result')}
                      style={{ flex: 1, background: accent, border: 'none', borderRadius: 10, padding: '11px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                      🏆 Log My Result
                    </button>
                    <button onClick={() => navigate('/leaderboard')}
                      style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                      🏅 Leaderboard
                    </button>
                  </div>
                </>
              ) : <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No WOD posted yet. Check back soon! 💤</div>}
            </div>

            {/* Today's Classes preview */}
            {(() => {
              const today = new Date().toISOString().split('T')[0]
              const todayClasses = classes.filter(c => c.date === today)
              if (todayClasses.length === 0) return null
              const CLASS_ICONS = { CrossFit: '🏋️', Gymnastics: '🤸', Strength: '💪', Olympic: '🥇', Running: '🏃', Hyrox: '⚡', 'Open Gym': '🏟️', Community: '🎉' }
              const fmtTime = (t) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}` }
              return (
                <div style={{ ...card, marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: '#00b4ff', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>Today's Classes 📅</div>
                    <button onClick={() => setTab('classes')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans'" }}>See all →</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {todayClasses.map(slot => {
                      const isBooked = myBookings.has(slot.id)
                      const spotsLeft = slot.max_capacity - slot.bookedCount
                      return (
                        <div key={slot.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 18 }}>{CLASS_ICONS[slot.class_type] || '🏋️'}</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{slot.class_name || slot.class_type}</div>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{fmtTime(slot.start_time)} · {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}</div>
                            </div>
                          </div>
                          {isBooked
                            ? <span style={{ fontSize: 11, color: '#00c878', fontWeight: 600 }}>✓ Booked</span>
                            : <button onClick={() => handleBookClass(slot)} disabled={spotsLeft <= 0 || classBookingLoading.has(slot.id)}
                                style={{ background: accent, border: 'none', borderRadius: 8, padding: '7px 14px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'", opacity: spotsLeft <= 0 ? 0.4 : 1 }}>
                                {classBookingLoading.has(slot.id) ? '...' : 'Book'}
                              </button>
                          }
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* Goals preview */}
            {goals.length > 0 && (
              <div style={{ ...card, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: '#00c8ff', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>My Goals 🎯</div>
                  <button onClick={() => setTab('pbs')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>Manage →</button>
                </div>
                {goals.slice(0, 3).map((goal, i) => {
                  const pb = pbs.find(p => p.movement === goal.movement)
                  const current = pb ? parseFloat(pb.value_numeric ?? pb.value) : 0
                  const target = parseFloat(goal.target_numeric ?? goal.target_value) || 1
                  const pct = Math.min(100, Math.round((current / target) * 100))
                  return (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{goal.movement}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                          {pb ? pb.value : '–'} / {goal.target_value} {goal.pb_type === 'Weight' ? 'kg' : goal.pb_type === 'Reps' ? 'reps' : ''}
                        </div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#00c864' : '#00c8ff', borderRadius: 99, transition: 'width 0.5s' }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3, textAlign: 'right' }}>{pct}%</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* PBs preview */}
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
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{pb.value}<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 2 }}>{pb.pb_type === 'Weight' ? 'kg' : pb.pb_type === 'Reps' ? ' reps' : ''}</span></div>
                    </div>
                  ))}
                </div>
              ) : <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No PBs logged yet. Start tracking! 🏋️</div>}
            </div>

            {/* Leaderboard preview */}
            <div style={{ ...card, marginBottom: 14 }}>
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

            {/* Notifications card */}
            <div style={{ ...card, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Push Notifications</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>Get notified when today's WOD is posted 🔔</div>
              <button onClick={enableNotifications} disabled={notifStatus !== 'idle'}
                style={{ width: '100%', background: notifBg, border: `1px solid ${notifStatus === 'granted' ? 'rgba(0,200,100,0.3)' : notifStatus === 'denied' ? 'rgba(255,50,50,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 12, padding: '13px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: notifStatus === 'idle' ? 'pointer' : 'default', fontFamily: "'DM Sans'", opacity: notifStatus === 'loading' ? 0.6 : 1 }}>
                {notifLabel}
              </button>
              {notifStatus === 'denied' && (
                <div style={{ fontSize: 12, color: 'rgba(255,100,100,0.7)', marginTop: 8, textAlign: 'center' }}>Open browser settings → allow notifications for this site.</div>
              )}
            </div>
          </>
        )}

        {/* ── WOD TAB ── */}
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
                    <button onClick={() => navigate('/log-result')}
                      style={{ width: '100%', background: accent, border: 'none', borderRadius: 12, padding: '14px', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'", marginTop: 8 }}>
                      🏆 Log My Result
                    </button>
                  )}
                </>
              ) : <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '40px 0' }}>No WOD posted yet 💤</div>}
            </div>
          </>
        )}

        {/* ── PROGRESS TAB ── */}
        {tab === 'progress' && (
          <div>
            <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 14 }}>Progress Tracker 📈</div>

            {/* ── BODY STATS SECTION ── */}
            {(() => {
              const latest = bodyStats[bodyStats.length - 1]
              const prev = bodyStats.length > 1 ? bodyStats[bodyStats.length - 2] : null
              const weightDiff = latest && prev ? (latest.weight_kg - prev.weight_kg).toFixed(1) : null
              const weightData = bodyStats.filter(s => s.weight_kg).map(s => ({ value: String(s.weight_kg), value_numeric: s.weight_kg, label: s.logged_date }))

              const inStyle = { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'11px 12px', color:'#fff', fontSize:13, fontFamily:"'DM Sans'", width:'100%', outline:'none', colorScheme:'dark', boxSizing:'border-box' }

              return (
                <div style={{ ...card, marginBottom: 16, border:'1px solid rgba(255,100,0,0.2)', background:'rgba(255,100,0,0.03)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <div style={{ fontSize:11, color:accent, letterSpacing:2, textTransform:'uppercase', fontWeight:600 }}>Body Stats 📏</div>
                    <button onClick={() => setShowBodyForm(v => !v)}
                      style={{ background: showBodyForm?'rgba(255,255,255,0.06)':accent, border:'none', borderRadius:8, padding:'6px 14px', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans'" }}>
                      {showBodyForm ? 'Cancel' : '+ Log Stats'}
                    </button>
                  </div>

                  {/* Log form */}
                  {showBodyForm && (
                    <div style={{ marginBottom:14 }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                        {[
                          { key:'weight', label:'Weight (kg)', ph:'e.g. 82.5' },
                          { key:'body_fat', label:'Body Fat (%)', ph:'e.g. 18.5' },
                          { key:'waist', label:'Waist (cm)', ph:'e.g. 86' },
                          { key:'chest', label:'Chest (cm)', ph:'e.g. 98' },
                          { key:'arm', label:'Arm (cm)', ph:'e.g. 34' },
                        ].map(({ key, label, ph }) => (
                          <div key={key}>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', letterSpacing:1, textTransform:'uppercase', marginBottom:4 }}>{label}</div>
                            <input type="number" step="0.1" placeholder={ph} value={bodyForm[key]}
                              onChange={e => setBodyForm(f => ({ ...f, [key]: e.target.value }))}
                              style={inStyle} />
                          </div>
                        ))}
                        <div>
                          <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', letterSpacing:1, textTransform:'uppercase', marginBottom:4 }}>Note (optional)</div>
                          <input placeholder="e.g. Morning, fasted" value={bodyForm.note}
                            onChange={e => setBodyForm(f => ({ ...f, note: e.target.value }))}
                            style={inStyle} />
                        </div>
                      </div>
                      <button onClick={saveBodyStats} disabled={savingBody}
                        style={{ width:'100%', background:accent, border:'none', borderRadius:10, padding:'12px', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans'" }}>
                        {savingBody ? 'Saving...' : '💾 Save Today\'s Stats'}
                      </button>
                    </div>
                  )}

                  {/* Latest stats summary */}
                  {latest ? (
                    <>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
                        {[
                          { label:'Weight', val: latest.weight_kg ? `${latest.weight_kg} kg` : '–', diff: weightDiff, color: weightDiff < 0 ? '#00c878' : weightDiff > 0 ? '#ff5050' : null },
                          { label:'Body Fat', val: latest.body_fat_pct ? `${latest.body_fat_pct}%` : '–', color: null },
                          { label:'Waist', val: latest.waist_cm ? `${latest.waist_cm}cm` : '–', color: null },
                          { label:'Chest', val: latest.chest_cm ? `${latest.chest_cm}cm` : '–', color: null },
                          { label:'Arm', val: latest.arm_cm ? `${latest.arm_cm}cm` : '–', color: null },
                        ].map(({ label, val, diff, color }) => (
                          <div key={label} style={{ flex:'1 1 30%', background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'10px 12px', minWidth:0 }}>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', letterSpacing:1, textTransform:'uppercase', marginBottom:3 }}>{label}</div>
                            <div style={{ fontSize:16, fontWeight:700, color: color || '#fff' }}>{val}</div>
                            {diff && <div style={{ fontSize:10, color: diff < 0 ? '#00c878' : '#ff5050', marginTop:2 }}>{diff > 0 ? '+' : ''}{diff} kg</div>}
                          </div>
                        ))}
                      </div>

                      {/* Weight trend chart */}
                      {weightData.length >= 2 && (
                        <div>
                          <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', letterSpacing:1, textTransform:'uppercase', marginBottom:6 }}>Weight Trend ({weightData.length} entries)</div>
                          <MiniLineChart data={weightData} color="#ff6400" />
                          <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                            <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>{weightData[0]?.label}</span>
                            <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>{weightData[weightData.length-1]?.label}</span>
                          </div>
                        </div>
                      )}

                      <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:8 }}>
                        Last logged: {new Date(latest.logged_date+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                        {latest.note && ` · ${latest.note}`}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign:'center', padding:'20px 0', color:'rgba(255,255,255,0.3)' }}>
                      <div style={{ fontSize:28, marginBottom:6 }}>📏</div>
                      <div style={{ fontSize:13 }}>No stats logged yet</div>
                      <div style={{ fontSize:11, marginTop:4 }}>Log your first entry to start tracking</div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Category filter — wrapped grid, all visible */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {Object.keys(MOVEMENTS).map(cat => (
                <button key={cat} onClick={() => setProgressCategory(cat)}
                  style={{ background: progressCategory === cat ? accentDim : 'rgba(255,255,255,0.04)', border: `1px solid ${progressCategory === cat ? 'rgba(255,100,0,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 20, padding: '7px 14px', color: progressCategory === cat ? accent : 'rgba(255,255,255,0.5)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'DM Sans'", fontWeight: progressCategory === cat ? 600 : 400 }}>
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
                      <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Personal Best — {progressMovement}</div>
                      {(() => {
                        const isTime = progressData.length > 0 && progressData[0].pb_type === 'Time'
                        return (
                          <>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
                              {isTime ? 'Time improving (lower = better) ⬇️' : 'Value improving over time ⬆️'}
                            </div>
                            {progressData.length > 0 ? (
                              <>
                                <MiniLineChart data={progressData} color={accent} isTime={isTime} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>First</div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{progressData[0]?.value}</div>
                                  </div>
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Best</div>
                                    <div style={{ fontSize: 22, fontWeight: 700, color: accent }}>{progressData[progressData.length - 1]?.value}</div>
                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                                      {progressData[0].pb_type === 'Weight' ? 'kg' : progressData[0].pb_type === 'Reps' ? 'reps' : ''}
                                    </div>
                                  </div>
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Entries</div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{progressData.length}</div>
                                  </div>
                                </div>
                                {/* Entry list */}
                                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {[...progressData].reverse().slice(0, 5).map((d, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                                        {new Date(d.achieved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                      </div>
                                      <div style={{ fontSize: 14, fontWeight: 600, color: i === 0 ? accent : '#fff' }}>{d.value}</div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px 0', fontSize: 13 }}>
                                No PB data yet for {progressMovement}.<br />Log your first PB in the My PBs tab! 💪
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>

                    <div style={{ ...card, marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: '#00c8ff', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>WOD Score History</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Rounds / Reps over time</div>
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

        {/* ── PBs TAB ── */}
        {tab === 'pbs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>My Personal Bests</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowGoalForm(!showGoalForm)}
                  style={{ background: showGoalForm ? 'rgba(0,200,100,0.15)' : 'rgba(0,200,100,0.1)', border: '1px solid rgba(0,200,100,0.25)', borderRadius: 10, padding: '7px 12px', color: 'rgba(0,220,100,0.9)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                  🎯 Goal
                </button>
                <button onClick={() => setShowPBForm(!showPBForm)}
                  style={{ background: showPBForm ? 'rgba(255,255,255,0.06)' : accent, border: 'none', borderRadius: 10, padding: '7px 14px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                  {showPBForm ? '✕ Cancel' : '+ Add PB'}
                </button>
              </div>
            </div>

            {/* Goal form */}
            {showGoalForm && (
              <div style={{ ...card, marginBottom: 14, border: '1px solid rgba(0,200,100,0.2)' }}>
                <div style={{ fontSize: 11, color: 'rgba(0,220,100,0.9)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 14 }}>Set a Goal 🎯</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input style={inputStyle} placeholder="Movement (e.g. Back Squat)" value={goalForm.movement}
                    onChange={e => setGoalForm(f => ({ ...f, movement: e.target.value }))} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {['Weight', 'Reps', 'Time'].map(t => (
                      <button key={t} onClick={() => setGoalForm(f => ({ ...f, pb_type: t }))}
                        style={{ background: goalForm.pb_type === t ? 'rgba(0,200,100,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${goalForm.pb_type === t ? 'rgba(0,200,100,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '9px 8px', color: goalForm.pb_type === t ? 'rgba(0,220,100,0.9)' : 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                        {t === 'Weight' ? '⚖️ kg' : t === 'Reps' ? '🔁 Reps' : '⏱️ Time'}
                      </button>
                    ))}
                  </div>
                  <input style={inputStyle} placeholder={goalForm.pb_type === 'Weight' ? 'Target kg, e.g. 100' : goalForm.pb_type === 'Reps' ? 'Target reps, e.g. 20' : 'Target time, e.g. 25:00'}
                    value={goalForm.target_value} onChange={e => setGoalForm(f => ({ ...f, target_value: e.target.value }))} />
                  <button onClick={handleSaveGoal} disabled={savingGoal}
                    style={{ background: 'rgba(0,200,100,0.15)', border: '1px solid rgba(0,200,100,0.3)', borderRadius: 12, padding: '12px', color: 'rgba(0,220,100,0.9)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                    {savingGoal ? 'Saving...' : '🎯 Set Goal'}
                  </button>
                </div>
              </div>
            )}

            {/* Active goals */}
            {goals.length > 0 && (
              <div style={{ ...card, marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'rgba(0,220,100,0.8)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>Active Goals</div>
                {goals.map((goal, i) => {
                  const pb = pbs.find(p => p.movement === goal.movement)
                  const current = pb ? parseFloat(pb.value_numeric ?? pb.value) : 0
                  const target = parseFloat(goal.target_numeric ?? goal.target_value) || 1
                  const pct = Math.min(100, Math.round((current / target) * 100))
                  const done = pct >= 100
                  return (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: done ? 'rgba(0,220,100,0.9)' : '#fff' }}>
                          {done ? '✅ ' : '🎯 '}{goal.movement}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                            {pb ? pb.value : '–'} → {goal.target_value}
                          </div>
                          <button onClick={() => handleDeleteGoal(goal.id)}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,80,80,0.5)', fontSize: 14, cursor: 'pointer', padding: '0 4px' }}>✕</button>
                        </div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 99, height: 8 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: done ? '#00c864' : 'linear-gradient(90deg, #00c8ff, #00c864)', borderRadius: 99, transition: 'width 0.5s' }} />
                      </div>
                      <div style={{ fontSize: 10, color: done ? 'rgba(0,220,100,0.7)' : 'rgba(255,255,255,0.3)', marginTop: 3, textAlign: 'right' }}>
                        {done ? 'GOAL ACHIEVED! 🏆' : `${pct}% there`}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* PB form */}
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
                      {pbForm.pb_type === 'Weight' ? 'Weight (kg)' : pbForm.pb_type === 'Reps' ? 'Reps' : 'Time (mm:ss e.g. 4:32)'}
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

            {/* PBs grouped by category */}
            {pbs.length > 0 ? (
              Object.entries(pbsByCategory).map(([cat, catPbs]) => (
                <div key={cat} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>{cat}</div>
                  {catPbs.map((pb, i) => (
                    <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
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
                  ))}
                </div>
              ))
            ) : !showPBForm && !showGoalForm && (
              <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🏋️</div>
                No personal bests yet.<br />Tap "+ Add PB" to start tracking!
              </div>
            )}
          </div>
        )}

        {/* ── CLASSES TAB ── */}
        {tab === 'classes' && (() => {
          const CLASS_COLORS = {
            'CrossFit':   { bg: 'rgba(255,100,0,0.12)', border: 'rgba(255,100,0,0.35)', text: '#ff6400' },
            'Gymnastics': { bg: 'rgba(255,50,150,0.1)', border: 'rgba(255,50,150,0.3)', text: '#ff3296' },
            'Strength':   { bg: 'rgba(255,200,0,0.1)',  border: 'rgba(255,200,0,0.3)',  text: '#ffc800' },
            'Olympic':    { bg: 'rgba(0,160,255,0.1)',  border: 'rgba(0,160,255,0.3)',  text: '#00a0ff' },
            'Running':    { bg: 'rgba(0,200,120,0.1)',  border: 'rgba(0,200,120,0.3)',  text: '#00c878' },
            'Hyrox':      { bg: 'rgba(140,0,255,0.1)',  border: 'rgba(140,0,255,0.3)',  text: '#8c00ff' },
            'Open Gym':   { bg: 'rgba(0,180,255,0.1)',  border: 'rgba(0,180,255,0.3)',  text: '#00b4ff' },
            'Community':  { bg: 'rgba(0,220,180,0.1)',  border: 'rgba(0,220,180,0.3)',  text: '#00dcb4' },
          }
          const CLASS_ICONS = {
            CrossFit:'🏋️', Gymnastics:'🤸', Strength:'💪', Olympic:'🥇',
            Running:'🏃', Hyrox:'⚡', 'Open Gym':'🏟️', Community:'🎉'
          }
          const fmtTime = (t) => { const [h,m]=t.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}` }

          // Build 7-day picker: today + next 6 days (skip Sunday=0)
          const todayStr = new Date().toISOString().split('T')[0]
          const pickerDays = []
          let d = new Date(); d.setHours(0,0,0,0)
          while (pickerDays.length < 7) {
            const iso = d.toISOString().split('T')[0]
            const dow = d.getDay()
            if (dow !== 0) { // skip Sunday
              pickerDays.push({
                iso,
                dow,
                label: iso === todayStr ? 'Today' : d.toLocaleDateString('en-IN',{weekday:'short'}),
                dayNum: d.getDate()
              })
            }
            d.setDate(d.getDate()+1)
          }

          const displayDate = selectedClassDate
          const daySlots = classes.filter(c => c.date === displayDate)
          const myUpcoming = classes.filter(c => myBookings.has(c.id) && c.date >= todayStr)

          // Full day name for header
          const headerLabel = displayDate === todayStr
            ? "Today's Classes"
            : new Date(displayDate+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short'})

          return (
            <>
              {/* Day picker strip */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
                {pickerDays.map(pd => {
                  const sel = pd.iso === displayDate
                  const hasClass = classes.some(c => c.date === pd.iso)
                  return (
                    <button key={pd.iso} onClick={() => setSelectedClassDate(pd.iso)}
                      style={{
                        flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 2, padding: '8px 12px', borderRadius: 12, cursor: 'pointer',
                        background: sel ? accent : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${sel ? accent : 'rgba(255,255,255,0.08)'}`,
                        minWidth: 52
                      }}>
                      <span style={{ fontSize: 10, color: sel ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: 600, fontFamily:"'DM Sans'" }}>{pd.label}</span>
                      <span style={{ fontSize: 16, fontFamily:"'Bebas Neue'", color: sel ? '#fff' : 'rgba(255,255,255,0.7)', letterSpacing:1 }}>{pd.dayNum}</span>
                      {hasClass && <div style={{ width:4, height:4, borderRadius:'50%', background: sel ? 'rgba(255,255,255,0.6)' : accent }} />}
                    </button>
                  )
                })}
              </div>

              {/* My upcoming bookings (compact, only if any) */}
              {myUpcoming.length > 0 && (
                <div style={{ ...card, marginBottom: 14, background:'rgba(0,200,120,0.05)', border:'1px solid rgba(0,200,120,0.2)' }}>
                  <div style={{ fontSize:11, color:'#00c878', letterSpacing:2, textTransform:'uppercase', fontWeight:600, marginBottom:8 }}>✅ My Bookings ({myUpcoming.length})</div>
                  {myUpcoming.map(slot => {
                    const col = CLASS_COLORS[slot.class_type] || CLASS_COLORS['CrossFit']
                    return (
                      <div key={slot.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:7, marginBottom:7, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:16 }}>{CLASS_ICONS[slot.class_type]||'🏋️'}</span>
                          <div>
                            <div style={{ fontSize:12, fontWeight:600 }}>{slot.class_name||slot.class_type}</div>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)' }}>
                              {slot.date === todayStr ? 'Today' : new Date(slot.date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})} · {fmtTime(slot.start_time)}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => handleCancelBooking(slot)} disabled={classBookingLoading.has(slot.id)}
                          style={{ background:'rgba(255,80,80,0.1)', border:'1px solid rgba(255,80,80,0.2)', borderRadius:7, padding:'5px 11px', color:'rgba(255,120,120,0.9)', fontSize:11, cursor:'pointer', fontFamily:"'DM Sans'" }}>
                          {classBookingLoading.has(slot.id)?'...':'Cancel'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Day header */}
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', fontWeight:600, letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}>
                {headerLabel}
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)', fontWeight:400, marginLeft:8 }}>{daySlots.length} classes</span>
              </div>

              {/* Class list for selected day */}
              {daySlots.length === 0 ? (
                <div style={{ ...card, textAlign:'center', padding:'32px 20px', color:'rgba(255,255,255,0.3)' }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>😴</div>
                  <div style={{ fontSize:14 }}>No classes today</div>
                  <div style={{ fontSize:12, marginTop:4 }}>Tap another day above to check</div>
                </div>
              ) : daySlots.map(slot => {
                const col = CLASS_COLORS[slot.class_type] || CLASS_COLORS['CrossFit']
                const spotsLeft = slot.max_capacity - slot.bookedCount
                const isFull = spotsLeft <= 0
                const isBooked = myBookings.has(slot.id)
                const isLoading = classBookingLoading.has(slot.id)
                const fillPct = Math.min(100, Math.round((slot.bookedCount/slot.max_capacity)*100))

                return (
                  <div key={slot.id} style={{
                    ...card, marginBottom:10,
                    border:`1px solid ${isBooked?'rgba(0,200,120,0.3)':isFull?'rgba(255,255,255,0.06)':col.border}`,
                    background: isBooked?'rgba(0,200,120,0.05)':'rgba(255,255,255,0.03)',
                    opacity: isFull&&!isBooked ? 0.55 : 1
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      {/* Time column */}
                      <div style={{ width:48, flexShrink:0, textAlign:'center' }}>
                        <div style={{ fontFamily:"'Bebas Neue'", fontSize:18, color: isBooked?'#00c878':col.text, letterSpacing:1, lineHeight:1 }}>
                          {fmtTime(slot.start_time).replace(' AM','').replace(' PM','')}
                        </div>
                        <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', letterSpacing:1 }}>
                          {slot.start_time>='12:00'?'PM':'AM'}
                        </div>
                      </div>

                      {/* Divider */}
                      <div style={{ width:2, height:44, borderRadius:2, background: isBooked?'rgba(0,200,120,0.4)':col.border, flexShrink:0 }} />

                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
                          <span style={{ fontSize:14, fontWeight:600 }}>{slot.class_name||slot.class_type}</span>
                          <span style={{ fontSize:10, color:col.text, background:col.bg, padding:'2px 7px', borderRadius:99, fontWeight:600 }}>{slot.class_type}</span>
                          {isBooked && <span style={{ fontSize:10, color:'#00c878', fontWeight:600 }}>✓ Booked</span>}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:3, background:'rgba(255,255,255,0.07)', borderRadius:99, overflow:'hidden' }}>
                            <div style={{ width:`${fillPct}%`, height:'100%', background:fillPct>=90?'#ff3a00':fillPct>=70?'#ffb800':'#00c878', borderRadius:99 }} />
                          </div>
                          <span style={{ fontSize:10, color:isFull?'#ff5050':'rgba(255,255,255,0.35)', whiteSpace:'nowrap', fontWeight:isFull?600:400 }}>
                            {isFull?'Full':`${spotsLeft} left`}
                          </span>
                        </div>
                      </div>

                      {/* Book button */}
                      <button onClick={() => isBooked?handleCancelBooking(slot):handleBookClass(slot)}
                        disabled={isLoading||(isFull&&!isBooked)}
                        style={{
                          background: isBooked?'rgba(0,200,120,0.15)':isFull?'rgba(255,255,255,0.04)':accent,
                          border:`1px solid ${isBooked?'rgba(0,200,120,0.4)':isFull?'rgba(255,255,255,0.08)':'transparent'}`,
                          borderRadius:10, padding:'9px 14px',
                          color: isBooked?'#00c878':isFull?'rgba(255,255,255,0.25)':'#fff',
                          fontSize:12, fontWeight:600, cursor:isFull&&!isBooked?'not-allowed':'pointer',
                          flexShrink:0, fontFamily:"'DM Sans'"
                        }}>
                        {isLoading?'...':isBooked?'✓':isFull?'Full':'Book'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )
        })()}

        {/* ── BOARD TAB ── */}
        {tab === 'board' && (
          <BoardTab member={member} navigate={navigate} accent={accent} accentDim={accentDim} card={card} />
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'rgba(10,10,10,0.95)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', backdropFilter: 'blur(20px)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: 'none', border: 'none', padding: '12px 0 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{ fontSize: 9, color: tab === t.id ? accent : 'rgba(255,255,255,0.3)', fontWeight: tab === t.id ? 600 : 400, fontFamily: "'DM Sans'" }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'success' ? 'rgba(0,200,100,0.9)' : toast.type === 'error' ? 'rgba(255,50,50,0.9)' : 'rgba(50,50,50,0.9)', color: '#fff', padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 500, zIndex: 999, whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
