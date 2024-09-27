import {DOMEvents, EventFirer, MouseLeaveControl} from '@pucelle/ff'


/** 
 * Different trigger action types.
 * `none` means can only be triggered manually.
 */
export type TriggerType = 'hover' | 'click' | 'focus' | 'contextmenu' | 'none'

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


/** Helps to bind popup events. */
export class PopupTriggerBinder extends EventFirer<PopupTriggerEvents> {

	trigger: TriggerType = 'hover'

	private el: Element
	private popupEl: Element | null = null
	private unwatchLeave: null | (() => void) = null

	constructor(el: Element) {
		super()
		this.el = el	
	}

	setTriggerType(trigger: TriggerType) {
		this.trigger = this.mapTriggerType(trigger)
	}

	private mapTriggerType(trigger: TriggerType): TriggerType {

		// If has no mouse, uses click event instead.
		if (trigger === 'hover' && !DOMEvents.havePointer()) {
			trigger = 'click'
		}

		return trigger
	}

	bindEnter() {
		if (this.trigger === 'click') {
			DOMEvents.on(this.el, this.trigger, this.onClickEl, this)
		}
		else if (this.trigger === 'contextmenu') {
			DOMEvents.on(this.el, this.trigger, this.onContextMenu, this)
		}
		else if (this.trigger === 'hover') {
			DOMEvents.on(this.el, 'mouseenter', this.onMouseEnterOrFocusEl, this)
		}
		else if (this.trigger === 'focus') {
			DOMEvents.on(this.el, 'focus', this.onMouseEnterOrFocusEl, this)

			if (this.el.contains(document.activeElement)) {
				this.fire('will-show')
			}
		}
	}

	unbindEnter() {
		if (this.trigger === 'click') {
			DOMEvents.off(this.el, this.trigger, this.onClickEl, this)
		}
		else if (this.trigger === 'contextmenu') {
			DOMEvents.off(this.el, this.trigger, this.onContextMenu, this)
		}
		else if (this.trigger === 'hover') {
			DOMEvents.off(this.el, 'mouseenter', this.onMouseEnterOrFocusEl, this)
		}
		else if (this.trigger === 'focus') {
			DOMEvents.off(this.el, 'focus', this.onMouseEnterOrFocusEl, this)
		}
	}

	private onClickEl(e: Event) {
		e.preventDefault()
		e.stopPropagation()
		this.toggleShowHide()
	}

	private onContextMenu(e: Event) {
		e.preventDefault()
		e.stopPropagation()
		this.toggleShowHide()
	}

	/** Toggle opened state and show or hide popup immediately. */
	private toggleShowHide() {
		this.fire('toggle-show-hide')
	}

	private onMouseEnterOrFocusEl(e: Event) {
		e.stopPropagation()
		this.fire('will-show')
	}

	/** Bind events to handle canceling show before popup showed. */
	bindLeaveBeforeShow() {
		if (this.trigger === 'hover') {
			DOMEvents.once(this.el, 'mouseleave', this.cancelShowPopup, this)
		}
	}

	/** Unbind events to handle leaving trigger element before popup showing. */
	private unbindLeaveBeforeShow() {
		if (this.trigger === 'hover') {
			DOMEvents.off(this.el, 'mouseleave', this.cancelShowPopup, this)
		}
	}

	/** Like will show soon, but mouse leave to cancel it. */
	private cancelShowPopup() {
		this.fire('cancel-show')
	}

	/** Bind events to hide popup element. */
	bindLeave(hideDelay: number, popupEl: Element) {
		this.unbindLeaveBeforeShow()

		this.popupEl = popupEl

		if (this.trigger === 'hover') {
			if (DOMEvents.havePointer()) {
				this.bindMouseLeave(hideDelay, popupEl)
			}
			else {
				DOMEvents.on(document, 'touchstart', this.onDocMouseDownOrTouch, this)
			}
		}
		else if (this.trigger === 'click' || this.trigger === 'contextmenu') {
			DOMEvents.on(document, 'mousedown', this.onDocMouseDownOrTouch, this)
			MouseLeaveControl.lock(this.el)
		}
		else if (this.trigger === 'focus') {
			DOMEvents.on(this.el, 'blur', this.hidePopupLater, this)
		}
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

		if (!this.el.contains(target) && !this.popupEl?.contains(target)) {
			this.fire('will-hide')
		}
	}

	private hidePopupLater() {
		this.fire('will-hide')
	}

	/** Unbind events to hide popup. */
	unbindLeave() {
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
			MouseLeaveControl.unlock(this.el)
		}
		else if (this.trigger === 'focus') {
			DOMEvents.off(this.el, 'blur', this.hidePopupLater, this)
		}
	}
}