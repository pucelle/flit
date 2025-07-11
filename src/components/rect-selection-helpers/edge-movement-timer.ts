import {Box, EventUtils, Vector} from '@pucelle/ff'
import {FrameLoop} from '@pucelle/lupos.js'


export interface EdgeMovementTimerOptions {

	/** 
	 * Especially for touch events, finger may can't strictly touch viewport edge,
	 * so if still have some pixels away from edge, would recognize it as reached.
	 */
	padding: number
}


const DefaultEdgeMovementTimerOptions: EdgeMovementTimerOptions = {
	padding: 1,
}


/** Get periodically callback per animation frame after mouse touches viewport edge. */
export class EdgeMovementTimer {

	/** 
	 * The new movement relative to last time update.
	 * E.g., mouse leaves edge for 100px, and for each 16ms,
	 * receive update movements for 100 and frame time 16.
	 */
	onUpdate!: (movements: Vector, frameTime: number) => void

	/** Rect of `el`. */
	private rect: DOMRect

	/** The options. */
	private options: EdgeMovementTimerOptions

	/** The previous update time. */
	private lastUpdateTime: number = 0

	/** 
	 * Means the accumulated time after latest started multiply direction vector.
	 * Update every time after restarted.
	 */
	private edgeDistanceVector: Vector = new Vector(0, 0)

	/** Callback every animation frame. */
	private frameLoop: FrameLoop

	constructor(el: Element, options: Partial<EdgeMovementTimerOptions> = {}) {
		this.options = {...DefaultEdgeMovementTimerOptions, ...options}
		this.rect = Box.fromLike(el.getBoundingClientRect()).expandSelf(-this.options.padding)
		this.frameLoop = new FrameLoop(this.onAnimationFrame.bind(this))
	}

	/** When being at edge, fire `update` event every animation frame. */
	private onAnimationFrame(timestamp: number) {
		let frameTime = timestamp - this.lastUpdateTime
		this.lastUpdateTime = timestamp

		this.onUpdate(this.edgeDistanceVector, frameTime)
	}

	/** On mouse move, update event. */
	updateEvent(e: MouseEvent) {
		let rect = this.rect
		let vector = new Vector(0, 0)
		let screenPosition = EventUtils.getClientPosition(e)!

		if (screenPosition.x < rect.x) {
			vector.x = screenPosition.x - rect.x
		}
		else if (screenPosition.x > rect.right) {
			vector.x = screenPosition.x - rect.right
		}

		if (screenPosition.y < rect.y) {
			vector.y = screenPosition.y - rect.y
		}
		else if (screenPosition.y > rect.bottom) {
			vector.y = screenPosition.y - rect.bottom
		}

		this.edgeDistanceVector = vector
		this.updateFrameLoop(vector)
	}

	/** Update frame state. */
	private updateFrameLoop(vector: Vector) {
		if (vector.getLength() > 0) {
			if (!this.frameLoop.running) {
				this.lastUpdateTime = 0
				this.frameLoop.start()
			}
		}
		else {
			if (this.frameLoop.running) {
				this.frameLoop.cancel()
			}
		}
	}

	/** End timer. */
	end() {
		this.frameLoop.cancel()
	}
}