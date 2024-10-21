import {Component, html, css} from '@pucelle/lupos.js'
import {theme, ThemeSize} from '../style'
import {Icon} from './icon'


interface TagEvents {

	/** Triggers after closed tag. */
	close: (value: string | number | null) => void
}


/** `<Tag>` used to give a tag label to a kind of items. */
export class Tag<E = {}> extends Component<E & TagEvents> {

	static style() {
		let {borderColor, borderRadius} = theme

		return css`
		.tag{
			display: inline-flex;
			border: 1px solid ${borderColor};
			border-radius: ${borderRadius}px;
			line-height: 1.4;
			padding: 0 0.4em;
			cursor: pointer;

			&:hover{
				opacity: 0.9;
			}

			&:active{
				opacity: 0.8;
			}
		}

		.tag-label{
			font-size: 0.928em;
			flex: 1;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			padding-right: 0.2em;
		}
	
		.tag-close-icon{
			display: inline-flex;
			margin-right: -0.2em;

			&:active{
				transform: translateY(1px);
			}
		}
		`
	}


	size: ThemeSize = 'default'

	/** Unique value to identify current tag. */
	value: string | number | null = null

	/** 
	 * Whether current tag closeable.
	 * Not tag element were not removed automatically,
	 * you must capture close event and update rendered result.
	 */
	closable: boolean = false

	protected render() {
		return html`
		<template class="tag">
			<span class="tag-label"><slot /></span>
			<lu:if ${this.closable}>
				<Icon class="tag-close-icon" .type="close" .size="inherit"
					@click=${this.close}
				/>
			</lu:if>
		</template>
		`
	}

	protected close(this: Tag) {
		this.fire('close', this.value)
	}
}
