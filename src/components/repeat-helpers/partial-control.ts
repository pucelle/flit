import {PartialRenderer} from './partial-renderer'


/** To avoid one scroller reset scroll position by several renderers. */
const PartialControlMap: Map<HTMLElement, PartialRenderer> = /*#__PURE__*/new Map()


export function takeControl(renderer: PartialRenderer) {
	PartialControlMap.set(renderer.scroller, renderer)
}


/** Take control if scroller is not in control. */
export function tryTakeControl(renderer: PartialRenderer) {
	if (!PartialControlMap.has(renderer.scroller)) {
		takeControl(renderer)
	}
}


export function inControl(renderer: PartialRenderer) {
	return PartialControlMap.get(renderer.scroller) === renderer
}


export function loseControl(renderer: PartialRenderer) {
	if (inControl(renderer)) {
		PartialControlMap.delete(renderer.scroller)
	}
}