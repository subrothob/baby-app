import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const accent = '#ff6400'
const accentDim = 'rgba(255,100,0,0.12)'
const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '16px 18px' }

export default function CoachDashboard() {
  const navigate = useNavigate()
  const [coach, setCoach] = useState(null)
  const [tab, setTab] = useState('post')
  const [members, setMembers] = useState([])
  const [checkins, setCheckins] = useState([])
  const [scheduledWods, setScheduledWods] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

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
      showToast('✅ WOD scheduled! Members will see it on the day.', 'success')
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

  // Next 7 days for quick date selection
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

      <div style={{ padding: '48px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{today}</div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 30, letterSpacing: 2, lineHeight: 1 }}>COACH DASHBOARD 📋</div>
        </div>
        <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}>Sign Out</button>
      </div>

      <div style={{ padding: '0 20px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Members', val: members.length, icon: '👥' },
            { label: 'Today\'s Check-ins', val: checkins.length, icon: '✅' },
            { label: 'WODs Scheduled', val: scheduledWods.length, icon: '📅' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: accent }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* POST WOD TAB */}
        {tab === 'post' && (
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>Post / Schedule WOD</div>

            {/* Schedule Date */}
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

            {/* WOD Type */}
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
          </div>
        )}

        {/* SCHEDULE TAB */}
        {tab === 'schedule' && (
          <div>
            <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>Upcoming WODs ({scheduledWods.length})</div>
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
                  <button onClick={() => deleteWod(w.id)} style={{ background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.2)', borderRadius: 8, padding: '4px 10px', color: 'rgba(255,80,80,0.8)', fontSize: 11, cursor: 'pointer', marginLeft: 10, flexShrink: 0 }}>Delete</button>
                </div>
              </div>
            )) : (
              <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📅</div>
                No WODs scheduled yet.<br />Go to Post WOD to schedule ahead!
              </div>
            )}
          </div>
        )}

        {/* CHECK-INS TAB */}
        {tab === 'checkins' && (
          <div>
            <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>Today's Check-ins ({checkins.length})</div>
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
              return (
                <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: checkedInToday ? 'rgba(0,200,100,0.15)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: checkedInToday ? 'rgba(0,220,100,0.9)' : 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                    {m.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{m.full_name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{m.mobile}</div>
                  </div>
                  {checkedInToday && <div style={{ background: 'rgba(0,200,100,0.15)', color: 'rgba(0,220,100,0.9)', fontSize: 11, padding: '3px 8px', borderRadius: 99, fontWeight: 600 }}>Today ✓</div>}
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

      {toast && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'success' ? 'rgba(0,200,100,0.9)' : toast.type === 'error' ? 'rgba(255,50,50,0.9)' : 'rgba(50,50,50,0.9)', color: '#fff', padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 500, zIndex: 999, whiteSpace: 'nowrap' }}>{toast.msg}</div>}
    </div>
  )
}