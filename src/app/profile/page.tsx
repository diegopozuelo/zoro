import { supabase } from '@/lib/supabase'

export default async function ProfilePage() {
  const { data: profile } = await supabase
    .from('profile')
    .select('*')
    .single()

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Profile</h1>

      {profile ? (
        <div className="mt-6 rounded-lg border border-neutral-200 p-6">
          <p className="text-xl font-semibold">{profile.full_name}</p>
          <p className="mt-1 text-neutral-600">{profile.headline}</p>
          <p className="mt-4 text-neutral-700">{profile.about}</p>
        </div>
      ) : (
        <p className="mt-4 text-neutral-500">No profile found yet.</p>
      )}
    </div>
  )
}