///<reference types="@pucelle/webpack-svg-loader" />
import checkboxChecked from '../../assets/icons/checkbox-checked.svg'
import checkboxIndeterminate from '../../assets/icons/checkbox-indeterminate.svg'
import checkboxUnchecked from '../../assets/icons/checkbox-unchecked.svg'
import checked from '../../assets/icons/checked.svg'
import close from '../../assets/icons/close.svg'
import confirm from '../../assets/icons/confirm.svg'
import down from '../../assets/icons/down.svg'
import error from '../../assets/icons/error.svg'
import info from '../../assets/icons/info.svg'
import love from '../../assets/icons/love.svg'
import orderAsc from '../../assets/icons/order-asc.svg'
import orderDefault from '../../assets/icons/order-default.svg'
import orderDesc from '../../assets/icons/order-desc.svg'
import radioChecked from '../../assets/icons/radio-checked.svg'
import radioUnchecked from '../../assets/icons/radio-unchecked.svg'
import right from '../../assets/icons/right.svg'
import search from '../../assets/icons/search.svg'
import success from '../../assets/icons/success.svg'
import tips from '../../assets/icons/tips.svg'
import triangleDown from '../../assets/icons/triangle-down.svg'
import triangleRight from '../../assets/icons/triangle-right.svg'
import warning from '../../assets/icons/warning.svg'
import refresh from '../../assets/icons/refresh.svg'


interface IconItem {
	id: string
	viewBox?: [number, number, number, number]
	code: string
}


class SVGIcons {

	/** Map of `id -> code`. */
	private readonly map: Map<string, IconItem> = new Map()

	/** Get all icon ids. */
	get allIds(): string[] {
		return [...this.map.keys()]
	}

	/** Add imported icon items. */
	add(...items: IconItem[]) {
		for (let item of items) {
			this.map.set(item.id, item)
		}
	}
	
	/** Get svg icon code by id. */
	get(id: string): IconItem {
		return this.map.get(id)!
	}

	/** Delete svg icon by id. */
	delete(id: string) {
		this.map.delete(id)
	}

	/** Clear all icons. */
	clear() {
		this.map.clear()
	}
}

/** 
 * Global icon manager to provide icon data for `<Icon />`.
 * You may append more icons by `icons.add({...})`.
 */
export const icons = new SVGIcons()

icons.add(
	checkboxChecked,
	checkboxIndeterminate,
	checkboxUnchecked,
	checked,
	close,
	confirm,
	down,
	error,
	info,
	love,
	orderAsc,
	orderDefault,
	orderDesc,
	radioChecked,
	radioUnchecked,
	right,
	search,
	success,
	tips,
	triangleDown,
	triangleRight,
	warning,
	refresh,
)