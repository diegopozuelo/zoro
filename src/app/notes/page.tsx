import NotesBoard from '@/components/NotesBoard'

export default function NotesPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-5xl">Notes</h1>
      <p className="mt-1 font-display text-xl text-[var(--ink-soft)]">
        Tasks, reminders, thoughts, everything on your mind.
      </p>
      <NotesBoard />
    </div>
  )
}