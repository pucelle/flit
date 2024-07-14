import {Binding, defineBinding} from '../../lupos.js/src/bindings/define'


/** Caches global loaded URLs. */
const SrcLoadedURLs: Set<string> = new Set()


/**
 * `:src` binding will update the `src` property of media element after this resource is fully loaded.
 * - `:src=${URL}`
 * 
 * You may set `src="..."` for thumbnail, and `:src="..."` for full size.
 * 
 * Note after reuse an `<image>` and reset it's src, it will keep old image until the new one loaded.
 * Use `<keyed ${url}>` can avoid this.
 */
export class SrcBinding implements Binding {

	private readonly el: HTMLMediaElement

	/** Current resource location. */
	private value: string = ''

	constructor(el: Element) {
		this.el = el as HTMLMediaElement
	}

	update(value: string) {
		this.value = value

		if (SrcLoadedURLs.has(value)) {
			this.el.src = value
			return
		}

		this.el.src = ''

		if (value) {
			let img = new Image()

			img.onload = () => {
				SrcLoadedURLs.add(value)

				// Must re validate it, or src may be wrongly updated.
				if (value === this.value) {
					this.el.src = value
				}
			}

			img.src = value
		}
	}

	remove() {}
}

export const src = defineBinding(SrcBinding)