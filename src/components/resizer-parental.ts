import {NumberUtils} from '@pucelle/ff'
import {Resizer} from './resizer'
import {css, html} from '@pucelle/lupos.js'


/** `<Resizer>` will resize it's parent by dragging it. */
export class ParentalResizer<E = {}> extends Resizer<E> {

	static style = css`
		.parental-resizer{
			position: absolute;
			z-index: 100;
			
			&.resizer-top{
				top: -5px;
				left: 0;
			}

			&.resizer-bottom{
				bottom: -5px;
				left: 0;
			}

			&.resizer-left{
				top: 0;
				left: -5px;
			}

			&.resizer-right{
				top: 0;
				right: -5px;
			}
		}
	`
	
	
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

	protected render() {
		return html`
			<template class="resizer parental-resizer resizer-${this.position}"
				@mousedown=${this.onMouseDown}
			/>
		`
	}

	protected onResizeStart() {
		this.startParentSize = {
			width: this.el.parentElement!.offsetWidth,
			height: this.el.parentElement!.offsetHeight,
		}
	}

	protected onResizeMoves(moves: Coord, e: MouseEvent) {
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