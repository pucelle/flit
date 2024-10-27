import {fade, ObjectUtils, TransitionResult, untilUpdateComplete} from '@pucelle/ff'
import {Binding, render, html, Part, PartCallbackParameterMask} from '@pucelle/lupos.js'
import {Loader} from '../components'


export interface LoadingOptions {

	/** Loader size, default value is `18`. */
	size: number

	/** Loader stroke size, default value is `3`. */
	strokeSize: number

	/** How many round per second. */
	speed: number

	/** Transition for loader element. */
	transition: TransitionResult | undefined
}


const DefaultLoadingOptions: LoadingOptions = {
	size: 18,
	strokeSize: 3,
	speed: 0.6,
	transition: fade(),
}


/** 
 * A `:loading` binding will show a `<Loader>` and cover current element when value is true like.
 * Note element to apply `:loading` should not be `static` position.
 * 
 * `:loading=${isLoading}`
 */
export class loading implements Binding, Part {

	readonly el: Element

	protected options: LoadingOptions = DefaultLoadingOptions
	protected value: boolean = false
	protected loader: Loader | null = null

	constructor(el: Element) {
		this.el = el
	}

	async afterConnectCallback(_param: PartCallbackParameterMask | 0) {
		if (this.value && !this.loader) {
			this.loader = await this.renderLoader()
			this.loader.appendTo(this.el)
		}
	}

	beforeDisconnectCallback(param: PartCallbackParameterMask | 0): Promise<void> | void {
		if (this.loader) {
			if (param & PartCallbackParameterMask.MoveImmediately) {
				this.loader.remove()
				this.loader = null
			}
			else {
				return this.loader.remove(true)!.then(() => {
					this.loader = null
				})
			}
		}
	}

	async update(value: any, options: Partial<LoadingOptions> = {}) {
		value = Boolean(value)

		if (value === this.value) {
			return
		}

		this.value = value
		this.options = ObjectUtils.assignNonExisted(options, DefaultLoadingOptions)

		if (this.value) {
			if (!this.loader) {
				this.loader = await this.renderLoader()
				this.loader.appendTo(this.el)
			}
		}
		else {
			if (this.loader) {
				this.loader.remove(true)
				this.loader = null
			}
		}
	}

	private async renderLoader() {
		let loaderRendered = render(html`
			<Loader
				.size=${this.options.size}
				.strokeSize=${this.options.strokeSize}
				.speed=${this.options.speed}
				.asCover
				?:transition=${this.options.transition, this.options.transition!}
			/>
		`)

		loaderRendered.connectManually()

		await untilUpdateComplete()

		let loader = Loader.from(loaderRendered.el.firstElementChild!)!
		return loader
	}
}