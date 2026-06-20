import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Login() {
  const navigate = useNavigate()
  const [step, setStep] = useState('mobile')   // 'mobile' | 'pin'
  const [mobile, setMobile] = useState('')
  const [role, setRole] = useState('member')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleNext = () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      showToast('⚠ Enter a valid 10-digit mobile number', 'error')
      return
    }
    setStep('pin')
  }

  const handlePinDigit = async (digit) => {
    if (loading) return
    const next = (pin + digit).slice(0, 4)
    setPin(next)
    if (next.length === 4) {
      await verifyLogin(next)
    }
  }

  const handleBackspace = () => {
    setPin(p => p.slice(0, -1))
  }

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const verifyLogin = async (enteredPin) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('mobile', mobile)
        .eq('role', role)
        .single()

      if (error || !data) {
        showToast('✗ Mobile number not found', 'error')
        triggerShake()
        setPin('')
        setLoading(false)
        return
      }

      const correctPin = data.pin || data.dob?.replace(/-/g, '').slice(4, 8) || '1234'

      if (enteredPin !== correctPin) {
        showToast('✗ Wrong PIN. Try again.', 'error')
        triggerShake()
        setPin('')
        setLoading(false)
        return
      }

      sessionStorage.setItem('baby_member', JSON.stringify(data))
      showToast(`✅ Welcome back ${data.full_name.split(' ')[0]}!`, 'success')
      setTimeout(() => navigate(role === 'coach' ? '/coach' : '/member'), 1200)
    } catch {
      showToast('Something went wrong. Try again.', 'error')
      setPin('')
    }
    setLoading(false)
  }

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  const Brand = () => (
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
  )

  return (
    <div className="screen" style={{ padding: '40px 24px 32px' }}>
      <div className="grid-bg" />
      <div style={{ position: 'relative', zIndex: 2 }}>

        <Brand />

        {step === 'mobile' && (
          <>
            <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42, color: '#fff', letterSpacing: 3, lineHeight: 1 }}>WELCOME BACK</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 6, marginBottom: 28 }}>Enter your mobile to continue</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Role */}
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 500, marginBottom: 8 }}>Signing in as</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {['member', 'coach'].map(r => (
                    <div key={r} onClick={() => setRole(r)} style={{
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

              <div className="field">
                <label>Mobile Number</label>
                <input
                  type="tel"
                  placeholder="Your registered mobile"
                  value={mobile}
                  maxLength={10}
                  autoFocus
                  onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={e => e.key === 'Enter' && handleNext()}
                />
              </div>

              <button className="btn-primary" onClick={handleNext}>
                Continue →
              </button>

              <p style={{ textAlign: 'right', fontSize: 12, color: 'rgba(255,100,0,0.6)', cursor: 'pointer' }}
                onClick={() => showToast('📲 Message your coach on WhatsApp to recover your account', 'info')}>
                Forgot PIN? Contact your coach
              </p>

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
          </>
        )}

        {step === 'pin' && (
          <>
            <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 38, color: '#fff', letterSpacing: 3, lineHeight: 1 }}>ENTER PIN</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 6, marginBottom: 32 }}>
              {mobile.slice(0, 5)}•••••
              <span style={{ color: 'rgba(255,100,0,0.6)', marginLeft: 12, cursor: 'pointer', fontSize: 12 }} onClick={() => { setStep('mobile'); setPin('') }}>← Change</span>
            </p>

            {/* 4 PIN dots */}
            <div style={{
              display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 40,
              animation: shake ? 'shake 0.4s ease' : 'none'
            }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: i < pin.length ? '#ff6400' : 'transparent',
                  border: `2px solid ${i < pin.length ? '#ff6400' : 'rgba(255,255,255,0.2)'}`,
                  transition: 'all 0.15s ease',
                  transform: i < pin.length ? 'scale(1.15)' : 'scale(1)'
                }} />
              ))}
            </div>

            {/* Numpad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, maxWidth: 280, margin: '0 auto' }}>
              {keys.map((k, idx) => (
                <div key={idx}
                  onClick={() => {
                    if (k === '') return
                    if (k === '⌫') handleBackspace()
                    else handlePinDigit(k)
                  }}
                  style={{
                    height: 72, borderRadius: 18,
                    background: k === '' ? 'transparent' : k === '⌫' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
                    border: k === '' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: k === '' ? 'default' : 'pointer',
                    fontSize: k === '⌫' ? 22 : 24,
                    fontWeight: 300,
                    color: k === '⌫' ? 'rgba(255,255,255,0.5)' : '#fff',
                    userSelect: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'background 0.1s',
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  {loading && k !== '⌫' && k !== '' ? (pin.length === 4 ? '·' : k) : k}
                </div>
              ))}
            </div>

            <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 32 }}>
              {role === 'member' ? '🏋️ Member' : '📋 Coach'} · Default PIN is your birth year (e.g. 1990)
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0) }
          20% { transform: translateX(-8px) }
          40% { transform: translateX(8px) }
          60% { transform: translateX(-6px) }
          80% { transform: translateX(6px) }
        }
      `}</style>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
