import Journal from '@/components/Journal'

export default function JournalPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold">Journal</h1>
      <p className="mt-1 text-neutral-500">Reflect on your day. Click any date to revisit.</p>
      <div className="mt-6">
        <Journal />
      </div>
    </div>
  )
}