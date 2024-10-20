import {ListUtils} from '@pucelle/ff'
import {Component, ComponentStyle, css, html} from '@pucelle/lupos.js'


/** 
 * `<Row>` used to do grid layout, can contain several `<Col>`.
 * If available width changes, count of `<Col>` in one line may be adjusted.
 */
export class Row extends Component {

	static style: ComponentStyle = () => {
		return css`
		.row{
			display: flex;
			flex-wrap: wrap;
		}
		`
	}

	/** Column count in one line. */
	columnCount: number = 24

	/** Column alignment starts from. */
	justify: 'start' | 'end' = 'start'

	/** Gutter betweens columns, in pixels. */
	gutter: number = 0

	/** All columns. */
	readonly cols: Col[] = []

	protected render() {
		return html`
			<template class="row" 
				:style.justify-content="flex-${this.justify}"
			/>
		`
	}

	/** Register child `<f-col>`. */
	register(col: Col) {
		this.cols.push(col)

		col.once('will-disconnect', () => {
			ListUtils.remove(this.cols, col)
		})
	}
	
	/** Get column count on the left of `col`. */
	getLeftColumnCount(col: Col) {
		let {columnCount} = this
		let count = 0

		for (let c of this.cols) {
			if (c === col) {
				break
			}

			let span = Math.min(c.span, columnCount)
			let offset = c.offset % columnCount

			count += span + offset
		}

		return count
	}
}


/** `<Col>` can be contained by a `<Row>` to do grid layout. */
export class Col extends Component {

	/** Column span, default value is  */
	span: number = 1
	offset: number = 0
	row!: Row

	protected onConnected() {
		super.onConnected()

		let row = Row.from(this.el.parentElement!)
		if (!row) {
			throw new Error(`"<Col>" must be included by a "<Row>" as it's child!`)
		}

		row.register(this)
		this.row = row
	}

	protected render() {
		let marginLeft = this.getMarginLeft()
		let width = this.getWidth()

		return html`
			<template class="col"
				:style.margin-left=${marginLeft}
				:style.width=${width}
			/>
		`
	}

	protected getMarginLeft() {
		let leftColCount = this.row.getLeftColumnCount(this)
		let {columnCount, gutter} = this.row
		let offset = this.offset % columnCount
		let isFirstCol = (leftColCount + offset) % columnCount === 0

		if (offset > 0) {
			return (offset / gutter) * 100 + '%'
		}
		else {
			return isFirstCol ? '0' : gutter + 'px'
		}
	}

	protected getWidth() {
		let {gutter, columnCount} = this.row
		let span = Math.min(this.span, columnCount)
		let percent = span / columnCount
		let gutterPXs = gutter * (span - 1 - (columnCount - 1) * percent)

		return `calc(${percent * 100}% - ${-gutterPXs}px)`
	}
}