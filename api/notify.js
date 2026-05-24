import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  'mailto:coach@hyfit.in',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  // Allow manual trigger via GET or scheduled cron
  try {
    // Get today's WOD
    const today = new Date().toISOString().split('T')[0]
    const { data: wods } = await supabase
      .from('wods')
      .select('*')
      .eq('scheduled_date', today)
      .limit(1)

    const wod = wods?.[0]
    const wodTitle = wod ? `🔥 Today's WOD: ${wod.name || wod.type}` : '🔥 BABY — Time to Train!'
    const wodBody = wod?.conditioning
      ? wod.conditioning.slice(0, 100) + '...'
      : "Check the app for today's workout. Let's get it! 💪"

    // Get all push subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ message: 'No subscriptions found', sent: 0 })
    }

    let sent = 0
    let failed = 0

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          JSON.parse(sub.subscription),
          JSON.stringify({
            title: wodTitle,
            body: wodBody,
            url: '/member'
          })
        )
        sent++
      } catch (err) {
        failed++
        // Remove invalid subscriptions
        if (err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }

    res.status(200).json({ success: true, sent, failed })
  } catch (err) {
    console.error('Notify error:', err)
    res.status(500).json({ error: err.message })
  }
}