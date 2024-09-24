import {immediateWatch, WebTransition} from '@pucelle/ff'
import {Icon} from './icon'


/** 
 * `<IconLoading>` will show a loading type of svg icon,
 * and make it keep rotation when it's `loading` state is `true`.
 */
export class IconLoading extends Icon {

	/** Loading icon type. Default value is `refresh`. */
	type: string = 'refresh'

	/** Whether in loading state. */
	loading: boolean = false

	/** Each rotation duration, in milliseconds. */
	duration: number = 1000

	/** After loading property change. */
	@immediateWatch('loading')
	protected onLoadingChange(loading: boolean) {
		if (loading) {
			this.play()
		}
	}

	private play() {
		WebTransition.playBetween(
			this.el,
			{transform: `rotate(0)`},
			{transform: `rotate(360deg)`},
			this.duration,
			'linear'
		)
		.then(() => {
			if (this.loading) {
				this.play()
			}
		})
	}
}