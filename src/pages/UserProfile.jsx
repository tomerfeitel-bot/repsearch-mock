import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useToast } from '../components/ui/Toast.jsx'
import ProfileSummary from '../components/profile/ProfileSummary.jsx'

export default function UserProfile() {
  const { username } = useParams()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [followBusy, setFollowBusy] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setData(await api.get(`/public/users/${username}`))
    } catch (err) {
      toast(err.message || 'Failed to load profile', 'error')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [username])

  async function toggleFollow() {
    const targetId = data?.user?.id
    if (!targetId) return
    setFollowBusy(true)
    try {
      if (data?.viewer?.follows_them) {
        await api.del(`/social/follow/${targetId}`)
      } else {
        await api.post(`/social/follow/${targetId}`)
      }
      await load()
    } catch (err) {
      toast(err.message || 'Failed to update follow', 'error')
    } finally {
      setFollowBusy(false)
    }
  }

  return (
    <div className="min-h-screen pb-24 bg-gray-950">
      <header className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 safe-pt-4 pb-3">
        <h1 className="text-2xl font-bold text-white">{username}</h1>
      </header>
      <ProfileSummary
        data={data}
        loading={loading}
        privateView={!!data?.private}
        onFollow={toggleFollow}
        followBusy={followBusy}
      />
    </div>
  )
}
