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


class SVGIcons {

	/** Map of `id -> code`. */
	private readonly map: Map<string, string> = new Map()

	/** Get all icon ids. */
	get allIds(): string[] {
		return [...this.map.keys()]
	}

	/** Add imported icon items. */
	add(items: Record<string, string>) {
		for (let [id, code] of Object.entries(items)) {
			this.map.set(id, code)
		}
	}
	
	/** Get svg icon code by id. */
	get(id: string): string {
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

icons.add({
	'checkbox-checked': checkboxChecked,
	'checkbox-indeterminate': checkboxIndeterminate,
	'checkbox-unchecked': checkboxUnchecked,
	'checked': checked,
	'close': close,
	'confirm': confirm,
	'down': down,
	'error': error,
	'info': info,
	'love': love,
	'order-asc': orderAsc,
	'order-default': orderDefault,
	'order-desc': orderDesc,
	'radio-checked': radioChecked,
	'radio-unchecked': radioUnchecked,
	'right': right,
	'search': search,
	'success': success,
	'tips': tips,
	'triangle-down': triangleDown,
	'triangle-right': triangleRight,
	'warning': warning,
	'refresh': refresh,
})