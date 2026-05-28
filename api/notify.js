import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  'mailto:coach@hyfit.in',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const supabase = createClient(
  'https://nxozpnfnuphvotitgefq.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  try {
    const { title, body } = req.body || {}
    const wodTitle = title || '🔥 BABY — Time to Train!'
    const wodBody = body || "Check the app for today's workout!"
    const { data: subscriptions, error: dbError } = await supabase.from('push_subscriptions').select('*')
    console.log('Subscriptions:', subscriptions?.length, 'Error:', dbError)
    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ message: 'No subscriptions found', sent: 0, dbError })
    }
    let sent = 0, failed = 0
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(JSON.parse(sub.subscription), JSON.stringify({ title: wodTitle, body: wodBody, url: '/member' }))
        sent++
      } catch (err) {
        failed++
        if (err.statusCode === 410) await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
    res.status(200).json({ success: true, sent, failed })
  } catch (err) {
    console.error('Notify error:', err)
    res.status(500).json({ error: err.message })
  }
}
