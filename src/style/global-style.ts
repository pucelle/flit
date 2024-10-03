import {addGlobalStyle, css} from '@pucelle/lupos.js'
import {theme} from './theme'


addGlobalStyle(() => {
	let {textColor, fontSize, lineHeight, backgroundColor} = theme

	return css`
	html{
		color: ${textColor};
		font-size: ${fontSize}px;
		line-height: ${lineHeight}px;
		background-color: ${backgroundColor};
	}

	::-webkit-scrollbar{
		height: 10px;
		width: 10px;
		background: ${backgroundColor.toIntermediate(10/255)};
	}

	::-webkit-scrollbar-thumb{
		background: ${backgroundColor.toIntermediate(30/255)};

		&:hover{
			background: ${backgroundColor.toIntermediate(40/255)};
		}

		&:active{
			background: ${backgroundColor.toIntermediate(50/255)};
		}
	}

	${['small', 'medium', 'large', 'default', 'inherit'].map(size => {
		let options = size === 'inherit' ? null : size === 'default' ? theme.getOptions() : theme.getOptionsOf(size)
		let fontSize = size === 'inherit' ? 'inherit' : options!.fontSize!
		let lineHeight = size === 'inherit' ? 'inherit' : options!.lineHeight!

		return css`
			.size-${size}{
				font-size: ${fontSize};
				line-height: ${lineHeight};
			}
		`
	})}
`})