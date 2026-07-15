import ProjectWorkspace from '@/components/ProjectWorkspace'

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = Number(id)

  if (!Number.isFinite(projectId)) {
    return (
      <div className="max-w-3xl">
        <p className="text-[var(--ink-soft)]">Invalid project.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <ProjectWorkspace projectId={projectId} />
    </div>
  )
}
