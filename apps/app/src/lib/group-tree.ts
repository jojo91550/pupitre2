import type { ManagerGroup } from '@/lib/api-types';

// The group hierarchy of the manager space (docs/specs/030-manager-space.md),
// built from the flat list of GET /api/manager/groups.

export type GroupNode = ManagerGroup & { children: GroupNode[] };

/** A group whose parent is not in the list is a root, in the order of the list. */
export function buildTree(groups: ManagerGroup[]): GroupNode[] {
  const byId = new Map(groups.map((g) => [g.id, { ...g, children: [] as GroupNode[] }]));
  const roots: GroupNode[] = [];
  for (const group of groups) {
    const node = byId.get(group.id)!;
    const parent = group.parentId ? byId.get(group.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}
