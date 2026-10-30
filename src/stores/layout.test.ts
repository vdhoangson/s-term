import test from 'node:test'
import assert from 'node:assert/strict'
import { leafIds, removeLeaf, replaceLeaf, splitLeaf } from './layout.ts'

const leaf = (sessionId: string) => ({ type: 'leaf' as const, sessionId })

test('split a single leaf', () => {
  const root = splitLeaf(leaf('a'), 'a', 'b', 'row')
  assert.deepEqual(root, {
    type: 'split',
    dir: 'row',
    children: [leaf('a'), leaf('b')],
    sizes: [50, 50],
  })
})

test('split again in the same direction adds a sibling after the source with even sizes', () => {
  const root = splitLeaf(splitLeaf(leaf('a'), 'a', 'b', 'row'), 'a', 'c', 'row')
  assert.ok(root.type === 'split')
  assert.deepEqual(leafIds(root), ['a', 'c', 'b'])
  assert.deepEqual(root.sizes, [100 / 3, 100 / 3, 100 / 3])
})

test('split in the other direction nests', () => {
  const root = splitLeaf(splitLeaf(leaf('a'), 'a', 'b', 'row'), 'b', 'c', 'col')
  assert.deepEqual(root, {
    type: 'split',
    dir: 'row',
    children: [
      leaf('a'),
      { type: 'split', dir: 'col', children: [leaf('b'), leaf('c')], sizes: [50, 50] },
    ],
    sizes: [50, 50],
  })
})

test('splitLeaf does not mutate its input', () => {
  const before = splitLeaf(leaf('a'), 'a', 'b', 'row')
  const snapshot = JSON.stringify(before)
  splitLeaf(before, 'a', 'c', 'row')
  assert.equal(JSON.stringify(before), snapshot)
})

test('removeLeaf collapses a split with one remaining child', () => {
  const root = splitLeaf(leaf('a'), 'a', 'b', 'row')
  assert.deepEqual(removeLeaf(root, 'b'), leaf('a'))
})

test('removeLeaf rebalances the remaining siblings', () => {
  const root = splitLeaf(splitLeaf(leaf('a'), 'a', 'b', 'row'), 'b', 'c', 'row')
  const next = removeLeaf(root, 'c')
  assert.deepEqual(next, {
    type: 'split',
    dir: 'row',
    children: [leaf('a'), leaf('b')],
    sizes: [50, 50],
  })
})

test('removeLeaf of the last leaf returns null', () => {
  assert.equal(removeLeaf(leaf('a'), 'a'), null)
})

test('removeLeaf collapses a nested split into its parent slot', () => {
  const root = splitLeaf(splitLeaf(leaf('a'), 'a', 'b', 'row'), 'b', 'c', 'col')
  assert.deepEqual(removeLeaf(root, 'c'), {
    type: 'split',
    dir: 'row',
    children: [leaf('a'), leaf('b')],
    sizes: [50, 50],
  })
})

test('replaceLeaf swaps one session id', () => {
  const root = splitLeaf(leaf('a'), 'a', 'b', 'row')
  assert.deepEqual(leafIds(replaceLeaf(root, 'b', 'z')), ['a', 'z'])
  assert.deepEqual(replaceLeaf(leaf('a'), 'a', 'z'), leaf('z'))
})
