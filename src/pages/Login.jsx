import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullname: '', mobile: '', dob: '', gender: '', email: '', role: 'member' })
  const [hints, setHints] = useState({})
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const validate = (field, value) => {
    switch (field) {
      case 'fullname':
        return /^[a-zA-Z\s]{2,}$/.test(value) ? { text: '✓ Looks good', cls: 'ok' } : { text: '✗ Letters only', cls: 'err' }
      case 'mobile':
        return /^[6-9]\d{9}$/.test(value) ? { text: '✓ Valid number', cls: 'ok' } : { text: value.length < 10 ? `${10 - value.length} more digits` : '✗ Must start with 6-9', cls: 'err' }
      case 'dob': {
        const age = Math.floor((new Date() - new Date(value)) / (365.25 * 24 * 60 * 60 * 1000))
        return age >= 16 && age <= 80 ? { text: `✓ Age: ${age} years`, cls: 'ok' } : { text: '✗ Must be 16+', cls: 'err' }
      }
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? { text: '✓ Valid email', cls: 'ok' } : { text: '✗ Enter valid email', cls: 'err' }
      default: return null
    }
  }

  const handleChange = (field, value) => {
    // Mobile: numbers only
    if (field === 'mobile') value = value.replace(/\D/g, '').slice(0, 10)
    setForm(f => ({ ...f, [field]: value }))
    const h = validate(field, value)
    if (h) setHints(prev => ({ ...prev, [field]: h }))
  }

  const handleSubmit = async () => {
    // Check all valid
    const fields = ['fullname', 'mobile', 'dob', 'email']
    for (const f of fields) {
      const h = validate(f, form[f])
      if (!h || h.cls !== 'ok') { showToast('⚠ Please fix all fields first', 'error'); return }
    }
    if (!form.gender) { showToast('⚠ Please select your gender', 'error'); return }

    setLoading(true)
    try {
      // Check for duplicate mobile
      const { data: existing } = await supabase
        .from('members')
        .select('id')
        .eq('mobile', form.mobile)
        .single()

      if (existing) {
        showToast('⚠ This mobile number is already registered!', 'error')
        setLoading(false)
        return
      }

      // Insert new member
      const { error } = await supabase.from('members').insert([{
        full_name: form.fullname,
        mobile: form.mobile,
        dob: form.dob,
        gender: form.gender,
        email: form.email,
        role: form.role,
        created_at: new Date().toISOString()
      }])

      if (error) throw error

      showToast('✅ Welcome to BABY! Please sign in.', 'success')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      showToast('Something went wrong. Try again.', 'error')
    }
    setLoading(false)
  }

  return (
    <div className="screen" style={{ padding: '36px 24px 32px' }}>
      <div className="grid-bg" />
      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#ff6400,#ff2d00)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: '#fff' }}>B</span>
          </div>
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: '#fff', letterSpacing: 4 }}>BABY</span>
        </div>

        <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 38, color: '#fff', letterSpacing: 3, lineHeight: 1 }}>JOIN THE CREW</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 4, marginBottom: 24 }}>One account. One number. No duplicates.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Full Name */}
          <div className="field">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="e.g. Ruchi Kumar"
              value={form.fullname}
              className={hints.fullname?.cls === 'ok' ? 'valid' : hints.fullname?.cls === 'err' ? 'error' : ''}
              onChange={e => handleChange('fullname', e.target.value)}
            />
            {hints.fullname && <span className={`hint ${hints.fullname.cls}`}>{hints.fullname.text}</span>}
          </div>

          {/* Mobile */}
          <div className="field">
            <label>Mobile Number</label>
            <input
              type="tel"
              placeholder="10-digit mobile number"
              value={form.mobile}
              className={hints.mobile?.cls === 'ok' ? 'valid' : hints.mobile?.cls === 'err' ? 'error' : ''}
              onChange={e => handleChange('mobile', e.target.value)}
            />
            {hints.mobile && <span className={`hint ${hints.mobile.cls}`}>{hints.mobile.text}</span>}
          </div>

          {/* DOB + Gender */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Date of Birth</label>
              <input
                type="date"
                value={form.dob}
                style={{ colorScheme: 'dark' }}
                className={hints.dob?.cls === 'ok' ? 'valid' : hints.dob?.cls === 'err' ? 'error' : ''}
                onChange={e => handleChange('dob', e.target.value)}
              />
              {hints.dob && <span className={`hint ${hints.dob.cls}`}>{hints.dob.text}</span>}
            </div>
            <div className="field">
              <label>Gender</label>
              <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                style={{ colorScheme: 'dark' }}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Email */}
          <div className="field">
            <label>Email ID</label>
            <input
              type="email"
              placeholder="e.g. ruchi@gmail.com"
              value={form.email}
              className={hints.email?.cls === 'ok' ? 'valid' : hints.email?.cls === 'err' ? 'error' : ''}
              onChange={e => handleChange('email', e.target.value)}
            />
            {hints.email && <span className={`hint ${hints.email.cls}`}>{hints.email.text}</span>}
          </div>

          {/* Role */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {['member', 'coach'].map(r => (
              <div key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                style={{
                  border: `1px solid ${form.role === r ? 'rgba(255,100,0,0.6)' : 'rgba(255,255,255,0.08)'}`,
                  background: form.role === r ? 'rgba(255,100,0,0.08)' : 'transparent',
                  borderRadius: 12, padding: '12px 8px', textAlign: 'center', cursor: 'pointer'
                }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{r === 'member' ? '🏋️' : '📋'}</div>
                <div style={{ fontSize: 13, color: form.role === r ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: 500, textTransform: 'capitalize' }}>{r}</div>
              </div>
            ))}
          </div>

          <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginTop: 4 }}>
            {loading ? 'Creating Account...' : 'Create My BABY Account'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            Already a member?{' '}
            <span style={{ color: '#ff6400', cursor: 'pointer', fontWeight: 500 }} onClick={() => navigate('/login')}>Sign In ↗</span>
          </p>
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}