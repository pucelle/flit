import {NumberUtils, Vector} from '@pucelle/ff'
import {Resizer} from './resizer'


/** `<Resizer>` will resize it's parent by dragging it. */
export class ParentalResizer<E = {}> extends Resizer<E> {
	
	/** 
	 * Resizing speed rate,
	 * set it to `2` if element aligns to center, and moves 1px will cause 2px increases.
	 */
	rate: number = 1

	/** Minimum size of parent. */
	min: number = 0

	/** Maximum size of parent. */
	max: number = Infinity

	/** Current size of parent. */
	size: number = -1

	protected startParentSize: SizeLike | null = null

	protected onCreated(this: ParentalResizer) {
		super.onCreated()
		this.on('resize-start', this.onResizeStart, this)
		this.on('resize-move', this.onResizeMoves, this)
	}

	protected onResizeStart() {
		this.startParentSize = {
			width: this.el.parentElement!.offsetWidth,
			height: this.el.parentElement!.offsetHeight,
		}
	}

	protected onResizeMoves(moves: Vector, e: MouseEvent) {
		e.preventDefault()

		let value: number
		let startParentSize = this.startParentSize!

		if (this.position === 'top' || this.position === 'bottom') {
			let flag = this.position === 'bottom' ? 1 : -1

			value = startParentSize.height + flag * moves.y * this.rate
			value = NumberUtils.clamp(value, this.min, this.max)
			this.el.parentElement!.style.height = value + 'px'
		}
		else {
			let flag = this.position === 'right' ? 1 : -1

			value = startParentSize.width + flag * moves.x * this.rate
			value = NumberUtils.clamp(value, this.min, this.max)
			this.el.parentElement!.style.width = value + 'px'
		}

		this.size = value
	}
}