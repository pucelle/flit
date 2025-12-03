import {LiveRenderer} from './repeat-helpers/live-renderer'
import {effect} from 'lupos'
import {PartialRepeat} from './partial-repeat'


/** 
 * `<LiveRepeat>` dynamically renders visible portions of data in list format.
 * 
 * Compared to `<Repeat>`, `<LiveRepeat>` renders only visible data items and
 * dynamically updates them during user scrolling.
 * 
 * Compared to `<PartialRepeat>`, `<LiveRepeat>` is more efficient but
 * requires it's the only content of whole scroller.
 * 
 * Some restrictions you need to know:
 * - `<LiveRepeat>` must be contained in a scroller element with `overflow: auto / scroll`.
 * - `<LiveRepeat>` must be the only child of the scroller element.
 * - `<LiveRepeat>` must in `absolute` position.
 * - `<LiveRepeat>` must have no margin, but can have padding set.
 * - The scroller element must not in `static` position.
 */
export class LiveRepeat<T = any, E = {}> extends PartialRepeat<T, E> {

	/** Partial content renderer. */
	declare protected renderer: LiveRenderer | null


	/** 
	 * Whether partial rendering content as follower,
	 * so the partial renderer only renders by current scroll position,
	 * and will never cause scroll position change.
	 * Normally can use it at secondary columns of waterfall layout.
	 */
	readonly asFollower: boolean = false

	/** 
	 * If provided, it specifies the suggested end position,
	 * to indicate the size of each item.
	 * The size has no need to represent real size,
	 * only represents the mutable part would be enough.
	 * Which means: can ignores shared paddings or margins.
	 */
	preEndPositions: number[] | null = null

	/** If provided and not 0, will use it and partial renderer has no need to read scroller size. */
	scrollSize: number = 0

	/** Apply `scrollSize` property to renderer. */
	@effect
	protected applyScrollSize() {
		this.renderer!.setDirectScrollSize(this.scrollSize)
	}

	/** Apply `preEndPositions` to renderer. */
	@effect
	protected applyPreEndPositions() {
		this.renderer!.setPreEndPositions(this.preEndPositions)
	}

	protected override initPlaceholders() {
		if (this.asFollower) {
			return
		}

		if (this.backPlaceholder) {
			return
		}

		this.backPlaceholder = document.createElement('div')
		this.backPlaceholder.style.cssText = 'position: absolute; left: 0; top: 0; width: 1px; visibility: hidden;'
		this.scroller!.prepend(this.backPlaceholder)
	}

	/** Init renderer when connected. */
	protected override initRenderer() {
		if (this.renderer) {
			return
		}

		let scroller = this.scroller
		let slider = this.el

		while (slider.parentElement !== scroller) {
			slider = slider.parentElement!
		}

		this.renderer = new LiveRenderer(
			this.scroller!,
			slider,
			this.el,
			this,
			this.backPlaceholder,
			this.asFollower,
			this.doa,
			this.updateLiveData.bind(this)
		)
	}
}
