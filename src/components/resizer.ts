import {css, html, Component, render} from 'lupos.html'
import {Coord, MouseMovement} from 'ff-kit'


interface ResizerEvents {

	/** Fires after resizing start. */
	'resize-start': (e: MouseEvent) => void

	/** Fires after every time resizing. */
	'resize-move': (moves: Coord, e: MouseEvent) => void

	/** Fires after resizing end. */
	'resize-end': (e: MouseEvent) => void
}

/** Resize direction to indicate which direction the resizer should be align to relative it's parent. */
export type ResizerPosition = 'top' | 'right' | 'bottom' | 'left'


/** 
 * `<Resizer>` allows you drag to resize sibling elements.
 * 
 * You should normally use it to adjust sibling sizes in 'resize-move' event.
 * Or use `<ParentalResizer>` to adjust parent size directly.
 */
export class Resizer<E = {}> extends Component<E & ResizerEvents> {
	
	static override style = css`
		.resizer{
			flex: none;
			position: relative;
			will-change: true;
			z-index: 100;
		}

		.resizer-top{
			width: 100%;
			height: 10px;
			cursor: ns-resize;
		}

		.resizer-bottom{
			width: 100%;
			height: 10px;
			cursor: ns-resize;
		}

		.resizer-left{
			width: 10px;
			height: 100%;
			cursor: ew-resize;
		}

		.resizer-right{
			width: 10px;
			height: 100%;
			cursor: ew-resize;
		}

		.resizing-mask{
			position: fixed;
			z-index: 9999;
			left: 0;
			right: 0;
			top: 0;
			bottom: 0;

			&.horizontal{
				cursor: ew-resize;
			}

			&.vertical{
				cursor: ns-resize;
			}
		}
	`


	/** Which position should align resizer relative to it's parent. */
	position: ResizerPosition = 'right'

	protected override render() {
		return html`
			<template class="resizer resizer-${this.position}"
				@mousedown=${this.onMouseDown}
			/>
		`
	}

	protected onMouseDown(this: Resizer, e: MouseEvent) {
		let mover = new MouseMovement(e)

		mover.onMove = (moves: Coord, _m: Coord, e: MouseEvent) => {
			e.preventDefault()
			this.fire('resize-move', moves, e)
		}

		mover.onEnd = (e: MouseEvent) => {
			cursorMask.remove()
			this.fire('resize-end', e)
		}

		let hvClass = this.position === 'left' || this.position === 'right' ? 'horizontal' : 'vertical'

		let cursorMask = render(html`
			<div class="resizing-mask ${hvClass}" />
		`)

		cursorMask.appendTo(document.body)
		this.fire('resize-start', e)
	}
}