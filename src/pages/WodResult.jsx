import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const accent = '#ff6400'
const accentDim = 'rgba(255,100,0,0.12)'

export default function WodResult() {
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [todayWod, setTodayWod] = useState(null)
  const [existingResult, setExistingResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [toast, setToast] = useState(null)

  const [scoreType, setScoreType] = useState('time')
  const [rx, setRx] = useState(true)
  const [notes, setNotes] = useState('')
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')
  const [rounds, setRounds] = useState('')
  const [reps, setReps] = useState('')
  const [singleValue, setSingleValue] = useState('')

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const stored = sessionStorage.getItem('baby_member')
    if (!stored) { navigate('/login'); return }
    const m = JSON.parse(stored)
    if (m.role !== 'member') { navigate('/coach'); return }
    setMember(m)
    fetchTodayWod(m)
  }, [])

  const fetchTodayWod = async (m) => {
    const today = new Date().toISOString().split('T')[0]
    const { data: wod } = await supabase
      .from('wods').select('*').eq('scheduled_date', today)
      .order('posted_at', { ascending: false }).limit(1).single()

    if (wod) {
      setTodayWod(wod)
      if (wod.type === 'For Time' || wod.type === 'Hero WOD') setScoreType('time')
      else if (wod.type === 'AMRAP') setScoreType('rounds')
      else if (wod.type === 'Strength') setScoreType('weight')
      else if (wod.type === 'EMOM' || wod.type === 'Tabata') setScoreType('reps')

      const { data: existing } = await supabase
        .from('wod_results').select('*')
        .eq('wod_id', wod.id).eq('member_id', m.id).single()
      if (existing) { setExistingResult(existing); setSubmitted(true) }
    }
    setLoading(false)
  }

  const buildScoreValue = () => {
    if (scoreType === 'time') {
      const m = minutes || '0'
      const s = (seconds || '0').padStart(2, '0')
      return `${m}:${s}`
    }
    if (scoreType === 'rounds') return reps ? `${rounds || 0}+${reps}` : `${rounds || 0}`
    return singleValue
  }

  const handleSubmit = async () => {
    const scoreValue = buildScoreValue()
    if (!scoreValue || scoreValue === '0:00' || scoreValue === '0') {
      showToast('⚠ Enter your score first', 'error'); return
    }
    setSubmitting(true)
    const { error } = await supabase.from('wod_results').insert([{
      wod_id: todayWod.id, member_id: member.id, member_name: member.full_name,
      score_type: scoreType, score_value: scoreValue, rx, notes: notes || null,
      logged_at: new Date().toISOString()
    }])
    if (!error) {
      setSubmitted(true)
      showToast('🏆 Result logged!', 'success')
      setTimeout(() => navigate('/leaderboard'), 1200)
    } else {
      showToast('Something went wrong. Try again.', 'error')
    }
    setSubmitting(false)
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, padding: '14px 16px', color: '#fff', fontSize: 16,
    fontFamily: "'DM Sans', sans-serif", outline: 'none', width: '100%', boxSizing: 'border-box'
  }

  const scoreTypes = [
    { id: 'time', label: '⏱ Time', hint: 'For Time / Hero WOD' },
    { id: 'rounds', label: '🔄 Rounds + Reps', hint: 'AMRAP' },
    { id: 'weight', label: '🏋️ Weight (kg)', hint: 'Strength / Max' },
    { id: 'reps', label: '💪 Total Reps', hint: 'EMOM / Tabata' },
    { id: 'calories', label: '🔥 Calories', hint: 'Row / Bike / Ski' },
  ]

  if (loading) return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: "'DM Sans'" }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>Loading...</div>
    </div>
  )

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: "'DM Sans', sans-serif", paddingBottom: 40, maxWidth: 480, margin: '0 auto' }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{ padding: '52px 20px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/member')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px', color: 'rgba(255,255,255,0.6)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>←</button>
        <div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 2, lineHeight: 1 }}>LOG YOUR RESULT 🏆</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
        </div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {!todayWod && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No WOD today</div>
            <div style={{ fontSize: 13 }}>Check back after your coach posts the WOD</div>
          </div>
        )}

        {todayWod && submitted && existingResult && (
          <div>
            <div style={{ background: 'rgba(0,200,100,0.08)', border: '1px solid rgba(0,200,100,0.2)', borderRadius: 16, padding: '28px 20px', textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 44, marginBottom: 8 }}>✅</div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 2, color: 'rgba(0,220,100,0.9)', marginBottom: 6 }}>RESULT LOGGED</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{existingResult.score_value}</div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                <span style={{ background: accentDim, color: accent, fontSize: 11, padding: '3px 10px', borderRadius: 99 }}>{existingResult.score_type}</span>
                <span style={{ background: existingResult.rx ? 'rgba(0,200,100,0.15)' : 'rgba(255,200,0,0.1)', color: existingResult.rx ? 'rgba(0,220,100,0.9)' : 'rgba(255,200,0,0.8)', fontSize: 11, padding: '3px 10px', borderRadius: 99 }}>{existingResult.rx ? 'RX' : 'Scaled'}</span>
              </div>
            </div>
            <button onClick={() => navigate('/leaderboard')} style={{ width: '100%', background: accent, border: 'none', borderRadius: 14, padding: '16px', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
              🏅 See Today's Leaderboard
            </button>
          </div>
        )}

        {todayWod && !submitted && (
          <>
            <div style={{ background: 'rgba(255,100,0,0.06)', border: '1px solid rgba(255,100,0,0.15)', borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ background: accentDim, color: accent, fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 600 }}>{todayWod.type}</span>
                {todayWod.name && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{todayWod.name}</span>}
              </div>
              {todayWod.conditioning && (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                  {todayWod.conditioning.substring(0, 120)}{todayWod.conditioning.length > 120 ? '...' : ''}
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Score Type</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {scoreTypes.map(st => (
                  <button key={st.id} onClick={() => setScoreType(st.id)}
                    style={{ background: scoreType === st.id ? accentDim : 'rgba(255,255,255,0.03)', border: `1px solid ${scoreType === st.id ? 'rgba(255,100,0,0.35)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, padding: '12px 16px', color: scoreType === st.id ? accent : 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans'", textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: scoreType === st.id ? 600 : 400 }}>
                    <span>{st.label}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{st.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Your Score</div>

              {scoreType === 'time' && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>Minutes</div>
                    <input type="number" min="0" max="99" placeholder="0" value={minutes} onChange={e => setMinutes(e.target.value)}
                      style={{ ...inputStyle, textAlign: 'center', fontSize: 32, fontWeight: 700, fontFamily: "'Bebas Neue'", letterSpacing: 2, padding: '18px 12px' }} />
                  </div>
                  <div style={{ fontSize: 32, color: 'rgba(255,255,255,0.2)', fontFamily: "'Bebas Neue'", paddingBottom: 14 }}>:</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>Seconds</div>
                    <input type="number" min="0" max="59" placeholder="00" value={seconds} onChange={e => setSeconds(e.target.value)}
                      style={{ ...inputStyle, textAlign: 'center', fontSize: 32, fontWeight: 700, fontFamily: "'Bebas Neue'", letterSpacing: 2, padding: '18px 12px' }} />
                  </div>
                </div>
              )}

              {scoreType === 'rounds' && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>Rounds</div>
                    <input type="number" min="0" placeholder="0" value={rounds} onChange={e => setRounds(e.target.value)}
                      style={{ ...inputStyle, textAlign: 'center', fontSize: 32, fontWeight: 700, fontFamily: "'Bebas Neue'", letterSpacing: 2, padding: '18px 12px' }} />
                  </div>
                  <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.2)', fontFamily: "'Bebas Neue'", paddingBottom: 14 }}>+</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>Extra Reps</div>
                    <input type="number" min="0" placeholder="0" value={reps} onChange={e => setReps(e.target.value)}
                      style={{ ...inputStyle, textAlign: 'center', fontSize: 32, fontWeight: 700, fontFamily: "'Bebas Neue'", letterSpacing: 2, padding: '18px 12px' }} />
                  </div>
                </div>
              )}

              {(scoreType === 'weight' || scoreType === 'reps' || scoreType === 'calories') && (
                <div>
                  <input type="number" min="0"
                    placeholder={scoreType === 'weight' ? 'e.g. 80' : scoreType === 'calories' ? 'e.g. 120' : 'e.g. 150'}
                    value={singleValue} onChange={e => setSingleValue(e.target.value)}
                    style={{ ...inputStyle, textAlign: 'center', fontSize: 40, fontWeight: 700, fontFamily: "'Bebas Neue'", letterSpacing: 2, padding: '22px 12px' }} />
                  <div style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
                    {scoreType === 'weight' ? 'kilograms' : scoreType === 'calories' ? 'calories' : 'total reps'}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {[{ val: true, label: '💪 RX', sub: 'As prescribed' }, { val: false, label: '⚖️ Scaled', sub: 'Modified' }].map(opt => (
                <button key={String(opt.val)} onClick={() => setRx(opt.val)}
                  style={{ flex: 1, background: rx === opt.val ? (opt.val ? 'rgba(0,200,100,0.1)' : 'rgba(255,200,0,0.08)') : 'rgba(255,255,255,0.03)', border: `1px solid ${rx === opt.val ? (opt.val ? 'rgba(0,200,100,0.3)' : 'rgba(255,200,0,0.25)') : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, padding: '13px 10px', cursor: 'pointer', textAlign: 'center', fontFamily: "'DM Sans'" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: rx === opt.val ? (opt.val ? 'rgba(0,220,100,0.9)' : 'rgba(255,200,0,0.9)') : 'rgba(255,255,255,0.35)' }}>{opt.label}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 3 }}>{opt.sub}</div>
                </button>
              ))}
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Notes (optional)</div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder='e.g. "Felt strong today, grip gave out at round 6"'
                style={{ ...inputStyle, minHeight: 70, resize: 'vertical', fontSize: 14, lineHeight: 1.5 }} />
            </div>

            <button onClick={handleSubmit} disabled={submitting}
              style={{ background: accent, border: 'none', borderRadius: 14, padding: '17px', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans'", opacity: submitting ? 0.6 : 1, marginTop: 4 }}>
              {submitting ? 'Logging...' : '🚀 Submit Result'}
            </button>

            <button onClick={() => navigate('/leaderboard')}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px', color: 'rgba(255,255,255,0.4)', fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans'" }}>
              🏅 View Leaderboard Without Logging
            </button>
          </>
        )}
      </div>

      {toast && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'success' ? 'rgba(0,200,100,0.92)' : toast.type === 'error' ? 'rgba(255,50,50,0.92)' : 'rgba(30,30,30,0.95)', color: '#fff', padding: '12px 22px', borderRadius: 12, fontSize: 14, fontWeight: 500, zIndex: 999, whiteSpace: 'nowrap' }}>{toast.msg}</div>}
    </div>
  )
}
