import { supabase } from '@/lib/supabase'
import ProfileEditor from '@/components/ProfileEditor'

export default async function ProfilePage() {
  const { data: profile } = await supabase
    .from('profile')
    .select('*')
    .single()

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Profile</h1>

      {profile ? (
        <ProfileEditor initial={profile} />
      ) : (
        <p className="mt-4 text-neutral-500">No profile found yet.</p>
      )}
    </div>
  )
}