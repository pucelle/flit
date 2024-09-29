import {defineBinding, Binding, TransitionOptions, Transition, render, html, UpdatableOptions} from '@pucelle/flit'
import {LoaderSize} from '../components/loader'


export interface LoadingOptions {

	/** Loader size, 'small' | 'medium' | 'large'. */
	size?: LoaderSize

	/** Transition when begin to show or hide loading cover. */
	transition?: TransitionOptions
}


const DefaultLoadingOptions: Required<LoadingOptions> = {
	size: 'medium',
	transition: {name: 'fade'},
}


/** 
 * A `:loading` binding will show a loader and cover current element.
 * 
 * `:loading=${isLoading}`
 */
export class LoadingBinging implements Binding<boolean> {

	protected readonly el: Element
	protected readonly options: UpdatableOptions<LoadingOptions> = new UpdatableOptions(DefaultLoadingOptions)

	protected value: boolean = false
	protected cover: HTMLElement | null = null

	constructor(el: Element) {
		this.el = el
	}

	update(value: boolean, options?: LoadingOptions) {
		this.value = value
		this.options.update(options)

		let transition = this.options.get('transition')

		if (this.value) {
			if (this.cover) {
				if (transition) {
					new Transition(this.cover, transition).leave().then(finish => {
						if (finish) {
							this.cover!.remove()
							this.cover = null
						}
					})
				}
				else {
					this.cover!.remove()
					this.cover = null
				}
			}
		}
		else {
			if (!this.cover) {
				this.cover = render(html`<f-loader .size=${this.options.get('size')} .asCover />`).getFirstElement() as HTMLElement
				this.el.append(this.cover)
			}
			
			if (transition) {
				new Transition(this.cover, transition).enter()
			}
		}
	}

	remove() {
		if (this.cover) {
			this.cover.remove()
		}
	}
}

/** 
 * Shows a loader and cover current element.
 * @param value Whether shows loader.
 * @param options Options, `{size: small | medium | large, transition: {...}}`.
 */
export const loading = defineBinding('loading', LoadingBinging) as (value: boolean, options?: LoadingOptions) => void
