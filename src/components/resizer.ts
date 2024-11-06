import {css, html, Component, render} from '@pucelle/lupos.js'
import {DOMEvents, NumberUtils} from '@pucelle/ff'


interface ResizerEvents {

	/** Fires after every time resizing. */
	resize: (size: number) => void

	/** Fires after resizing end. */
	change: (size: number) => void
}

/** Resize direction to indicate which direction the resizer should be align to relative it's parent. */
export type ResizerPosition = 'top' | 'right' | 'bottom' | 'left'


/** `<f-resizer>` should an absolute type resizer bar, drag it will */
export class Resizer<E = {}> extends Component<E & ResizerEvents> {
	
	static style() {
		return css`
		.resizer{
			position: absolute;
			z-index: 100;
		}

		.resizer-top{
			width: 100%;
			height: 10px;
			top: -5px;
			left: 0;
			cursor: ns-resize;
		}

		.resizer-bottom{
			width: 100%;
			height: 10px;
			bottom: -5px;
			left: 0;
			cursor: ns-resize;
		}

		.resizer-left{
			width: 10px;
			height: 100%;
			top: 0;
			left: -5px;
			cursor: ew-resize;
		}

		.resizer-right{
			width: 10px;
			height: 100%;
			top: 0;
			right: -5px;
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
	}

	/** Which position should align resizer relative to it's parent. */
	position: ResizerPosition = 'right'

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

	protected render() {
		return html`
			<template class="resizer resizer-${this.position}"
				@mousedown=${this.onStartResize}
			/>
		`
	}

	protected onStartResize(this: Resizer, e: MouseEvent) {
		let startX = e.clientX
		let startY = e.clientY
		let startParentWidth = this.el.parentElement!.offsetWidth
		let startParentHeight = this.el.parentElement!.offsetHeight

		let onMouseMove = (e: MouseEvent) => {
			e.preventDefault()
			this.resize(startParentWidth, startParentHeight, e.clientX - startX, e.clientY - startY)
		}

		let onMouseUp = () => {
			DOMEvents.off(document, 'mousemove', onMouseMove as (e: Event) => void)
			cursorMask.remove()
			this.fire('change', this.size)
		}

		let cursorMask = render(html`
			<div class="resizing-mask ${this.position === 'left' || this.position === 'right' ? 'horizontal' : 'vertical'}" />
		`)

		cursorMask.appendTo(document.body)

		DOMEvents.on(document, 'mousemove', onMouseMove as (e: Event) => void)
		DOMEvents.once(document, 'mouseup', onMouseUp)
	}

	protected resize(this: Resizer, startParentWidth: number, startParentHeight: number, movementX: number, movementY: number) {
		let value: number

		if (this.position === 'top' || this.position === 'bottom') {
			let flag = this.position === 'bottom' ? 1 : -1

			value = startParentHeight + flag * movementY * this.rate
			value = NumberUtils.clamp(value, this.min, this.max)
			this.el.parentElement!.style.height = value + 'px'
		}
		else {
			let flag = this.position === 'right' ? 1 : -1

			value = startParentWidth + flag * movementX * this.rate
			value = NumberUtils.clamp(value, this.min, this.max)
			this.el.parentElement!.style.width = value + 'px'
		}

		this.size = value
		this.fire('change', this.size)
	}
}