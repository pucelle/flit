import {EditType, getEditRecord} from '../../src/helpers/edit'


function restoredGraphEdit<T>(oldItems: T[], newItems: T[], willReuse: boolean) {
	let record = getEditRecord(oldItems, newItems, willReuse)
	let restored: T[] = []

	for (let r of record) {
		if (r.type === EditType.Leave) {
			restored.push(oldItems[r.fromIndex])
		}
		else if (r.type === EditType.Skip) {
			
		}
		else if (r.type === EditType.Move) {
			restored.push(oldItems[r.moveFromIndex])
		}
		else if (r.type === EditType.MoveModify) {
			restored.push(newItems[r.toIndex])
		}
		else if (r.type === EditType.Delete) {
			
		}
		else if (r.type === EditType.Insert) {
			restored.push(newItems[r.toIndex])
		}
	}

	return restored
}


describe('Test Graph Edit', () => {
	it('Test delete and insert', () => {
		let a: number[] = [1, 2, 3]
		let b: number[] = []
		
		expect(getEditRecord(a, b, true)).toEqual([
			{type: EditType.Delete, fromIndex: 0, toIndex: -1, moveFromIndex: -1},
			{type: EditType.Delete, fromIndex: 1, toIndex: -1, moveFromIndex: -1},
			{type: EditType.Delete, fromIndex: 2, toIndex: -1, moveFromIndex: -1},
		])

		expect(getEditRecord(b, a, true)).toEqual([
			{type: EditType.Insert, fromIndex: 0, toIndex: 0, moveFromIndex: -1},
			{type: EditType.Insert, fromIndex: 0, toIndex: 1, moveFromIndex: -1},
			{type: EditType.Insert, fromIndex: 0, toIndex: 2, moveFromIndex: -1},
		])

		expect(restoredGraphEdit(a, b, true)).toEqual(b)
		expect(restoredGraphEdit(b, a, true)).toEqual(a)
		expect(restoredGraphEdit(a, b, false)).toEqual(b)
		expect(restoredGraphEdit(b, a, false)).toEqual(a)
	})

	it('Test leave', () => {
		let a: number[] = [1, 2, 3]
		let b: number[] = [1, 2, 3]
		
		expect(getEditRecord(a, b, true)).toEqual([
			{type: EditType.Leave, fromIndex: 0, toIndex: 0, moveFromIndex: -1},
			{type: EditType.Leave, fromIndex: 1, toIndex: 1, moveFromIndex: -1},
			{type: EditType.Leave, fromIndex: 2, toIndex: 2, moveFromIndex: -1},
		])

		expect(restoredGraphEdit(a, b, true)).toEqual(b)
		expect(restoredGraphEdit(b, a, true)).toEqual(a)
		expect(restoredGraphEdit(a, b, false)).toEqual(b)
		expect(restoredGraphEdit(b, a, false)).toEqual(a)
	})

	it('Test move', () => {
		let a: number[] = [1, 2, 3]
		let b: number[] = [3, 1, 2]

		// Should test c = [2, 3, 1] with a, b?
		// No, (123), (231), (312) make up a permutation group,
		// any two of them can generate all elements in the group.
		
		expect(getEditRecord(a, b, true)).toEqual([
			{type: EditType.Move, fromIndex: 0, toIndex: 0, moveFromIndex: 2},
			{type: EditType.Leave, fromIndex: 0, toIndex: 1, moveFromIndex: -1},
			{type: EditType.Leave, fromIndex: 1, toIndex: 2, moveFromIndex: -1},
		])

		expect(getEditRecord(b, a, true)).toEqual([
			{type: EditType.Leave, fromIndex: 1, toIndex: 0, moveFromIndex: -1},
			{type: EditType.Leave, fromIndex: 2, toIndex: 1, moveFromIndex: -1},
			{type: EditType.Move, fromIndex: 3, toIndex: 2, moveFromIndex: 0},
		])

		expect(restoredGraphEdit(a, b, true)).toEqual(b)
		expect(restoredGraphEdit(b, a, true)).toEqual(a)
		expect(restoredGraphEdit(a, b, false)).toEqual(b)
		expect(restoredGraphEdit(b, a, false)).toEqual(a)
	})

	it('Test move modify', () => {
		let a: number[] = [1, 2, 3]
		let b: number[] = [4, 1, 2]

		expect(getEditRecord(a, b, true)).toEqual([
			{type: EditType.MoveModify, fromIndex: 0, toIndex: 0, moveFromIndex: 2},
			{type: EditType.Leave, fromIndex: 0, toIndex: 1, moveFromIndex: -1},
			{type: EditType.Leave, fromIndex: 1, toIndex: 2, moveFromIndex: -1},
		])

		expect(getEditRecord(b, a, true)).toEqual([
			{type: EditType.Leave, fromIndex: 1, toIndex: 0, moveFromIndex: -1},
			{type: EditType.Leave, fromIndex: 2, toIndex: 1, moveFromIndex: -1},
			{type: EditType.MoveModify, fromIndex: 3, toIndex: 2, moveFromIndex: 0},
		])

		expect(getEditRecord(a, b, false)).toEqual([
			{type: EditType.Insert, fromIndex: 0, toIndex: 0, moveFromIndex: -1},
			{type: EditType.Leave, fromIndex: 0, toIndex: 1, moveFromIndex: -1},
			{type: EditType.Leave, fromIndex: 1, toIndex: 2, moveFromIndex: -1},
			{type: EditType.Delete, fromIndex: 2, toIndex: -1, moveFromIndex: -1},
		])

		expect(getEditRecord(b, a, false)).toEqual([
			{type: EditType.Leave, fromIndex: 1, toIndex: 0, moveFromIndex: -1},
			{type: EditType.Leave, fromIndex: 2, toIndex: 1, moveFromIndex: -1},
			{type: EditType.Insert, fromIndex: 3, toIndex: 2, moveFromIndex: -1},
			{type: EditType.Delete, fromIndex: 0, toIndex: -1, moveFromIndex: -1},
		])

		expect(restoredGraphEdit(a, b, true)).toEqual(b)
		expect(restoredGraphEdit(b, a, true)).toEqual(a)
		expect(restoredGraphEdit(a, b, false)).toEqual(b)
		expect(restoredGraphEdit(b, a, false)).toEqual(a)
	})

	it('Test move modify and insert delete', () => {
		let a: number[] = [1, 2, 3]
		let b: number[] = [4, 5, 1, 2]

		expect(getEditRecord(a, b, true)).toEqual([
			{type: EditType.MoveModify, fromIndex: 0, toIndex: 0, moveFromIndex: 2},
			{type: EditType.Insert, fromIndex: 0, toIndex: 1, moveFromIndex: -1},
			{type: EditType.Leave, fromIndex: 0, toIndex: 2, moveFromIndex: -1},
			{type: EditType.Leave, fromIndex: 1, toIndex: 3, moveFromIndex: -1},
		])

		expect(getEditRecord(b, a, true)).toEqual([
			{type: EditType.Leave, fromIndex: 2, toIndex: 0, moveFromIndex: -1},
			{type: EditType.Leave, fromIndex: 3, toIndex: 1, moveFromIndex: -1},
			{type: EditType.MoveModify, fromIndex: 4, toIndex: 2, moveFromIndex: 0},
			{type: EditType.Delete, fromIndex: 1, toIndex: -1, moveFromIndex: -1},
		])

		expect(restoredGraphEdit(a, b, true)).toEqual(b)
		expect(restoredGraphEdit(b, a, true)).toEqual(a)
		expect(restoredGraphEdit(a, b, false)).toEqual(b)
		expect(restoredGraphEdit(b, a, false)).toEqual(a)
	})

	it('Test repeated items', () => {
		let a: number[] = [1, 2, 3]
		let b: number[] = [1, 1, 2]

		expect(getEditRecord(a, b, true)).toEqual([
			{type: EditType.MoveModify, fromIndex: 0, toIndex: 0, moveFromIndex: 2},
			{type: EditType.Leave, fromIndex: 0, toIndex: 1, moveFromIndex: -1},
			{type: EditType.Leave, fromIndex: 1, toIndex: 2, moveFromIndex: -1},
		])

		expect(getEditRecord(b, a, true)).toEqual([
			{type: EditType.Leave, fromIndex: 0, toIndex: 0, moveFromIndex: -1},
			{type: EditType.Leave, fromIndex: 2, toIndex: 1, moveFromIndex: -1},
			{type: EditType.MoveModify, fromIndex: 3, toIndex: 2, moveFromIndex: 1},
		])

		expect(restoredGraphEdit(a, b, true)).toEqual(b)
		expect(restoredGraphEdit(b, a, true)).toEqual(a)
		expect(restoredGraphEdit(a, b, false)).toEqual(b)
		expect(restoredGraphEdit(b, a, false)).toEqual(a)
	})

	it('Test random data', () => {
		let a: number[] = []
		let b: number[] = []

		for (let i = 0; i < 100; i++) {
			a.push(Math.floor(Math.random() * 100))
			b.push(Math.floor(Math.random() * 100))
		}

		// For debugging.
		// console.log(a)
		// console.log(b)

		// console.log(getGraphEditRecord(a, b).map(v => {
		// 	return {
		// 		...v,
		// 		type: GraphEditType[v.type],
		// 	}
		// }))

		expect(restoredGraphEdit(a, b, true)).toEqual(b)
		expect(restoredGraphEdit(b, a, true)).toEqual(a)
		expect(restoredGraphEdit(a, b, false)).toEqual(b)
		expect(restoredGraphEdit(b, a, false)).toEqual(a)
	})
})