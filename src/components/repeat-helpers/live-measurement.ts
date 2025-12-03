import {ValueListUtils} from 'ff-kit'
import {PartialMeasurement, UnCoveredDirection} from './partial-measurement'
import {barrierDOMReading} from 'lupos'


/**
 * It help to do measurement for LiveRenderer,
 * and cache latest render results for them.
 * And help to assist next time rendering.
 */
export class LiveMeasurement extends PartialMeasurement {

	/** 
	 * If provided, it specifies the suggested end position of each item,
	 * to indicate the base size of each item.
	 * The size has no need to represent real size,
	 * only represents the mutable part would be enough.
	 * Which means: can ignores shared paddings or margins.
	 */
	private preEndPositions: number[] | null = null

	/** Directly set but not read scroller size. */
	setScrollerSize(size: number) {
		this.scrollerSize = size
	}

	/** Set `preEndPositions` before updating. */
	setPreEndPositions(positions: number[] | null) {
		this.preEndPositions = positions
	}

	override calcScrollPosition(index: number, alignAt: 'start' | 'end'): number {
		if (this.preEndPositions) {
			if (alignAt === 'start') {
				let start = index > 0 ? this.preEndPositions[index - 1] : 0
				return start
			}
			else {
				let end = index > 0 ? this.preEndPositions[index - 1] : 0
				return end
			}
		}
		else {
			if (alignAt === 'start') {
				return this.getAverageItemSize() * index
			}
			else {
				return this.getAverageItemSize() * index + this.scrollerSize
			}
		}
	}

	override async calcStartIndexByScrolled(): Promise<number> {
		await barrierDOMReading()

		let scrolled = this.doa.getScrolled(this.scroller)

		if (this.preEndPositions) {
			let startIndex = ValueListUtils.binaryFindInsertIndex(this.preEndPositions, scrolled)
			return startIndex
		}
		else {
			let itemSize = this.getAverageItemSize()
			let startIndex = itemSize > 0 ? Math.floor(scrolled / itemSize) : 0

			return startIndex
		}
	}

	protected override updateSliderProperties(sliderClientSize: number) {

		// offsetTop = top + marginTop, here ignores margin top.
		this.sliderProperties.startOffset = this.doa.getOffset(this.slider, this.scroller)
		this.sliderProperties.endOffset = this.sliderProperties.startOffset + sliderClientSize
	}

	/** Normal limit in 0.5~2. */
	override fixFrontPlaceholderSize(frontSize: number, startIndex: number): number {
		let normalSize = this.getNormalFrontPlaceholderSize(startIndex)
		if (frontSize < normalSize / 2 || frontSize > normalSize * 2) {
			frontSize = normalSize
		}

		return frontSize
	}

	/** Calculate the back placeholder size as the only placeholder. */
	getOnlyPlaceholderSize(dataCount: number): number {
		if (this.preEndPositions) {
			let end = this.preEndPositions.length > 0 ? this.preEndPositions[this.preEndPositions.length - 1] : 0
			return end
		}

		let itemSize = this.getAverageItemSize()

		// Can reuse previous measured end slider position properties.
		if (this.indices.endIndex <= dataCount
			&& this.indices.endIndex > 0
			&& this.sliderProperties.endOffset > 0
		) {
			return this.sliderProperties.endOffset + itemSize * (dataCount - this.indices.endIndex)
		}

		// Can reuse previous measured start slider position properties.
		if (this.indices.startIndex <= dataCount
			&& this.indices.startIndex > 0
			&& this.sliderProperties.startOffset > 0
		) {
			return this.sliderProperties.startOffset + itemSize * (dataCount - this.indices.startIndex)
		}

		return itemSize * dataCount
	}

	/** Use back size property to cache only size. */
	setOnlyPlaceholderSize(size: number) {
		this.placeholderProperties.backSize = size
	}

	override async checkUnCoveredDirection(): Promise<UnCoveredDirection | null> {
		await barrierDOMReading()

		let scrollerSize = this.doa.getClientSize(this.scroller)
		let sliderSize = this.doa.getClientSize(this.slider)
		let scrolled = this.doa.getScrolled(this.scroller)
		let sliderStart = this.sliderProperties.startOffset - scrolled
		let sliderEnd = sliderStart + sliderSize
	
		// No intersection, reset indices by current scroll position.
		let hasNoIntersection = sliderEnd < 0 || sliderStart > scrollerSize
		if (hasNoIntersection) {
			return 'no-intersection'
		}

		// Can't cover and need to render more items at top/left.
		else if (sliderStart - 1 > 0) {
			return 'partial-start'
		}

		// Can't cover and need to render more items at bottom/right.
		else if (sliderEnd + 1 < scrollerSize) {
			return 'partial-end'
		}

		// No need to render more.
		return null
	}
}