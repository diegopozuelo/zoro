import Brainstorm from '@/components/Brainstorm'

export default function BrainstormPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold">Brainstorm</h1>
      <p className="mt-1 text-neutral-500">Capture ideas, routine tweaks, anything worth remembering.</p>
      <div className="mt-6">
        <Brainstorm />
      </div>
    </div>
  )
}