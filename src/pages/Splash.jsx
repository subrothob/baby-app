import { useNavigate } from 'react-router-dom'

export default function Splash() {
  const navigate = useNavigate()

  return (
    <div className="screen" style={{ background: '#0a0a0a', alignItems: 'center', justifyContent: 'space-between', padding: '60px 28px 48px' }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <div className="grid-bg" />

      {/* Glow */}
      <div style={{
        position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)',
        width: '360px', height: '360px',
        background: 'radial-gradient(circle, rgba(255,100,0,0.25) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Top Content */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>

        {/* B.A.B.Y Letter Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16 }}>
          {['B', 'A', 'B', 'Y'].map((letter, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: i % 2 === 0
                  ? 'linear-gradient(135deg, #ff6400, #ff2d00)'
                  : 'rgba(255,100,0,0.12)',
                border: i % 2 === 1 ? '1.5px solid rgba(255,100,0,0.4)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: i % 2 === 0 ? '0 4px 20px rgba(255,100,0,0.35)' : 'none'
              }}>
                <span style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 28, color: '#fff', letterSpacing: 0, lineHeight: 1
                }}>{letter}</span>
              </div>
              {i < 3 && (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,100,0,0.5)', margin: '0 3px' }} />
              )}
            </div>
          ))}
        </div>

        {/* Tagline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 32, height: 1, background: 'rgba(255,100,0,0.4)' }} />
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 5, textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
            Build A Better You
          </p>
          <div style={{ width: 32, height: 1, background: 'rgba(255,100,0,0.4)' }} />
        </div>

        {/* Hero tagline */}
        <p style={{ marginTop: 20, fontSize: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 1.7, fontWeight: 300, maxWidth: 260 }}>
          Your coach. Your crew. Your{' '}
          <span style={{ color: '#ff6400', fontWeight: 600 }}>progress.</span><br />
          All in one place.
        </p>

        {/* Vertical pillars */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginTop: 32, width: '100%' }}>
          {[
            { icon: '🏋️', label: 'CrossFit', sub: 'Track lifts & WODs' },
            { icon: '🏃', label: 'Running', sub: 'Pace & mileage' },
            { icon: '📊', label: 'Progress', sub: 'Goals & PBs' },
          ].map(({ icon, label, sub }, i) => (
            <div key={i} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px',
              borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none'
            }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, color: '#fff', letterSpacing: 1 }}>{label}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'center', letterSpacing: 0.5 }}>{sub}</span>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 20 }}>
          {[['∞', 'Gains'], ['365', 'Days'], ['1', 'Community']].map(([num, label], i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: '#ff6400' }}>{num}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, textTransform: 'uppercase' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Buttons */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn-primary" onClick={() => navigate('/register')}>
          Get Started — Join B.A.B.Y
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>already a member?</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        </div>
        <button className="btn-secondary" onClick={() => navigate('/login')}>Sign In</button>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.18)', marginTop: 4 }}>
          B.A.B.Y · Build A Better You · Est. 2025
        </p>
      </div>
    </div>
  )
}
