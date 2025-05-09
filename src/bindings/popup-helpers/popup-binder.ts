import {DOMEvents, EventFirer, MouseLeaveControl} from '@pucelle/ff'


/** 
 * Different trigger action types.
 * `none` means can only be triggered manually.
 */
export type TriggerType = 'hover' | 'click' | 'mousedown' | 'focus' | 'contextmenu' | 'none'

interface PopupTriggerEvents {

	/** Like mouse enter, and need to show soon. */
	'will-show': () => void

	/** Like mouse leave, and need to hide soon. */
	'will-hide': () => void

	/** Like will show soon, but mouse leave to cancel it. */
	'cancel-show': () => void

	/** Like trigger element become out-view, and need to hide immediately. */
	'immediate-hide': () => void

	/** Toggle opened state and show or hide popup immediately. */
	'toggle-show-hide': () => void
}


enum BoundMask {
	Enter = 1,
	Leave = 2,
	LeaveBeforeShow = 4,
}


/** Helps to bind popup events. */
export class PopupTriggerBinder extends EventFirer<PopupTriggerEvents> {

	trigger: TriggerType = 'hover'

	private matchSelector: string | undefined = undefined
	private el: Element
	private content: Element | null = null
	private unwatchLeave: null | (() => void) = null
	private bound: BoundMask | 0 = 0
	private latestTriggerEvent: MouseEvent | null = null

	constructor(el: Element) {
		super()
		this.el = el	
	}

	/** Get trigger event to align with it. */
	getLatestTriggerEvent() {
		return this.latestTriggerEvent
	}

	/** Must re-bind after change to a different trigger type. */
	setTriggerType(trigger: TriggerType) {
		trigger = this.mapTriggerType(trigger)

		if (this.trigger !== trigger) {
			this.clear()
			this.trigger = trigger
		}
	}

	/** If specified, only when element match this selector then triggers action. */
	setMatchSelector(matchSelector: string | undefined) {
		this.matchSelector = matchSelector
	}

	private mapTriggerType(trigger: TriggerType): TriggerType {

		// If has no mouse, uses click event instead.
		if (trigger === 'hover' && !DOMEvents.havePointer()) {
			trigger = 'mousedown'
		}

		return trigger
	}

	/** Bind enter events if haven't bound. */
	bindEnter() {
		if (this.bound & BoundMask.Enter) {
			return
		}

		if (this.trigger === 'click' || this.trigger === 'mousedown' || this.trigger === 'contextmenu') {
			DOMEvents.on(this.el, this.trigger, this.triggerWithoutDelay, this)
		}
		else if (this.trigger === 'hover') {
			DOMEvents.on(this.el, 'mouseenter', this.triggerWithDelay, this)
		}
		else if (this.trigger === 'focus') {
			DOMEvents.on(this.el, 'focus', this.triggerWithDelay, this)

			if (this.el.contains(document.activeElement)) {
				this.fire('will-show')
			}
		}

		this.bound |= BoundMask.Enter
	}

	/** Unbind enter events if bound. */
	unbindEnter() {
		if ((this.bound & BoundMask.Enter) === 0) {
			return
		}

		if (this.trigger === 'click' || this.trigger === 'mousedown' || this.trigger === 'contextmenu') {
			DOMEvents.off(this.el, this.trigger, this.triggerWithoutDelay, this)
		}
		else if (this.trigger === 'hover') {
			DOMEvents.off(this.el, 'mouseenter', this.triggerWithDelay, this)
		}
		else if (this.trigger === 'focus') {
			DOMEvents.off(this.el, 'focus', this.triggerWithDelay, this)
		}

		this.bound &= ~BoundMask.Enter
	}

	private triggerWithoutDelay(e: Event) {
		let target = e.target as HTMLElement
		if (this.matchSelector && !target.closest(this.matchSelector)) {
			return
		}

		e.preventDefault()
		e.stopPropagation()
		this.latestTriggerEvent = e as MouseEvent
		this.toggleShowHide()
	}

	private triggerWithDelay(e: Event) {
		let target = e.target as HTMLElement
		if (this.matchSelector && !target.closest(this.matchSelector)) {
			return
		}
		
		e.stopPropagation()
		this.latestTriggerEvent = e as MouseEvent
		this.fire('will-show')
	}

	/** Toggle opened state and show or hide popup immediately. */
	private toggleShowHide() {
		this.fire('toggle-show-hide')
	}

	/** Bind events to handle canceling show before popup showed. */
	bindLeaveBeforeShow() {
		if (this.bound & BoundMask.LeaveBeforeShow) {
			return
		}

		if (this.trigger === 'hover') {
			DOMEvents.once(this.el, 'mouseleave', this.cancelShowPopup, this)
		}

		this.bound |= BoundMask.LeaveBeforeShow
	}

	/** Unbind events to handle leaving trigger element before popup showing if bound. */
	unbindLeaveBeforeShow() {
		if ((this.bound & BoundMask.LeaveBeforeShow) === 0) {
			return
		}

		if (this.trigger === 'hover') {
			DOMEvents.off(this.el, 'mouseleave', this.cancelShowPopup, this)
		}

		this.bound &= ~BoundMask.LeaveBeforeShow
	}

	/** Like will show soon, but mouse leave to cancel it. */
	private cancelShowPopup() {
		this.fire('cancel-show')
	}

	/** Bind events to hide popup content if haven't bound. */
	bindLeave(hideDelay: number, content: Element) {
		this.unbindLeaveBeforeShow()
		this.content = content

		if (this.bound & BoundMask.Leave) {
			return
		}

		if (this.trigger === 'hover') {
			if (DOMEvents.havePointer()) {
				this.bindMouseLeave(hideDelay, content)
			}
			else {
				DOMEvents.on(document, 'touchstart', this.onDocMouseDownOrTouch, this)
			}
		}
		else if (this.trigger === 'click' || this.trigger === 'contextmenu') {
			DOMEvents.on(document, 'mousedown', this.onDocMouseDownOrTouch, this)
			DOMEvents.on(document, 'wheel', this.onDocMouseWheel, this)
			MouseLeaveControl.lock(this.el)
		}
		else if (this.trigger === 'focus') {
			DOMEvents.on(this.el, 'blur', this.hidePopupLater, this)
		}

		this.bound |= BoundMask.Leave
	}

	/** Bind events to hide popup element after mouse leave both trigger and popup element. */
	protected bindMouseLeave(hideDelay: number, popupEl: Element) {
		this.unwatchLeave = MouseLeaveControl.on(this.el, popupEl,
			() => {
				this.fire('immediate-hide')
			},
			{
				delay: hideDelay,
				mouseIn: true,
			}
		)
	}

	/** Trigger when mouse down on document, and not inside `el` or popup. */
	private onDocMouseDownOrTouch(e: Event) {
		let target = e.target as Element
		
		if (!this.content || !this.content.contains(target)) {
			this.fire('will-hide')
		}
	}

	/** 
	 * When mouse wheel outside of target, will also hide popup.
	 * Especially for `contextmenu` event.
	 */
	private onDocMouseWheel(e: WheelEvent) {
		let target = e.target as Element

		if (!this.content?.contains(target)) {
			this.fire('will-hide')
		}
	}

	private hidePopupLater() {
		this.fire('will-hide')
	}

	/** Unbind events to hide popup if bound. */
	unbindLeave() {
		if ((this.bound & BoundMask.Leave) === 0) {
			return
		}

		if (this.trigger === 'hover') {
			if (DOMEvents.havePointer()) {
				if (this.unwatchLeave) {
					this.unwatchLeave()
					this.unwatchLeave = null
				}
			}
			else {
				DOMEvents.off(document, 'touchstart', this.onDocMouseDownOrTouch, this)
			}
		}
		else if (this.trigger === 'click' || this.trigger === 'contextmenu') {
			DOMEvents.off(document, 'mousedown', this.onDocMouseDownOrTouch, this)
			DOMEvents.off(document, 'wheel', this.onDocMouseWheel, this)
			MouseLeaveControl.unlock(this.el)
		}
		else if (this.trigger === 'focus') {
			DOMEvents.off(this.el, 'blur', this.hidePopupLater, this)
		}

		this.bound &= ~BoundMask.Leave
	}

	/** Clear all bound. */
	clear() {
		this.unbindEnter()
		this.unbindLeave()
		this.unbindLeaveBeforeShow()
		this.content = null
	}
}