import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Login() {
  const navigate = useNavigate()
  const [mobile, setMobile] = useState('')
  const [dob, setDob] = useState({ day: '', month: '', year: '' })
  const [role, setRole] = useState('member')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 60 }, (_, i) => currentYear - 16 - i)
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))

  const handleLogin = async () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) { showToast('⚠ Enter a valid 10-digit mobile number', 'error'); return }
    if (!dob.day || !dob.month || !dob.year) { showToast('⚠ Please select your full date of birth', 'error'); return }

   const dobString = `${dob.year}-${String(dob.month).padStart(2,'0')}-${String(dob.day).padStart(2,'0')}`

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('mobile', mobile)
        .eq('dob', dobString)
        .eq('role', role)
        .single()

      if (error || !data) {
        showToast('✗ No account found. Check your number or date of birth.', 'error')
        setLoading(false)
        return
      }

      // Store member in sessionStorage
      sessionStorage.setItem('baby_member', JSON.stringify(data))
      showToast(`✅ Welcome back ${data.full_name.split(' ')[0]}!`, 'success')

      setTimeout(() => {
        navigate(role === 'coach' ? '/coach' : '/member')
      }, 1500)

    } catch {
      showToast('Something went wrong. Try again.', 'error')
    }
    setLoading(false)
  }

  const selectStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: '13px 8px',
    color: '#fff', fontSize: 14,
    outline: 'none', width: '100%',
    WebkitAppearance: 'none', textAlign: 'center',
    colorScheme: 'dark'
  }

  return (
    <div className="screen" style={{ padding: '40px 24px 32px' }}>
      <div className="grid-bg" />
      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* Header — B.A.B.Y brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {['B','A','B','Y'].map((letter, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: i % 2 === 0 ? 'linear-gradient(135deg, #ff6400, #ff2d00)' : 'rgba(255,100,0,0.12)',
                  border: i % 2 === 1 ? '1px solid rgba(255,100,0,0.4)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: '#fff' }}>{letter}</span>
                </div>
                {i < 3 && <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,100,0,0.5)', margin: '0 2px' }} />}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: '#fff', letterSpacing: 3, lineHeight: 1 }}>B.A.B.Y</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, textTransform: 'uppercase' }}>Build A Better You</div>
          </div>
        </div>

        <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42, color: '#fff', letterSpacing: 3, lineHeight: 1 }}>WELCOME BACK</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 6, marginBottom: 24 }}>Sign in with your mobile + date of birth</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Role */}
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 500, marginBottom: 8 }}>Signing in as</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {['member', 'coach'].map(r => (
                <div key={r} onClick={() => setRole(r)}
                  style={{
                    border: `1px solid ${role === r ? 'rgba(255,100,0,0.6)' : 'rgba(255,255,255,0.08)'}`,
                    background: role === r ? 'rgba(255,100,0,0.08)' : 'transparent',
                    borderRadius: 12, padding: '12px 8px', textAlign: 'center', cursor: 'pointer'
                  }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{r === 'member' ? '🏋️' : '📋'}</div>
                  <div style={{ fontSize: 12, color: role === r ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: 500, textTransform: 'capitalize' }}>{r}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile */}
          <div className="field">
            <label>Mobile Number</label>
            <input
              type="tel"
              placeholder="Your registered mobile"
              value={mobile}
              maxLength={10}
              onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
          </div>

          {/* DOB */}
          <div className="field">
            <label>Date of Birth</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <select style={selectStyle} value={dob.day} onChange={e => setDob(d => ({ ...d, day: e.target.value }))}>
                <option value="">DD</option>
                {days.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select style={selectStyle} value={dob.month} onChange={e => setDob(d => ({ ...d, month: e.target.value }))}>
                <option value="">MM</option>
                {months.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
              </select>
              <select style={selectStyle} value={dob.year} onChange={e => setDob(d => ({ ...d, year: e.target.value }))}>
                <option value="">YYYY</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <p style={{ textAlign: 'right', fontSize: 12, color: 'rgba(255,100,0,0.6)', cursor: 'pointer' }}
            onClick={() => showToast('📲 Message Coach Sam on WhatsApp to recover your account', 'info')}>
            Forgot details? Contact Coach Sam
          </p>

          <button className="btn-primary" onClick={handleLogin} disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In to BABY'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>new here?</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          </div>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            Don't have an account?{' '}
            <span style={{ color: '#ff6400', cursor: 'pointer', fontWeight: 500 }} onClick={() => navigate('/register')}>Join BABY ↗</span>
          </p>
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
