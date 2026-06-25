'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: number
  full_name: string
  headline: string
  about: string
}

export default function ProfileEditor({ initial }: { initial: Profile }) {
  const [profile, setProfile] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await supabase
      .from('profile')
      .update({
        full_name: profile.full_name,
        headline: profile.headline,
        about: profile.about,
      })
      .eq('id', profile.id)
    setSaving(false)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="mt-6 rounded-lg border border-neutral-200 p-6">
        <p className="text-xl font-semibold">{profile.full_name}</p>
        <p className="mt-1 text-neutral-600">{profile.headline}</p>
        <p className="mt-4 text-neutral-700">{profile.about}</p>
        <button
          onClick={() => setEditing(true)}
          className="mt-6 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          Edit
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-4 rounded-lg border border-neutral-200 p-6">
      <div>
        <label className="text-sm text-neutral-500">Full name</label>
        <input
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
          value={profile.full_name}
          onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
        />
      </div>
      <div>
        <label className="text-sm text-neutral-500">Headline</label>
        <input
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
          value={profile.headline}
          onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
        />
      </div>
      <div>
        <label className="text-sm text-neutral-500">About</label>
        <textarea
          rows={4}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
          value={profile.about}
          onChange={(e) => setProfile({ ...profile, about: e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}