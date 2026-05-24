import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const VAPID_PUBLIC_KEY = 'BM0E6i4JLZUzOsz8d1ajMrd9GaAHjWCJoo3c9LJ5l9AcxVQn8BepO6zaJnySH6xSY_OOoaiiI--KOzjzitT7tfU'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function NotificationButton({ memberId, memberName }) {
  const [status, setStatus] = useState('idle') // idle | subscribed | denied | unsupported
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    const permission = Notification.permission
    if (permission === 'denied') { setStatus('denied'); return }
    if (permission === 'granted') {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) setStatus('subscribed')
      }
    }
  }

  const subscribe = async () => {
    setLoading(true)
    try {
      // Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Request permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus('denied'); setLoading(false); return }

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })

      // Save to Supabase
      const { error } = await supabase.from('push_subscriptions').upsert([{
        member_id: memberId,
        member_name: memberName,
        subscription: JSON.stringify(sub),
        updated_at: new Date().toISOString()
      }], { onConflict: 'member_id' })

      if (!error) setStatus('subscribed')
    } catch (err) {
      console.error('Subscribe error:', err)
    }
    setLoading(false)
  }

  const unsubscribe = async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
      }
      await supabase.from('push_subscriptions').delete().eq('member_id', memberId)
      setStatus('idle')
    } catch (err) {
      console.error('Unsubscribe error:', err)
    }
    setLoading(false)
  }

  if (status === 'unsupported') return null

  const accent = '#ff6400'

  if (status === 'subscribed') {
    return (
      <div onClick={unsubscribe} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
        background: 'rgba(0,200,100,0.1)', border: '1px solid rgba(0,200,100,0.3)',
        borderRadius: 12, cursor: 'pointer', fontSize: 13, color: 'rgba(0,220,100,0.9)', fontWeight: 500
      }}>
        🔔 WOD notifications ON &nbsp;<span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>tap to turn off</span>
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div style={{
        padding: '10px 16px', background: 'rgba(255,50,50,0.08)',
        border: '1px solid rgba(255,50,50,0.2)', borderRadius: 12,
        fontSize: 12, color: 'rgba(255,100,100,0.8)'
      }}>
        🔕 Notifications blocked. Enable in browser settings.
      </div>
    )
  }

  return (
    <div onClick={!loading ? subscribe : undefined} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
      background: 'rgba(255,100,0,0.1)', border: '1px solid rgba(255,100,0,0.3)',
      borderRadius: 12, cursor: loading ? 'default' : 'pointer',
      fontSize: 13, color: accent, fontWeight: 500, opacity: loading ? 0.6 : 1
    }}>
      🔔 {loading ? 'Setting up...' : 'Enable 5am WOD notifications'}
    </div>
  )
}