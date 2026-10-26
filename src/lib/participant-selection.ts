/** Accept legacy IDs and participant snapshots, ignoring malformed persisted entries. */
export function normalizeParticipantSelection(value: unknown, participants: Array<{ id: string; name: string }> = []): Array<{ id: string; name: string }> {
  if (!Array.isArray(value)) return [];
  const selected = new Map<string, { id: string; name: string }>();
  for (const entry of value) {
    const id = typeof entry === "string" ? entry.trim() : entry && typeof entry === "object" && typeof entry.id === "string" ? entry.id.trim() : "";
    if (!id) continue;
    const known = participants.find((participant) => participant.id === id);
    const snapshotName = entry && typeof entry === "object" && typeof entry.name === "string" ? entry.name.trim() : "";
    selected.set(id, { id, name: known?.name || snapshotName || id.slice(0, 8) });
  }
  return Array.from(selected.values());
}
