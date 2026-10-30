import type { LayoutNode, SplitDir } from '../types/session'

// Pure, immutable pane-tree operations (erasable TS only: also run by node --test)

const evenSizes = (count: number) => Array.from({ length: count }, () => 100 / count)

export function leafIds(root: LayoutNode): string[] {
  return root.type === 'leaf' ? [root.sessionId] : root.children.flatMap(leafIds)
}

export function splitLeaf(
  root: LayoutNode,
  sessionId: string,
  newSessionId: string,
  dir: SplitDir
): LayoutNode {
  const newLeaf: LayoutNode = { type: 'leaf', sessionId: newSessionId }

  if (root.type === 'leaf') {
    return root.sessionId === sessionId
      ? { type: 'split', dir, children: [root, newLeaf], sizes: evenSizes(2) }
      : root
  }

  const index = root.children.findIndex(c => c.type === 'leaf' && c.sessionId === sessionId)
  if (index !== -1 && root.dir === dir) {
    const children = [
      ...root.children.slice(0, index + 1),
      newLeaf,
      ...root.children.slice(index + 1),
    ]
    return { ...root, children, sizes: evenSizes(children.length) }
  }

  return { ...root, children: root.children.map(c => splitLeaf(c, sessionId, newSessionId, dir)) }
}

export function removeLeaf(root: LayoutNode, sessionId: string): LayoutNode | null {
  if (root.type === 'leaf') return root.sessionId === sessionId ? null : root

  const children: LayoutNode[] = []
  const sizes: number[] = []
  root.children.forEach((child, i) => {
    const next = removeLeaf(child, sessionId)
    if (next) {
      children.push(next)
      sizes.push(root.sizes[i])
    }
  })

  if (children.length === 0) return null
  if (children.length === 1) return children[0]
  if (children.length === root.children.length) return { ...root, children }

  // Give the freed space back proportionally
  const total = sizes.reduce((sum, s) => sum + s, 0)
  return { ...root, children, sizes: sizes.map(s => (s * 100) / total) }
}

export function replaceLeaf(root: LayoutNode, oldId: string, newId: string): LayoutNode {
  if (root.type === 'leaf') {
    return root.sessionId === oldId ? { type: 'leaf', sessionId: newId } : root
  }
  return { ...root, children: root.children.map(c => replaceLeaf(c, oldId, newId)) }
}
