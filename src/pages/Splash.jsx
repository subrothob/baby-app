import { useNavigate } from 'react-router-dom'

export default function Splash() {
  const navigate = useNavigate()

  return (
    <div className="screen" style={{ background: '#0a0a0a', alignItems: 'center', justifyContent: 'space-between', padding: '60px 28px 48px' }}>
      <div className="grid-bg" />

      {/* Glow */}
      <div style={{
        position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)',
        width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(255,100,0,0.3) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Top Content */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
        {/* Logo */}
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          border: '2px solid rgba(255,100,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff6400, #ff2d00)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#fff', letterSpacing: 2 }}>B</span>
          </div>
        </div>

        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 72, color: '#fff', letterSpacing: 8, lineHeight: 1 }}>BABY</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: 4, textTransform: 'uppercase', marginTop: 8 }}>Build A Better You</p>

        <p style={{ marginTop: 28, fontSize: 15, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.6, fontWeight: 300 }}>
          Your coach. Your crew. Your <span style={{ color: '#ff6400', fontWeight: 500 }}>progress.</span><br />All in one place.
        </p>

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 28 }}>
          {[['300', 'Members'], ['1', 'Community'], ['∞', 'Gains']].map(([num, label], i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#ff6400' }}>{num}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Buttons */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn-primary" onClick={() => navigate('/register')}>
          Get Started — Join BABY
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>already a member?</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        </div>
        <button className="btn-secondary" onClick={() => navigate('/login')}>Sign In</button>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
          1life2live · Coach Sam · BABY Community
        </p>
      </div>
    </div>
  )
}