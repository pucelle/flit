import {Component, html, css} from '@pucelle/lupos.js'
import {NumberUtils} from '@pucelle/ff'
import {DOMEvents} from '@pucelle/lupos'
import {tooltip, TooltipOptions} from '../bindings'


interface SliderEvents {

	/** Triggers after user slide and make slider value changed. */
	change: (value: number) => void

	/** Triggers when user begin to drag slider thumbnail. */
	dragstart: () => void

	/** Triggers when user stop to drag slider thumbnail. */
	dragend: () => void
}


/** `<Slider>` provides a range selection control that allows value selection through drag interaction. */
export class Slider<E = {}> extends Component<E & SliderEvents> {

	static override style = css`
		.slider{
			--groove-size: 1px;
			--ball-size: 15px;

			display: inline-flex;
			vertical-align: top;
			flex-direction: column;
			justify-content: center;
			position: relative;
			width: 15em;
			height: 2em;
			cursor: pointer;

			&:focus .slider-ball{
				box-shadow: 0 0 var(--focus-shadow-blur-radius) var(--primary-color);
				border-color: var(--primary-color);
			}
		}

		.slider-groove{
			position: relative;
		}

		.slider-groove-bg{
			position: absolute;
			left: 0;
			top: 0;
			width: 100%;
			height: 100%;
			background: var(--border-color);
		}
	
		.slider-progress{
			position: absolute;
			height: 1px;
			background: var(--primary-color);
		}
	
		.slider-ball{
			position: absolute;
			will-change: top, left;
			border-radius: 50%;
			border: var(--groove-size) solid var(--border-color);
			background: var(--background-color);
			float: right;
			width: var(--ball-size);
			height: var(--ball-size);

			&:hover{
				border-color: var(--primary-color);
			}
		}

		.slider.dragging{
			.slider-ball{
				border-color: color-mix(in srgb, var(--primary-color) 90%, black);
				background: color-mix(in srgb, var(--primary-color) 90%, black);
			}
		}

		.slider-horizontal{
			.slider-groove{
				height: var(--groove-size);
			}

			.slider-progress{
				height: 100%;
			}

			.slider-ball{
				top: calc((var(--ball-size) - var(--groove-size)) / -2);
				margin-left: calc(var(--ball-size) / -2);
			}
		}

		.slider-vertical{
			width: 2em;
			height: 15em;
			flex-direction: row;

			.slider-groove{
				width: var(--groove-size);
			}

			.slider-progress{
				width: 100%;
			}

			.slider-ball{
				left: calc((var(--ball-size) - var(--groove-size)) / -2);
				margin-top: calc(var(--ball-size) / -2);
			}
		}

		.slider-tooltip{
			font-family: "Roboto Mono";
		}
	`


	/** Groove size, default value is `1`. */
	grooveSize: number = 1

	/** Ball size, default value is `15`. */
	ballSize: number = 15

	/** Whether in vertical mode. Default value is `false` */
	vertical: boolean = false

	/** Minimum value. Default value is `0`. */
	min: number = 0

	/** Maximum value. Default value is `100`. */
	max: number = 100

	/** Value step when increasing or decreasing. Default value is `1`. */
	step: number = 1

	/** Current value. Default value is `0`. */
	value: number = 0

	/** 
	 * Fixed decimal count of progress text.
	 * E.g., when `2`, value `1` shown on tooltip as `1.00`.
	 * Default value is `null`.
	 */
	decimalCount: number | null = null

	protected grooveEl!: HTMLDivElement

	/** Whether in dragging ball. */
	protected dragging: boolean = false

	protected override render() {
		let tooltipOptions: Partial<TooltipOptions> = {
			position: this.vertical ? 'r' : 't',
			alignTo: '.slider-ball',
			gaps: 4,
			keepVisible: this.dragging,
		}

		return html`
			<template tabindex="0"
				class="slider"
				:class=${this.vertical ? 'slider-vertical' : 'slider-horizontal'}
				:class.dragging=${this.dragging}
				:style.--ball-size.px=${this.ballSize}
				:style.--groove-size.px=${this.grooveSize}
				:tooltip=${this.renderTooltipContent, tooltipOptions}
				@mousedown=${this.onMouseDown}
				@focus=${this.onFocus}
				@blur=${this.onBlur}
			>
				${this.vertical ? this.renderVerticalGroove() : this.renderHorizontalGroove()}
			</template>
		`
	}

	protected renderGroove() {
		if (this.vertical) {
			return this.renderVerticalGroove()
		}
		else {
			return this.renderHorizontalGroove()
		}
	}

	protected renderHorizontalGroove() {
		let percentage = this.getPercentage()

		return html`
			<div class="slider-groove"
				:ref=${this.grooveEl}
			>
				<div class="slider-groove-bg" />
				<div class="slider-progress"
					:style.width.percent=${percentage}
				/>
				<div class="slider-ball"
					:style.left.percent=${percentage}
				/>
			</div>
		`
	}

	protected renderVerticalGroove() {
		let percentage = this.getPercentage()

		return html`
			<div class="slider-groove"
				:style.width.px=${this.grooveSize}
				:ref=${this.grooveEl}
			>
				<div class="slider-groove-bg" />
				<div class="slider-progress"
					:style.height.percent=${100 - percentage}
				/>
				<div class="slider-ball"
					:style.top.percent=${100 - percentage}
				/>
			</div>
		`
	}

	protected renderTooltipContent() {
		let decimalCount = this.decimalCount
		if (decimalCount === null) {
			decimalCount = String(this.step).replace(/^\d+\.?/, '').length
		}

		let tipText = this.value.toFixed(decimalCount)
		
		return html`<span class="slider-tooltip">${tipText}</span>`
	}

	protected getPercentage(): number {
		if (this.value === this.min) {
			return 0
		}
		
		let percentage = (this.value - this.min) / (this.max - this.min) * 100
		return NumberUtils.clamp(percentage, 0, 100)
	}

	protected onMouseDown(this: Slider, e: MouseEvent) {
		let rect = this.grooveEl.getBoundingClientRect()

		this.dragging = true

		// If clicked the ball, not move; only move when clicked the groove.
		if (!(e.target as Element).matches('.slider-ball')) {
			this.changeValueByEvent(e, rect)
		}

		let onMouseMove = (e: MouseEvent) => {
			// Disable selecting text unexpectedly, and make sure ball not lose focus.
			e.preventDefault()
			this.changeValueByEvent(e, rect)
		}

		DOMEvents.on(document, 'mousemove', onMouseMove as (e: Event) => void)

		DOMEvents.once(document, 'mouseup', () => {
			DOMEvents.off(document, 'mousemove', onMouseMove as (e: Event) => void)

			this.dragging = false
			this.fire('dragend')
		})

		this.fire('dragstart')
	}

	protected changeValueByEvent(this: Slider, e: MouseEvent, rect: DOMRect) {
		let rate

		if (this.vertical) {
			rate = NumberUtils.clamp(1 - (e.clientY - rect.top) / rect.height, 0, 1)
		}
		else {
			rate = NumberUtils.clamp((e.clientX - rect.left) / rect.width, 0, 1)
		}

		let diff = (this.max - this.min) * rate

		if (this.step) {
			diff = Math.round(diff / this.step) * this.step
		}

		let oldValue = this.value
		let newValue = NumberUtils.toDecimal(this.min + diff, 4)

		if (newValue !== oldValue) {
			this.fire('change', this.value = newValue)
		}
	}

	protected onWheel(this: Slider, e: WheelEvent) {
		if (!this.step || document.activeElement !== this.el) {
			return
		}

		let newValue

		// deltaY < 0 when wheel up
		if (e.deltaY < 0 && this.vertical || e.deltaY > 0 && !this.vertical) {
			newValue = NumberUtils.toDecimal(Math.min(this.value + this.step, this.max), 4)
		}
		else {
			newValue = NumberUtils.toDecimal(Math.max(this.value - this.step, this.min), 4)
		}

		if (newValue !== this.value) {
			this.fire('change', this.value = newValue)
		}
	}

	protected onFocus() {
		this.onBlur()
		
		DOMEvents.on(document, 'keydown', this.onKeyDown as (e: Event) => void, this)
		DOMEvents.on(document, 'wheel', this.onWheel as (e: Event) => void, this, {passive: true})
	}

	protected onKeyDown(this: Slider, e: KeyboardEvent) {
		let newValue

		if (this.vertical) {
			if (e.key === 'ArrowUp') {
				e.preventDefault()
				newValue = Math.min(this.value + this.step, this.max)
			}
			else if (e.key === 'ArrowDown') {
				e.preventDefault()
				newValue = Math.max(this.value - this.step, this.min)
			}
		}
		else {
			if (e.key === 'ArrowLeft') {
				e.preventDefault()
				newValue = Math.max(this.value - this.step, this.min)
			}
			else if (e.key === 'ArrowRight') {
				e.preventDefault()
				newValue = Math.min(this.value + this.step, this.max)
			}
		}
		
		if (e.key === 'Escape') {
			e.preventDefault()
			this.el.blur()
		}
		
		if (newValue !== undefined && newValue !== this.value) {
			this.fire('change', this.value = newValue)
		}
	}

	protected onBlur() {
		DOMEvents.off(document, 'keydown', this.onKeyDown as (e: Event) => void, this)
		DOMEvents.off(document, 'wheel', this.onWheel as (e: Event) => void, this)
	}
}
