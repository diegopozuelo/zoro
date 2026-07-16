import ProjectWorkspace from '@/components/ProjectWorkspace'
import AmbientField from '@/components/AmbientField'

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = Number(id)

  if (!Number.isFinite(projectId)) {
    return (
      <div className="hud-content mx-auto max-w-6xl">
        <p className="text-[var(--ink-soft)]">Invalid project.</p>
      </div>
    )
  }

  return (
    <div className="hud-stage hud-stage-bleed">
      <AmbientField />
      <div className="hud-grid" aria-hidden />
      <div className="hud-scan" aria-hidden />
      <div className="hud-content mx-auto max-w-6xl">
        <ProjectWorkspace projectId={projectId} />
      </div>
    </div>
  )
}
