import Planner from '@/components/Planner'

export default function PlannerPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold">Planner</h1>
      <p className="mt-1 text-neutral-500">Set your three. Plan your day around your rhythm.</p>
      <div className="mt-6">
        <Planner />
      </div>
    </div>
  )
}