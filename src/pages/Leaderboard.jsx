import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const accent = '#ff6400'
const accentDim = 'rgba(255,100,0,0.12)'

const medals = ['🥇', '🥈', '🥉']
const rankColors = ['rgba(255,215,0,0.9)', 'rgba(192,192,192,0.9)', 'rgba(205,127,50,0.9)']
const rankBg = ['rgba(255,215,0,0.08)', 'rgba(192,192,192,0.06)', 'rgba(205,127,50,0.06)']
const rankBorder = ['rgba(255,215,0,0.2)', 'rgba(192,192,192,0.15)', 'rgba(205,127,50,0.15)']

// Sort scores correctly by type
function sortResults(results) {
  if (!results.length) return results
  const type = results[0].score_type

  return [...results].sort((a, b) => {
    if (type === 'time') {
      // Lower time = better
      const toSecs = v => {
        const [m, s] = (v || '0:0').split(':').map(Number)
        return (m || 0) * 60 + (s || 0)
      }
      return toSecs(a.score_value) - toSecs(b.score_value)
    }
    if (type === 'rounds') {
      // Higher rounds+reps = better
      const toTotal = v => {
        const [r, rp] = (v || '0').split('+').map(Number)
        return (r || 0) * 1000 + (rp || 0)
      }
      return toTotal(b.score_value) - toTotal(a.score_value)
    }
    // weight, reps, calories — higher = better
    return parseFloat(b.score_value) - parseFloat(a.score_value)
  })
}

export default function Leaderboard() {
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [todayWod, setTodayWod] = useState(null)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'rx' | 'scaled'

  useEffect(() => {
    const stored = sessionStorage.getItem('baby_member')
    if (!stored) { navigate('/login'); return }
    setMember(JSON.parse(stored))
    fetchData()

    // Live refresh every 30s
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data: wod } = await supabase
      .from('wods').select('*').eq('scheduled_date', today)
      .order('posted_at', { ascending: false }).limit(1).single()

    if (wod) {
      setTodayWod(wod)
      const { data: res } = await supabase
        .from('wod_results').select('*').eq('wod_id', wod.id)
      if (res) setResults(sortResults(res))
    }
    setLoading(false)
  }

  const filtered = filter === 'all' ? results : results.filter(r => filter === 'rx' ? r.rx : !r.rx)
  const sortedFiltered = sortResults(filtered)

  const unitLabel = (type) => {
    if (type === 'time') return ''
    if (type === 'rounds') return ''
    if (type === 'weight') return 'kg'
    if (type === 'calories') return 'cal'
    if (type === 'reps') return 'reps'
    return ''
  }

  if (loading) return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: "'DM Sans'" }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>Loading leaderboard...</div>
    </div>
  )

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: "'DM Sans', sans-serif", paddingBottom: 40, maxWidth: 480, margin: '0 auto' }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Hero Header */}
      <div style={{ background: 'linear-gradient(180deg, rgba(255,100,0,0.15) 0%, transparent 100%)', padding: '52px 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button onClick={() => navigate(member?.role === 'coach' ? '/coach' : '/member')}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px', color: 'rgba(255,255,255,0.6)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: 3, lineHeight: 1 }}>TODAY'S LEADERBOARD 🏅</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
            </div>
          </div>
          {/* Live refresh dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(0,220,100,0.8)', boxShadow: '0 0 6px rgba(0,220,100,0.6)', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>LIVE</span>
          </div>
        </div>

        {/* WOD summary */}
        {todayWod && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: todayWod.conditioning ? 8 : 0 }}>
              <span style={{ background: accentDim, color: accent, fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 600 }}>{todayWod.type}</span>
              {todayWod.name && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{todayWod.name}</span>}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{results.length} result{results.length !== 1 ? 's' : ''}</span>
            </div>
            {todayWod.conditioning && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                {todayWod.conditioning.substring(0, 100)}{todayWod.conditioning.length > 100 ? '...' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '20px 20px 0' }}>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[{ id: 'all', label: `All (${results.length})` }, { id: 'rx', label: `RX (${results.filter(r => r.rx).length})` }, { id: 'scaled', label: `Scaled (${results.filter(r => !r.rx).length})` }].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{ background: filter === f.id ? accentDim : 'rgba(255,255,255,0.04)', border: `1px solid ${filter === f.id ? 'rgba(255,100,0,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 99, padding: '7px 16px', color: filter === f.id ? accent : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: filter === f.id ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {sortedFiltered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.25)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏁</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No results yet</div>
            <div style={{ fontSize: 13 }}>Be the first to log your score!</div>
            <button onClick={() => navigate('/log-result')}
              style={{ marginTop: 20, background: accent, border: 'none', borderRadius: 12, padding: '13px 24px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
              Log My Result
            </button>
          </div>
        )}

        {/* Leaderboard rows */}
        {sortedFiltered.map((r, i) => {
          const isMe = member && r.member_id === member.id
          const isTop3 = i < 3
          const initial = (r.member_name || '?').charAt(0).toUpperCase()

          return (
            <div key={r.id} style={{
              background: isMe ? 'rgba(255,100,0,0.07)' : isTop3 ? rankBg[i] : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isMe ? 'rgba(255,100,0,0.25)' : isTop3 ? rankBorder[i] : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 14, padding: '14px 16px', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 14,
              transform: isMe ? 'scale(1.01)' : 'scale(1)',
              transition: 'all 0.2s'
            }}>

              {/* Rank */}
              <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
                {isTop3
                  ? <div style={{ fontSize: 26 }}>{medals[i]}</div>
                  : <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>#{i + 1}</div>
                }
              </div>

              {/* Avatar */}
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: isTop3 ? rankBg[i] : 'rgba(255,255,255,0.06)', border: `1px solid ${isTop3 ? rankBorder[i] : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: isTop3 ? rankColors[i] : 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                {initial}
              </div>

              {/* Name + badges */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: isTop3 ? rankColors[i] : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.member_name || 'Unknown'}
                  </span>
                  {isMe && <span style={{ background: accentDim, color: accent, fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 700, flexShrink: 0 }}>YOU</span>}
                </div>
                <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                  <span style={{ background: r.rx ? 'rgba(0,200,100,0.1)' : 'rgba(255,200,0,0.08)', color: r.rx ? 'rgba(0,220,100,0.8)' : 'rgba(255,200,0,0.7)', fontSize: 10, padding: '2px 7px', borderRadius: 99 }}>{r.rx ? 'RX' : 'Scaled'}</span>
                  {r.notes && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>📝</span>}
                </div>
              </div>

              {/* Score */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: isTop3 ? 28 : 22, letterSpacing: 1, color: isTop3 ? rankColors[i] : '#fff', lineHeight: 1 }}>
                  {r.score_value}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                  {unitLabel(r.score_type)}
                </div>
              </div>
            </div>
          )
        })}

        {/* Log CTA if member hasn't logged yet */}
        {member?.role === 'member' && !results.find(r => r.member_id === member.id) && todayWod && (
          <button onClick={() => navigate('/log-result')}
            style={{ width: '100%', background: accent, border: 'none', borderRadius: 14, padding: '16px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'", marginTop: 8 }}>
            + Log My Result
          </button>
        )}

        <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.15)', marginTop: 24 }}>
          Refreshes every 30 seconds
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
