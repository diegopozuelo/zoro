import ProjectWorkspace from '@/components/ProjectWorkspace'
import HudShell from '@/components/HudShell'

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
    <HudShell>
        <ProjectWorkspace projectId={projectId} />
      </HudShell>
  )
}
