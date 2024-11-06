import {effect, WebTransition} from '@pucelle/ff'
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

	/** Apply loading property. */
	@effect
	protected applyLoading() {
		if (this.loading) {
			this.play()
		}
	}

	private play() {
		new WebTransition(this.el, {
			duration: this.duration,
			easing: 'linear',
		})
		.playBetween(
			{transform: `rotate(0)`},
			{transform: `rotate(360deg)`},
		)
		.then(() => {
			if (this.loading) {
				this.play()
			}
		})
	}
}