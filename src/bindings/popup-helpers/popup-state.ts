import {Timeout} from '@pucelle/ff'
import {EventFirer} from '@pucelle/lupos'


interface PopupStateEvents {
	'do-show': () => void
	'do-hide': () => void
}


/** 
 * Manages popup state for a popup-binding.
 * Popup state is complex, so have a class for it.
 */
export class PopupState extends EventFirer<PopupStateEvents> {

	/** Be `true` after opened popup. */
	opened: boolean = false

	/** When decided to open popup. */
	private willShowSoon: boolean = false

	/** When decided to hide popup. */
	private willHideSoon: boolean = false

	/** Be a `Timeout` after decided to open popup but not yet. */
	private showTimeout: Timeout | null = null

	/** Be a `Timeout` after decided to close popup but not yet. */
	private hideTimeout: Timeout | null = null

	/** Whether will open and will not hide. */
	isOpenAndWillNotHide() {
		return this.opened && !this.willHideSoon
	}

	/** 
	 * Send a request to show popup after a few milliseconds delay.
	 * Returns whether the request truly sent.
	 */
	willShow(showDelay: number): boolean {
		this.willNotHide()

		if (this.opened || this.willShowSoon) {
			return false
		}

		this.showTimeout = new Timeout(() => {
			this.showTimeout = null
			this.show()
		}, showDelay)

		this.showTimeout.start()
		this.willShowSoon = true

		return true
	}

	/** Cancels `will-show`. */
	willNotShow() {
		this.showTimeout?.cancel()
		this.willShowSoon = false
	}

	/** 
	 * Send a request to hide popup after a few milliseconds delay.
	 * Returns whether the request truly sent.
	 */
	willHide(hideDelay: number): boolean {
		this.willNotShow()

		if (!this.opened || this.willHideSoon) {
			return false
		}

		// Even 0, will start a timeout,
		// Or hide immediately by mousedown will cause click event not handing.
		this.hideTimeout = new Timeout(() => {
			this.hide()
		}, hideDelay)

		this.hideTimeout.start()
		this.willHideSoon = true

		return true
	}

	/** Cancels `will hide`. */
	willNotHide() {
		this.hideTimeout?.cancel()
		this.hideTimeout = null
		this.willHideSoon = false
	}

	/** Send a request to show immediately. */
	show() {
		this.willNotShow()
		this.willNotHide()

		if (!this.opened) {
			this.opened = true
			this.fire('do-show')
		}
	}

	/** Send a request to hide immediately. */
	hide() {
		this.willNotShow()
		this.willNotHide()

		if (this.opened) {
			this.opened = false
			this.fire('do-hide')
		}
	}
}