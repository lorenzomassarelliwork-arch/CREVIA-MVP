let savedProjectIds = new Set<string>(['project-3']);

export async function listSavedProjectIds(): Promise<string[]> {
  return [...savedProjectIds];
}

export async function isProjectSaved(projectId: string): Promise<boolean> {
  return savedProjectIds.has(projectId);
}

export async function toggleSavedProject(projectId: string): Promise<boolean> {
  if (savedProjectIds.has(projectId)) {
    savedProjectIds.delete(projectId);
    return false;
  }

  savedProjectIds.add(projectId);
  return true;
}
