///<reference types="@pucelle/webpack-svg-loader" />
import {BoxLike} from '@pucelle/ff'

export {default as IconCheckboxChecked} from '../../icons/checkbox-checked.svg'
export {default as IconCheckboxIndeterminate} from '../../icons/checkbox-indeterminate.svg'
export {default as IconCheckboxUnchecked} from '../../icons/checkbox-unchecked.svg'
export {default as IconChecked} from '../../icons/checked.svg'
export {default as IconClose} from '../../icons/close.svg'
export {default as IconConfirm} from '../../icons/confirm.svg'
export {default as IconDown} from '../../icons/down.svg'
export {default as IconError} from '../../icons/error.svg'
export {default as IconInfo} from '../../icons/info.svg'
export {default as IconLeft} from '../../icons/left.svg'
export {default as IconLove} from '../../icons/love.svg'
export {default as IconOrderAsc} from '../../icons/order-asc.svg'
export {default as IconOrderDefault} from '../../icons/order-default.svg'
export {default as IconOrderDesc} from '../../icons/order-desc.svg'
export {default as IconRadioChecked} from '../../icons/radio-checked.svg'
export {default as IconRadioUnchecked} from '../../icons/radio-unchecked.svg'
export {default as IconRight} from '../../icons/right.svg'
export {default as IconSearch} from '../../icons/search.svg'
export {default as IconSuccess} from '../../icons/success.svg'
export {default as IconTips} from '../../icons/tips.svg'
export {default as IconTriangleDown} from '../../icons/triangle-down.svg'
export {default as IconTriangleRight} from '../../icons/triangle-right.svg'
export {default as IconWarning} from '../../icons/warning.svg'
export {default as IconRefresh} from '../../icons/refresh.svg'
export {default as IconUp} from '../../icons/up.svg'


/** Parse svg code to get view box and svg inner. */
export function parseSVGCode(code: string): {box: BoxLike, inner: string} | null {
	let match = code.match(/<svg[\s\S]+?viewBox=["'](.+?)["'][\s\S]*?>\s*([\s\S]+?)\s*<\/svg>/)
	if (!match) {
		return null
	}

	let numbers = match[1].split(/[\s+]/).map(v => Number(v)) as [number, number, number, number]
	let inner = match[2]

	return {
		box: {
			x: numbers[0],
			y: numbers[1],
			width: numbers[2],
			height: numbers[3],
		},
		inner,
	}
}
