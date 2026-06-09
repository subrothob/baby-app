import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const accent = '#ff6400'
const accentDim = 'rgba(255,100,0,0.12)'
const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '16px 18px' }

// ── 7-day attendance bar chart ────────────────────────────────────────────────
function AttendanceBarChart({ data7 }) {
  // data7: array of { date, label, count } for last 7 days
  const max = Math.max(...data7.map(d => d.count), 1)
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 70, padding: '0 4px' }}>
      {data7.map((d, i) => {
        const isToday = i === data7.length - 1
        const pct = (d.count / max) * 100
        return (
          <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: isToday ? accent : 'rgba(255,255,255,0.5)' }}>
              {d.count > 0 ? d.count : ''}
            </div>
            <div style={{ width: '100%', height: 44, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{
                width: '100%', height: `${Math.max(pct, d.count > 0 ? 8 : 3)}%`,
                minHeight: d.count > 0 ? 6 : 2,
                background: isToday ? accent : d.count > 0 ? 'rgba(255,100,0,0.5)' : 'rgba(255,255,255,0.08)',
                borderRadius: '4px 4px 2px 2px',
                transition: 'height 0.4s'
              }} />
            </div>
            <div style={{ fontSize: 9, color: isToday ? accent : 'rgba(255,255,255,0.3)', fontWeight: isToday ? 600 : 400 }}>{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function CoachDashboard() {
  const navigate = useNavigate()
  const [coach, setCoach] = useState(null)
  const [tab, setTab] = useState('post')
  const [members, setMembers] = useState([])
  const [checkins, setCheckins] = useState([])
  const [scheduledWods, setScheduledWods] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [attendanceTrend, setAttendanceTrend] = useState([])
  const [absenteesToday, setAbsenteesToday] = useState([])
  const [memberStreaks, setMemberStreaks] = useState({})

  // Class scheduling state
  const [classSlots, setClassSlots] = useState([])
  const [showAddClass, setShowAddClass] = useState(false)
  const [classForm, setClassForm] = useState({
    date: new Date().toISOString().split('T')[0],
    start_time: '06:00', duration_mins: 60,
    class_type: 'CrossFit', class_name: '', max_capacity: 15, location: 'Main Box', notes: ''
  })
  const [savingClass, setSavingClass] = useState(false)
  const [slotBookings, setSlotBookings] = useState({}) // { slot_id: [{member_name}] }
  const [expandedSlot, setExpandedSlot] = useState(null)

  // ── Notify state ──────────────────────────────────────────
  const [notifyModal, setNotifyModal] = useState(false)
  const [notifyTitle, setNotifyTitle] = useState('')
  const [notifyBody, setNotifyBody] = useState('')
  const [notifySending, setNotifySending] = useState(false)
  // ─────────────────────────────────────────────────────────

  const [wod, setWod] = useState({
    name: '', type: 'AMRAP', warmup: '', strength: '', conditioning: '', cooldown: '', scaling: '',
    scheduled_date: new Date().toISOString().split('T')[0]
  })

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const stored = sessionStorage.getItem('baby_member')
    if (!stored) { navigate('/login'); return }
    const m = JSON.parse(stored)
    if (m.role !== 'coach') { navigate('/member'); return }
    setCoach(m)
    fetchMembers()
    fetchTodayCheckins()
    fetchScheduledWods()
    fetchAttendanceTrend()
    fetchClassSlots()
  }, [])

  const fetchMembers = async () => {
    const { data } = await supabase.from('members').select('*').eq('role', 'member').order('full_name')
    if (data) setMembers(data)
  }

  const fetchTodayCheckins = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('workout_logs')
      .select('member_id, member_name, logged_at')
      .eq('logged_at', today)
      .order('logged_at', { ascending: false })
    if (data) setCheckins(data)
  }

  const fetchAttendanceTrend = async () => {
    const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data } = await supabase.from('workout_logs')
      .select('member_id, logged_at')
      .gte('logged_at', sevenDaysAgo)

    // Build 7-day array
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000)
      return {
        date: d.toISOString().split('T')[0],
        label: i === 6 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 2),
        count: 0
      }
    })

    if (data) {
      // Count unique members per day
      const dayMap = {}
      data.forEach(row => {
        if (!dayMap[row.logged_at]) dayMap[row.logged_at] = new Set()
        dayMap[row.logged_at].add(row.member_id)
      })
      days.forEach(d => { d.count = dayMap[d.date]?.size || 0 })

      // Member streaks (last 30 days)
      const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const { data: logs30 } = await supabase.from('workout_logs')
        .select('member_id, logged_at').gte('logged_at', thirtyAgo)

      if (logs30) {
        const memberDays = {}
        logs30.forEach(r => {
          if (!memberDays[r.member_id]) memberDays[r.member_id] = new Set()
          memberDays[r.member_id].add(r.logged_at)
        })
        const streaks = {}
        Object.entries(memberDays).forEach(([mid, dateSet]) => {
          const today = new Date().toISOString().split('T')[0]
          let s = 0
          const check = new Date()
          if (!dateSet.has(today)) check.setDate(check.getDate() - 1)
          while (true) {
            const d = check.toISOString().split('T')[0]
            if (!dateSet.has(d)) break
            s++; check.setDate(check.getDate() - 1)
            if (s > 30) break
          }
          streaks[mid] = s
        })
        setMemberStreaks(streaks)
      }
    }
    setAttendanceTrend(days)
  }

  const fetchScheduledWods = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('wods')
      .select('*')
      .gte('scheduled_date', today)
      .order('scheduled_date', { ascending: true })
      .limit(10)
    if (data) setScheduledWods(data)
  }

  const fetchClassSlots = async () => {
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: slots } = await supabase.from('class_slots')
      .select('*').gte('date', today).lte('date', nextWeek)
      .order('date').order('start_time')
    if (!slots) return
    const slotIds = slots.map(s => s.id)
    const { data: bookings } = await supabase.from('class_bookings')
      .select('slot_id, member_name, member_id, status')
      .in('slot_id', slotIds).eq('status', 'confirmed')
    const countMap = {}, nameMap = {}
    bookings?.forEach(b => {
      countMap[b.slot_id] = (countMap[b.slot_id] || 0) + 1
      if (!nameMap[b.slot_id]) nameMap[b.slot_id] = []
      nameMap[b.slot_id].push(b.member_name)
    })
    setClassSlots(slots.map(s => ({ ...s, bookedCount: countMap[s.id] || 0 })))
    setSlotBookings(nameMap)
  }

  const handleAddClass = async () => {
    if (!classForm.date || !classForm.start_time || !classForm.class_type) {
      showToast('⚠ Fill in date, time and class type', 'error'); return
    }
    setSavingClass(true)
    const { error } = await supabase.from('class_slots').insert([{
      ...classForm,
      coach_id: coach?.id, coach_name: coach?.full_name,
      duration_mins: parseInt(classForm.duration_mins),
      max_capacity: parseInt(classForm.max_capacity)
    }])
    if (!error) {
      showToast('✅ Class added!', 'success')
      setShowAddClass(false)
      setClassForm({ date: new Date().toISOString().split('T')[0], start_time: '06:00', duration_mins: 60, class_type: 'CrossFit', class_name: '', max_capacity: 15, location: 'Main Box', notes: '' })
      fetchClassSlots()
    } else { showToast('Could not save class', 'error') }
    setSavingClass(false)
  }

  const handleDeleteClass = async (slotId) => {
    await supabase.from('class_slots').delete().eq('id', slotId)
    setClassSlots(prev => prev.filter(s => s.id !== slotId))
    showToast('Class deleted', 'info')
  }

  const postWod = async () => {
    if (!wod.conditioning && !wod.strength) {
      showToast('⚠ Add at least strength or conditioning', 'error')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('wods').insert([{
      name: wod.name || null,
      type: wod.type,
      warmup: wod.warmup || null,
      strength: wod.strength || null,
      conditioning: wod.conditioning || null,
      cooldown: wod.cooldown || null,
      scaling: wod.scaling || null,
      scheduled_date: wod.scheduled_date,
      posted_at: new Date().toISOString()
    }])
    if (!error) {
      // Auto-notify all subscribed members
      const isToday = wod.scheduled_date === new Date().toISOString().split('T')[0]
      const dateLabel = isToday ? "Today's" : `${new Date(wod.scheduled_date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long' })}'s`
      const notifyTitle = `${dateLabel} WOD is live! 🔥`
      const notifyBody = wod.conditioning
        ? wod.conditioning.substring(0, 100)
        : wod.strength
          ? wod.strength.substring(0, 100)
          : 'Check the app for today\'s workout.'

      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: notifyTitle, body: notifyBody })
        })
        showToast('✅ WOD scheduled & members notified!', 'success')
      } catch {
        // WOD saved fine, notify just failed silently
        showToast('✅ WOD scheduled! (Notification failed)', 'success')
      }

      setWod({ name: '', type: 'AMRAP', warmup: '', strength: '', conditioning: '', cooldown: '', scaling: '', scheduled_date: new Date().toISOString().split('T')[0] })
      fetchScheduledWods()
    } else {
      showToast('Something went wrong. Try again.', 'error')
    }
    setLoading(false)
  }

  const deleteWod = async (id) => {
    const { error } = await supabase.from('wods').delete().eq('id', id)
    if (!error) { showToast('WOD deleted', 'info'); fetchScheduledWods() }
  }

  // ── Send push notification to all subscribed members ─────
  const sendNotification = async () => {
    if (!notifyTitle.trim()) {
      showToast('⚠ Add a notification title', 'error')
      return
    }
    setNotifySending(true)
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: notifyTitle.trim(), body: notifyBody.trim() })
      })
      const data = await res.json()
      if (res.ok) {
        showToast(`✅ Sent to ${data.sent ?? 'all'} members!`, 'success')
        setNotifyModal(false)
        setNotifyTitle('')
        setNotifyBody('')
      } else {
        showToast(data.error || 'Send failed. Try again.', 'error')
      }
    } catch {
      showToast('Network error. Check your connection.', 'error')
    }
    setNotifySending(false)
  }

  // Quick-fill helpers for common notifications
  const quickFills = [
    { label: "Today's WOD is live 🔥", body: "Check the app for today's workout. See you at the box!" },
    { label: 'Class reminder ⏰', body: "Don't forget — class starts in 30 mins. Get ready!" },
    { label: 'Box closed 🚪', body: "The box is closed today. Rest up and we'll see you tomorrow!" },
  ]
  // ─────────────────────────────────────────────────────────

  const handleLogout = () => { sessionStorage.removeItem('baby_member'); navigate('/login') }

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none',
    fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', resize: 'vertical'
  }

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
  const wodTypes = ['AMRAP', 'For Time', 'EMOM', 'Tabata', 'Strength', 'Partner WOD', 'Hero WOD']

  const tabs = [
    { id: 'post', label: 'Post WOD', icon: '⚡' },
    { id: 'schedule', label: 'Schedule', icon: '📅' },
    { id: 'checkins', label: 'Check-ins', icon: '✅' },
    { id: 'members', label: 'Members', icon: '👥' },
  ]

  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return {
      date: d.toISOString().split('T')[0],
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    }
  })

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: "'DM Sans', sans-serif", paddingBottom: 80, maxWidth: 480, margin: '0 auto' }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{ padding: '48px 20px 12px' }}>
        {/* Brand bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>{today}</div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 30, letterSpacing: 2, lineHeight: 1 }}>COACH DASHBOARD 📋</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* ── Notify Members button ── */}
          <button
            onClick={() => setNotifyModal(true)}
            style={{ background: accentDim, border: `1px solid rgba(255,100,0,0.3)`, borderRadius: 10, padding: '8px 14px', color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'", display: 'flex', alignItems: 'center', gap: 5 }}
          >
            🔔 Notify
          </button>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}>Sign Out</button>
        </div>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          {[
            { label: 'Members', val: members.length, icon: '👥' },
            { label: "Today's Check-ins", val: checkins.length, icon: '✅' },
            { label: 'WODs Scheduled', val: scheduledWods.length, icon: '📅' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: accent }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 7-day attendance chart */}
        {attendanceTrend.length > 0 && (
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>Attendance This Week</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                Avg {Math.round(attendanceTrend.reduce((s, d) => s + d.count, 0) / 7)}/day
              </div>
            </div>
            <AttendanceBarChart data7={attendanceTrend} />
          </div>
        )}

        {/* Absentees alert */}
        {(() => {
          const checkedInIds = new Set(checkins.map(c => c.member_id))
          const absentees = members.filter(m => !checkedInIds.has(m.id))
          if (absentees.length === 0 || checkins.length === 0) return null
          return (
            <div style={{ ...card, marginBottom: 16, background: 'rgba(255,150,0,0.06)', border: '1px solid rgba(255,150,0,0.2)' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,180,0,0.8)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                Not In Yet Today ({absentees.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {absentees.slice(0, 8).map((m, i) => (
                  <span key={i} style={{ background: 'rgba(255,150,0,0.1)', border: '1px solid rgba(255,150,0,0.2)', borderRadius: 99, padding: '3px 10px', fontSize: 11, color: 'rgba(255,180,0,0.8)' }}>
                    {m.full_name.split(' ')[0]}
                  </span>
                ))}
              </div>
            </div>
          )
        })()}


        {/* POST WOD TAB */}
        {tab === 'post' && (
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>Post / Schedule WOD</div>

            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>📅 Schedule For</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {next7Days.map(d => (
                  <button key={d.date} onClick={() => setWod(w => ({ ...w, scheduled_date: d.date }))}
                    style={{ background: wod.scheduled_date === d.date ? accentDim : 'rgba(255,255,255,0.05)', border: `1px solid ${wod.scheduled_date === d.date ? 'rgba(255,100,0,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, padding: '6px 12px', color: wod.scheduled_date === d.date ? accent : 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                    {d.label}
                  </button>
                ))}
              </div>
              <input type="date" style={{ ...inputStyle, colorScheme: 'dark', resize: 'none' }} value={wod.scheduled_date} onChange={e => setWod(w => ({ ...w, scheduled_date: e.target.value }))} />
            </div>

            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>WOD Type</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {wodTypes.map(t => (
                  <button key={t} onClick={() => setWod(w => ({ ...w, type: t }))}
                    style={{ background: wod.type === t ? accentDim : 'rgba(255,255,255,0.05)', border: `1px solid ${wod.type === t ? 'rgba(255,100,0,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, padding: '6px 12px', color: wod.type === t ? accent : 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>WOD Name (optional)</div>
              <input style={{ ...inputStyle, resize: 'none' }} placeholder='e.g. "Monday Mayhem"' value={wod.name} onChange={e => setWod(w => ({ ...w, name: e.target.value }))} />
            </div>

            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>🔥 Warmup</div>
              <textarea style={{ ...inputStyle, minHeight: 60 }} placeholder='e.g. 400m jog, 10 inchworms...' value={wod.warmup} onChange={e => setWod(w => ({ ...w, warmup: e.target.value }))} />
            </div>

            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>💪 Strength</div>
              <textarea style={{ ...inputStyle, minHeight: 60 }} placeholder='e.g. Back Squat 5x5 @ 80%' value={wod.strength} onChange={e => setWod(w => ({ ...w, strength: e.target.value }))} />
            </div>

            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>⚡ Conditioning *</div>
              <textarea style={{ ...inputStyle, minHeight: 80 }} placeholder='e.g. 20 Min AMRAP: 10 Pull-ups, 20 Push-ups, 30 Air Squats' value={wod.conditioning} onChange={e => setWod(w => ({ ...w, conditioning: e.target.value }))} />
            </div>

            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>🧊 Cooldown</div>
              <textarea style={{ ...inputStyle, minHeight: 60 }} placeholder='e.g. 5 min stretching...' value={wod.cooldown} onChange={e => setWod(w => ({ ...w, cooldown: e.target.value }))} />
            </div>

            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>📐 Scaling Options</div>
              <textarea style={{ ...inputStyle, minHeight: 60 }} placeholder='e.g. Pull-ups → Ring rows' value={wod.scaling} onChange={e => setWod(w => ({ ...w, scaling: e.target.value }))} />
            </div>

            <button onClick={postWod} disabled={loading} style={{ background: accent, border: 'none', borderRadius: 12, padding: '14px', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'", opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Scheduling...' : `🚀 Schedule WOD for ${wod.scheduled_date === new Date().toISOString().split('T')[0] ? 'Today' : wod.scheduled_date}`}
            </button>

            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>🔔 Members are notified automatically when you schedule a WOD</div>
          </div>
        )}

        {/* SCHEDULE TAB */}
        {tab === 'schedule' && (() => {
          const CLASS_COLORS = {
            'CrossFit':   { bg: 'rgba(255,100,0,0.12)',  border: 'rgba(255,100,0,0.35)',  text: '#ff6400' },
            'Gymnastics': { bg: 'rgba(255,50,150,0.1)',  border: 'rgba(255,50,150,0.3)',  text: '#ff3296' },
            'Strength':   { bg: 'rgba(255,200,0,0.1)',   border: 'rgba(255,200,0,0.3)',   text: '#ffc800' },
            'Olympic':    { bg: 'rgba(0,160,255,0.1)',   border: 'rgba(0,160,255,0.3)',   text: '#00a0ff' },
            'Running':    { bg: 'rgba(0,200,120,0.1)',   border: 'rgba(0,200,120,0.3)',   text: '#00c878' },
            'Hyrox':      { bg: 'rgba(140,0,255,0.1)',   border: 'rgba(140,0,255,0.3)',   text: '#8c00ff' },
            'Open Gym':   { bg: 'rgba(0,180,255,0.1)',   border: 'rgba(0,180,255,0.3)',   text: '#00b4ff' },
            'Community':  { bg: 'rgba(0,220,180,0.1)',   border: 'rgba(0,220,180,0.3)',   text: '#00dcb4' },
          }
          const CLASS_TYPES = ['CrossFit', 'Gymnastics', 'Strength', 'Olympic', 'Running', 'Hyrox', 'Community', 'Open Gym']
          const CLASS_ICONS = {
            CrossFit: '🏋️', Gymnastics: '🤸', Strength: '💪', Olympic: '🥇',
            Running: '🏃', Hyrox: '⚡', 'Open Gym': '🏟️', Community: '🎉'
          }
          const fmtTime = (t) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}` }
          const todayStr = new Date().toISOString().split('T')[0]
          const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]
          const dayLabel = (d) => {
            if (d === todayStr) return 'TODAY'
            if (d === tomorrowStr) return 'TOMORROW'
            return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()
          }
          // Group by date
          const grouped = {}
          classSlots.forEach(s => { if (!grouped[s.date]) grouped[s.date] = []; grouped[s.date].push(s) })

          const inField = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 12px', color: '#fff', fontSize: 13, fontFamily: "'DM Sans'", width: '100%', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }

          return (
            <div>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>Class Schedule</div>
                <button onClick={() => setShowAddClass(v => !v)}
                  style={{ background: showAddClass ? 'rgba(255,255,255,0.06)' : accent, border: 'none', borderRadius: 10, padding: '8px 16px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                  {showAddClass ? 'Cancel' : '+ Add Class'}
                </button>
              </div>

              {/* Add class form */}
              {showAddClass && (
                <div style={{ ...card, marginBottom: 16, border: '1px solid rgba(255,100,0,0.3)' }}>
                  <div style={{ fontSize: 12, color: accent, fontWeight: 600, marginBottom: 12, letterSpacing: 1 }}>NEW CLASS SLOT</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Date</div>
                      <input type="date" value={classForm.date} onChange={e => setClassForm(f => ({ ...f, date: e.target.value }))} style={inField} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Start Time</div>
                      <input type="time" value={classForm.start_time} onChange={e => setClassForm(f => ({ ...f, start_time: e.target.value }))} style={inField} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Class Type</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {CLASS_TYPES.map(t => {
                        const col = CLASS_COLORS[t]
                        const sel = classForm.class_type === t
                        return (
                          <button key={t} onClick={() => setClassForm(f => ({ ...f, class_type: t }))}
                            style={{ background: sel ? col.bg : 'transparent', border: `1px solid ${sel ? col.border : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, padding: '6px 12px', color: sel ? col.text : 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                            {CLASS_ICONS[t]} {t}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Class Name (optional)</div>
                      <input placeholder="e.g. Barbell Club" value={classForm.class_name} onChange={e => setClassForm(f => ({ ...f, class_name: e.target.value }))} style={inField} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Max Capacity</div>
                      <input type="number" min={1} max={50} value={classForm.max_capacity} onChange={e => setClassForm(f => ({ ...f, max_capacity: e.target.value }))} style={inField} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Duration (mins)</div>
                      <input type="number" value={classForm.duration_mins} onChange={e => setClassForm(f => ({ ...f, duration_mins: e.target.value }))} style={inField} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Location</div>
                      <input placeholder="Main Box" value={classForm.location} onChange={e => setClassForm(f => ({ ...f, location: e.target.value }))} style={inField} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Notes (optional)</div>
                    <input placeholder="e.g. Strength focus, bring your best effort!" value={classForm.notes} onChange={e => setClassForm(f => ({ ...f, notes: e.target.value }))} style={inField} />
                  </div>
                  <button onClick={handleAddClass} disabled={savingClass}
                    style={{ width: '100%', background: accent, border: 'none', borderRadius: 10, padding: '13px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                    {savingClass ? 'Saving...' : '✅ Add Class Slot'}
                  </button>
                </div>
              )}

              {/* Class slots grouped by day */}
              {Object.keys(grouped).length === 0 && !showAddClass && (
                <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📅</div>
                  No classes scheduled yet.<br />Tap "+ Add Class" to post your first slot!
                </div>
              )}

              {Object.entries(grouped).map(([date, slots]) => (
                <div key={date} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: date === todayStr ? accent : 'rgba(255,255,255,0.5)', background: date === todayStr ? accentDim : 'transparent', padding: date === todayStr ? '3px 10px' : '3px 0', borderRadius: 99 }}>{dayLabel(date)}</div>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{slots.length} class{slots.length !== 1 ? 'es' : ''}</span>
                  </div>

                  {slots.map(slot => {
                    const col = CLASS_COLORS[slot.class_type] || CLASS_COLORS['CrossFit']
                    const spotsLeft = slot.max_capacity - slot.bookedCount
                    const bookedNames = slotBookings[slot.id] || []
                    const isExpanded = expandedSlot === slot.id

                    return (
                      <div key={slot.id} style={{ ...card, marginBottom: 10, border: `1px solid ${col.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: col.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                              {CLASS_ICONS[slot.class_type] || '🏋️'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 1 }}>{slot.class_name || slot.class_type} <span style={{ fontSize: 10, color: col.text }}>({slot.class_type})</span></div>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{fmtTime(slot.start_time)} · {slot.duration_mins}min</div>
                            </div>
                          </div>

                          {/* Booking count badge + actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <button onClick={() => setExpandedSlot(isExpanded ? null : slot.id)}
                              style={{ background: slot.bookedCount > 0 ? col.bg : 'rgba(255,255,255,0.05)', border: `1px solid ${slot.bookedCount > 0 ? col.border : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, padding: '5px 10px', color: slot.bookedCount > 0 ? col.text : 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                              {slot.bookedCount}/{slot.max_capacity} {isExpanded ? '▲' : '▼'}
                            </button>
                            <button onClick={() => handleDeleteClass(slot.id)}
                              style={{ background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', borderRadius: 8, padding: '5px 10px', color: 'rgba(255,80,80,0.7)', fontSize: 11, cursor: 'pointer' }}>✕</button>
                          </div>
                        </div>

                        {/* Capacity bar */}
                        <div style={{ marginTop: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
                            <span>{slot.bookedCount} booked</span>
                            <span style={{ color: spotsLeft === 0 ? '#ff5050' : 'rgba(255,255,255,0.3)' }}>{spotsLeft === 0 ? 'FULL' : `${spotsLeft} spots left`}</span>
                          </div>
                          <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, (slot.bookedCount / slot.max_capacity) * 100)}%`, height: '100%', background: slot.bookedCount >= slot.max_capacity ? '#ff3a00' : slot.bookedCount / slot.max_capacity > 0.7 ? '#ffb800' : '#00c878', borderRadius: 99 }} />
                          </div>
                        </div>

                        {/* Expanded: list of booked members */}
                        {isExpanded && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            {bookedNames.length === 0
                              ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>No bookings yet</div>
                              : bookedNames.map((name, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < bookedNames.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                  <div style={{ width: 26, height: 26, borderRadius: 8, background: col.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: col.text }}>{name?.[0]?.toUpperCase()}</div>
                                  <span style={{ fontSize: 13 }}>{name}</span>
                                  <span style={{ fontSize: 10, color: '#00c878', marginLeft: 'auto' }}>✓ Booked</span>
                                </div>
                              ))
                            }
                          </div>
                        )}
                        {slot.notes && <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>📝 {slot.notes}</div>}
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* WODs section */}
              <div style={{ marginTop: 24, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>Upcoming WODs ({scheduledWods.length})</div>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>
                <button onClick={() => navigate('/leaderboard')}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '13px', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans'", marginBottom: 12 }}>
                  🏅 View Today's Leaderboard
                </button>
                {scheduledWods.length > 0 ? scheduledWods.map((w, i) => (
                  <div key={i} style={{ ...card, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: accent, fontWeight: 600, marginBottom: 4 }}>
                          {w.scheduled_date === new Date().toISOString().split('T')[0] ? '📅 TODAY' : new Date(w.scheduled_date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                          {w.type && <span style={{ background: accentDim, color: accent, fontSize: 11, padding: '2px 8px', borderRadius: 99 }}>{w.type}</span>}
                          {w.name && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{w.name}</span>}
                        </div>
                        {w.conditioning && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{w.conditioning.substring(0, 80)}{w.conditioning.length > 80 ? '...' : ''}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginLeft: 10, flexShrink: 0 }}>
                        <button onClick={() => { const dateLabel = w.scheduled_date === new Date().toISOString().split('T')[0] ? "today's" : `${new Date(w.scheduled_date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long' })}'s`; setNotifyTitle(`${dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} WOD is up! 🔥`); setNotifyBody(w.conditioning ? w.conditioning.substring(0, 100) : ''); setNotifyModal(true) }}
                          style={{ background: accentDim, border: '1px solid rgba(255,100,0,0.2)', borderRadius: 8, padding: '4px 10px', color: accent, fontSize: 11, cursor: 'pointer' }}>🔔</button>
                        <button onClick={() => deleteWod(w.id)} style={{ background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.2)', borderRadius: 8, padding: '4px 10px', color: 'rgba(255,80,80,0.8)', fontSize: 11, cursor: 'pointer' }}>Delete</button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div style={{ ...card, textAlign: 'center', padding: '32px 20px', color: 'rgba(255,255,255,0.3)' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
                    No WODs scheduled. Go to "Post WOD" to add one!
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* CHECK-INS TAB */}
        {tab === 'checkins' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>Today's Check-ins ({checkins.length})</div>
              {/* ── Notify from check-ins tab ── */}
              <button
                onClick={() => {
                  setNotifyTitle('Class reminder ⏰')
                  setNotifyBody("Don't forget — class starts in 30 mins. Get ready!")
                  setNotifyModal(true)
                }}
                style={{ background: accentDim, border: `1px solid rgba(255,100,0,0.2)`, borderRadius: 8, padding: '5px 12px', color: accent, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'" }}
              >🔔 Notify</button>
            </div>
            {checkins.length > 0 ? checkins.map((c, i) => (
              <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>💪</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{c.member_name || 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{c.logged_at}</div>
                </div>
                <div style={{ background: 'rgba(0,200,100,0.15)', color: 'rgba(0,220,100,0.9)', fontSize: 11, padding: '4px 10px', borderRadius: 99, fontWeight: 600 }}>✓ In</div>
              </div>
            )) : (
              <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>⏳</div>No check-ins yet today.
              </div>
            )}
          </div>
        )}

        {/* MEMBERS TAB */}
        {tab === 'members' && (
          <div>
            <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>All Members ({members.length})</div>
            {members.map((m, i) => {
              const checkedInToday = checkins.some(c => c.member_id === m.id)
              const streak = memberStreaks[m.id] || 0
              const inactive = streak === 0
              return (
                <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, border: inactive ? '1px solid rgba(255,150,0,0.15)' : '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: checkedInToday ? 'rgba(0,200,100,0.15)' : inactive ? 'rgba(255,150,0,0.08)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: checkedInToday ? 'rgba(0,220,100,0.9)' : 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                    {m.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{m.full_name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{m.mobile}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    {checkedInToday && <div style={{ background: 'rgba(0,200,100,0.15)', color: 'rgba(0,220,100,0.9)', fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>Today ✓</div>}
                    {streak > 0 ? (
                      <div style={{ fontSize: 10, color: streak >= 7 ? accent : 'rgba(255,255,255,0.4)', fontWeight: 500 }}>🔥 {streak}d streak</div>
                    ) : (
                      <div style={{ fontSize: 10, color: 'rgba(255,150,0,0.6)', fontWeight: 500 }}>⚠ Inactive</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
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

      {/* ── Notify Members Modal ─────────────────────────────── */}
      {notifyModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setNotifyModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}
        >
          <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px 20px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: 480 }}>
            {/* Handle */}
            <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, margin: '0 auto 20px' }} />

            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 2, marginBottom: 4 }}>🔔 NOTIFY MEMBERS</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 18 }}>Push notification to all subscribed members</div>

            {/* Quick-fill chips */}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>Quick fill →</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {quickFills.map((q, i) => (
                <button key={i} onClick={() => { setNotifyTitle(q.label); setNotifyBody(q.body) }}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 10px', color: 'rgba(255,255,255,0.55)', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                  {q.label}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Title *</div>
              <input
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none', fontFamily: "'DM Sans'", boxSizing: 'border-box' }}
                placeholder="e.g. Today's WOD is live 🔥"
                value={notifyTitle}
                onChange={e => setNotifyTitle(e.target.value)}
                maxLength={65}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Message (optional)</div>
              <textarea
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none', fontFamily: "'DM Sans'", boxSizing: 'border-box', resize: 'vertical', minHeight: 70 }}
                placeholder="See you at the box!"
                value={notifyBody}
                onChange={e => setNotifyBody(e.target.value)}
                maxLength={120}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setNotifyModal(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '13px', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
                Cancel
              </button>
              <button onClick={sendNotification} disabled={notifySending || !notifyTitle.trim()} style={{ flex: 2, background: accent, border: 'none', borderRadius: 12, padding: '13px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'", opacity: (notifySending || !notifyTitle.trim()) ? 0.55 : 1 }}>
                {notifySending ? 'Sending...' : `🚀 Send to All Members`}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ───────────────────────────────────────────────────── */}

      {toast && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'success' ? 'rgba(0,200,100,0.9)' : toast.type === 'error' ? 'rgba(255,50,50,0.9)' : 'rgba(50,50,50,0.9)', color: '#fff', padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 500, zIndex: 999, whiteSpace: 'nowrap' }}>{toast.msg}</div>}
    </div>
  )
}