import ProjectsList from '@/components/ProjectsList'

export default function ProjectsPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-5xl">Projects</h1>
      <p className="mt-1 font-display text-xl text-[var(--ink-soft)]">
        Big containers that connect notes, outreach, and applications.
      </p>
      <ProjectsList />
    </div>
  )
}
