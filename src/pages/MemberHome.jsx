import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const accent = '#ff6400'
const accentDim = 'rgba(255,100,0,0.12)'
const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '16px 18px' }

const MOVEMENTS = [
  'Back Squat', 'Front Squat', 'Overhead Squat', 'Deadlift', 'Clean', 'Clean & Jerk',
  'Snatch', 'Press', 'Push Press', 'Jerk', 'Bench Press', 'Pull-ups (Max)', 'Other'
]

export default function MemberHome() {
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [wod, setWod] = useState(null)
  const [pbs, setPbs] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [checkedIn, setCheckedIn] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [tab, setTab] = useState('home')
  const [toast, setToast] = useState(null)

  // WOD Score logging
  const [showScoreForm, setShowScoreForm] = useState(false)
  const [score, setScore] = useState({ rounds: '', reps: '', time: '', weight_kg: '', notes: '' })
  const [loggingScore, setLoggingScore] = useState(false)

  // PB logging
  const [showPbForm, setShowPbForm] = useState(false)
  const [pb, setPb] = useState({ movement: '', pb_type: 'Weight', value: '', value_numeric: '' })
  const [loggingPb, setLoggingPb] = useState(false)

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
  }, [])

  const fetchWod = async () => {
    const today = new Date().toISOString().split('T')[0]
    // Try scheduled_date first
    const { data } = await supabase
      .from('wods')
      .select('*')
      .eq('scheduled_date', today)
      .order('posted_at', { ascending: false })
      .limit(1)
    if (data && data.length > 0) { setWod(data[0]); return }
    // Fallback: posted today
    const { data: data2 } = await supabase
      .from('wods')
      .select('*')
      .gte('posted_at', today + 'T00:00:00')
      .lte('posted_at', today + 'T23:59:59')
      .order('posted_at', { ascending: false })
      .limit(1)
    if (data2 && data2.length > 0) setWod(data2[0])
  }

  const fetchPbs = async (memberId) => {
    const { data } = await supabase
      .from('personal_bests')
      .select('*')
      .eq('member_id', memberId)
      .order('updated_at', { ascending: false })
    if (data) setPbs(data)
  }

  const fetchLeaderboard = async () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data } = await supabase
      .from('workout_logs')
      .select('member_id, member_name')
      .gte('logged_at', weekAgo)
    if (data) {
      const counts = {}
      data.forEach(row => {
        const id = row.member_id
        const name = row.member_name || 'Unknown'
        counts[id] = { name, count: (counts[id]?.count || 0) + 1 }
      })
      setLeaderboard(Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5))
    }
  }

  const checkTodayAttendance = async (memberId) => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('workout_logs')
      .select('id')
      .eq('member_id', memberId)
      .eq('logged_at', today)
      .limit(1)
    if (data && data.length > 0) setCheckedIn(true)
  }

  const handleCheckIn = async () => {
    if (checkedIn || !member) return
    setCheckingIn(true)
    const { error } = await supabase.from('workout_logs').insert([{
      member_id: member.id,
      member_name: member.full_name,
      wod_name: wod?.name || 'Check-in',
      workout_type: wod?.type || 'Check-in',
      logged_at: new Date().toISOString().split('T')[0]
    }])
    if (!error) {
      setCheckedIn(true)
      showToast('🔥 Checked in! Let\'s get it!', 'success')
      fetchLeaderboard()
    } else {
      showToast('Something went wrong. Try again.', 'error')
    }
    setCheckingIn(false)
  }

  const handleLogScore = async () => {
    if (!member || !wod) return
    setLoggingScore(true)
    const { error } = await supabase.from('workout_logs').insert([{
      member_id: member.id,
      member_name: member.full_name,
      wod_name: wod.name || wod.type,
      workout_type: wod.type,
      rounds: score.rounds ? parseInt(score.rounds) : null,
      reps: score.reps ? parseInt(score.reps) : null,
      time_seconds: score.time ? parseInt(score.time) * 60 : null,
      weight_kg: score.weight_kg ? parseFloat(score.weight_kg) : null,
      result: score.notes || null,
      logged_at: new Date().toISOString().split('T')[0]
    }])
    if (!error) {
      showToast('✅ Score logged!', 'success')
      setShowScoreForm(false)
      setScore({ rounds: '', reps: '', time: '', weight_kg: '', notes: '' })
    } else {
      showToast('Something went wrong.', 'error')
    }
    setLoggingScore(false)
  }

  const handleLogPb = async () => {
    if (!member || !pb.movement || !pb.value) { showToast('⚠ Fill in movement and value', 'error'); return }
    setLoggingPb(true)
    const { error } = await supabase.from('personal_bests').upsert([{
      member_id: member.id,
      member_name: member.full_name,
      movement: pb.movement,
      pb_type: pb.pb_type,
      value: pb.value,
      value_numeric: parseFloat(pb.value) || null,
      achieved_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    }], { onConflict: 'member_id,movement' })
    if (!error) {
      showToast('🏆 Personal Best saved!', 'success')
      setShowPbForm(false)
      setPb({ movement: '', pb_type: 'Weight', value: '', value_numeric: '' })
      fetchPbs(member.id)
    } else {
      showToast('Something went wrong.', 'error')
    }
    setLoggingPb(false)
  }

  const handleLogout = () => { sessionStorage.removeItem('baby_member'); navigate('/login') }
  const firstName = member?.full_name?.split(' ')[0] || 'Athlete'
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none',
    fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box'
  }

  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'wod', label: 'WOD', icon: '⚡' },
    { id: 'pbs', label: 'My PBs', icon: '🏆' },
    { id: 'board', label: 'Board', icon: '📊' },
  ]

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: "'DM Sans', sans-serif", paddingBottom: 80, maxWidth: 480, margin: '0 auto' }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{ padding: '48px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{today}</div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: 2, lineHeight: 1 }}>HEY {firstName.toUpperCase()} 👊</div>
        </div>
        <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}>Sign Out</button>
      </div>

      <div style={{ padding: '0 20px' }}>

        {/* HOME */}
        {tab === 'home' && (<>
          <div style={{ ...card, marginBottom: 14, background: checkedIn ? 'rgba(0,200,100,0.08)' : accentDim, border: `1px solid ${checkedIn ? 'rgba(0,200,100,0.25)' : 'rgba(255,100,0,0.3)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Today's Attendance</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{checkedIn ? '✅ You\'re checked in!' : 'Ready to train?'}</div>
                {!checkedIn && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Tap to mark your attendance</div>}
              </div>
              <button onClick={handleCheckIn} disabled={checkedIn || checkingIn} style={{ background: checkedIn ? 'rgba(0,200,100,0.2)' : accent, border: 'none', borderRadius: 12, padding: '12px 18px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: checkedIn ? 'default' : 'pointer' }}>
                {checkedIn ? '🔥 Done' : checkingIn ? '...' : 'Check In'}
              </button>
            </div>
          </div>

          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Today's WOD</div>
            {wod ? (<>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {wod.type && <span style={{ background: accentDim, color: accent, fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 600 }}>{wod.type}</span>}
                {wod.name && <span style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', fontSize: 11, padding: '3px 10px', borderRadius: 99 }}>{wod.name}</span>}
              </div>
              {wod.conditioning && <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>{wod.conditioning}</div>}
              {wod.strength && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>💪 {wod.strength}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button onClick={() => setTab('wod')} style={{ background: 'none', border: 'none', color: accent, fontSize: 13, cursor: 'pointer', padding: 0, fontWeight: 500 }}>See full WOD →</button>
                {checkedIn && <button onClick={() => { setTab('wod'); setShowScoreForm(true) }} style={{ background: accentDim, border: `1px solid rgba(255,100,0,0.3)`, color: accent, fontSize: 12, cursor: 'pointer', padding: '4px 12px', borderRadius: 8, fontWeight: 600 }}>📝 Log Score</button>}
              </div>
            </>) : <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No WOD posted yet. Check back soon! 💤</div>}
          </div>

          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>My Personal Bests</div>
              <button onClick={() => setTab('pbs')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>See all →</button>
            </div>
            {pbs.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {pbs.slice(0, 4).map((p, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{p.movement}</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{p.value}</div>
                  </div>
                ))}
              </div>
            ) : <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No PBs yet. <span style={{ color: accent, cursor: 'pointer' }} onClick={() => { setTab('pbs'); setShowPbForm(true) }}>Add your first! →</span></div>}
          </div>

          <div style={{ ...card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>This Week's Leaders</div>
              <button onClick={() => setTab('board')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>Full board →</button>
            </div>
            {leaderboard.length > 0 ? leaderboard.slice(0, 3).map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#000', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1, fontSize: 14 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: accent, fontWeight: 600 }}>{m.count} sessions</div>
              </div>
            )) : <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Check in to appear on the board! 🏅</div>}
          </div>
        </>)}

        {/* WOD TAB */}
        {tab === 'wod' && (<>
          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>Today's Full WOD</div>
            {wod ? (<>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {wod.type && <span style={{ background: accentDim, color: accent, fontSize: 12, padding: '4px 12px', borderRadius: 99, fontWeight: 600 }}>{wod.type}</span>}
                {wod.name && <span style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 12, padding: '4px 12px', borderRadius: 99 }}>{wod.name}</span>}
              </div>
              {[{ label: '🔥 Warmup', val: wod.warmup }, { label: '💪 Strength', val: wod.strength }, { label: '⚡ Conditioning', val: wod.conditioning }, { label: '🧊 Cooldown', val: wod.cooldown }, { label: '📐 Scaling', val: wod.scaling }].filter(s => s.val).map((s, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{s.val}</div>
                </div>
              ))}
              {checkedIn && !showScoreForm && (
                <button onClick={() => setShowScoreForm(true)} style={{ width: '100%', background: accent, border: 'none', borderRadius: 12, padding: '13px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8, fontFamily: "'DM Sans'" }}>📝 Log My Score</button>
              )}
            </>) : <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '40px 0' }}><div style={{ fontSize: 40, marginBottom: 10 }}>💤</div>No WOD posted yet today.</div>}
          </div>

          {showScoreForm && (
            <div style={{ ...card }}>
              <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>Log Your Score</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Rounds</div><input style={inputStyle} type="number" placeholder="e.g. 5" value={score.rounds} onChange={e => setScore(s => ({ ...s, rounds: e.target.value }))} /></div>
                  <div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>+ Reps</div><input style={inputStyle} type="number" placeholder="e.g. 12" value={score.reps} onChange={e => setScore(s => ({ ...s, reps: e.target.value }))} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Time (mins)</div><input style={inputStyle} type="number" placeholder="e.g. 14" value={score.time} onChange={e => setScore(s => ({ ...s, time: e.target.value }))} /></div>
                  <div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Weight (kg)</div><input style={inputStyle} type="number" placeholder="e.g. 42.5" value={score.weight_kg} onChange={e => setScore(s => ({ ...s, weight_kg: e.target.value }))} /></div>
                </div>
                <div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Notes</div><input style={inputStyle} placeholder="e.g. Rx, scaled, how it felt..." value={score.notes} onChange={e => setScore(s => ({ ...s, notes: e.target.value }))} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button onClick={() => setShowScoreForm(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10, padding: '12px', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans'" }}>Cancel</button>
                  <button onClick={handleLogScore} disabled={loggingScore} style={{ background: accent, border: 'none', borderRadius: 10, padding: '12px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'" }}>{loggingScore ? 'Saving...' : '✅ Save Score'}</button>
                </div>
              </div>
            </div>
          )}
        </>)}

        {/* PBs TAB */}
        {tab === 'pbs' && (<>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>My Personal Bests</div>
            <button onClick={() => setShowPbForm(!showPbForm)} style={{ background: accent, border: 'none', borderRadius: 8, padding: '6px 14px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'" }}>{showPbForm ? 'Cancel' : '+ Add PB'}</button>
          </div>

          {showPbForm && (
            <div style={{ ...card, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>Log Personal Best</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Movement</div>
                  <select style={{ ...inputStyle, colorScheme: 'dark' }} value={pb.movement} onChange={e => setPb(p => ({ ...p, movement: e.target.value }))}>
                    <option value="">Select movement...</option>
                    {MOVEMENTS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Type</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['Weight', 'Reps', 'Time'].map(t => (
                      <button key={t} onClick={() => setPb(p => ({ ...p, pb_type: t }))} style={{ flex: 1, background: pb.pb_type === t ? accentDim : 'rgba(255,255,255,0.05)', border: `1px solid ${pb.pb_type === t ? 'rgba(255,100,0,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, padding: '8px', color: pb.pb_type === t ? accent : 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans'" }}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Value {pb.pb_type === 'Weight' ? '(kg)' : pb.pb_type === 'Time' ? '(mins)' : '(reps)'}</div>
                  <input style={inputStyle} type="number" placeholder={pb.pb_type === 'Weight' ? 'e.g. 80' : 'e.g. 25'} value={pb.value} onChange={e => setPb(p => ({ ...p, value: e.target.value }))} />
                </div>
                <button onClick={handleLogPb} disabled={loggingPb} style={{ background: accent, border: 'none', borderRadius: 10, padding: '13px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'" }}>{loggingPb ? 'Saving...' : '🏆 Save Personal Best'}</button>
              </div>
            </div>
          )}

          {pbs.length > 0 ? pbs.map((p, i) => (
            <div key={i} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{p.movement}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{p.pb_type} • {new Date(p.achieved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: accent }}>{p.value}</div>
            </div>
          )) : !showPbForm && (
            <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🏋️</div>No personal bests yet.<br />Tap "+ Add PB" to log your first one!
            </div>
          )}
        </>)}

        {/* BOARD TAB */}
        {tab === 'board' && (<>
          <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>This Week's Leaderboard</div>
          {leaderboard.length > 0 ? leaderboard.map((m, i) => (
            <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: i < 3 ? '#000' : '#fff', flexShrink: 0 }}>
                {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{m.count} sessions this week</div>
              </div>
              <div style={{ background: accentDim, color: accent, fontSize: 13, fontWeight: 700, padding: '6px 12px', borderRadius: 10 }}>{m.count}x</div>
            </div>
          )) : <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}><div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>No sessions this week yet.</div>}
        </>)}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'rgba(10,10,10,0.95)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', backdropFilter: 'blur(20px)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: 'none', border: 'none', padding: '12px 0 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 10, color: tab === t.id ? accent : 'rgba(255,255,255,0.3)', fontWeight: tab === t.id ? 600 : 400, fontFamily: "'DM Sans'" }}>{t.label}</span>
          </button>
        ))}
      </div>

      {toast && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'success' ? 'rgba(0,200,100,0.9)' : toast.type === 'error' ? 'rgba(255,50,50,0.9)' : 'rgba(50,50,50,0.9)', color: '#fff', padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 500, zIndex: 999, whiteSpace: 'nowrap' }}>{toast.msg}</div>}
    </div>
  )
}