import {addGlobalStyle, css} from '@pucelle/lupos.js'
import {theme} from './theme'


addGlobalStyle(() => {
	let {mainColor, textColor, borderColor, errorColor, fontSize, borderRadius, focusBlurRadius, adjustSize: adjust, adjustFontSize, backgroundColor} = theme

	return css`
	html{
		color: ${textColor};
		font-size: ${fontSize}px;
		line-height: ${adjust(28)}px;
		background-color: ${backgroundColor};
	}

	h1{
		font-size: ${adjustFontSize(68)}px;
		line-height: 1.2;
		font-weight: 700;
	}

	h2{
		font-size: ${adjustFontSize(36)}px;
		line-height: 1.2;
		font-weight: 100;
	}

	h3{
		font-size: ${adjustFontSize(26)}px;
		line-height: 1.2;
		font-weight: 400;
	}

	h4{
		font-size: ${adjustFontSize(22)}px;
		line-height: 1.2;
		font-weight: 400;
	}

	h5{
		font-size: ${adjustFontSize(18)}px;
		line-height: 1.2;
	}

	h6{
		font-size: ${adjustFontSize(14)}px;
		line-height: 1.2;
	}

	a[primary]{
		color: ${mainColor};
	}

	label{
		font-weight: bold;
		font-size: ${adjustFontSize(13)}px;

		&[required]{
			&::after{
				position: relative;
				content: '*';
				color: ${errorColor};
				margin-left: 2px;
				top: ${adjust(-5)}px;
			}
		}

		f-icon{
			margin-left: 4px;
			color: ${textColor.toIntermediate(0.08)};
		}
	}

	::-webkit-scrollbar{
		height: 10px;
		width: 10px;
		background: ${backgroundColor.toIntermediate(0.04)};
	}

	::-webkit-scrollbar-thumb{
		background: ${backgroundColor.toIntermediate(0.12)};

		&:hover{
			background: ${backgroundColor.toIntermediate(0.16)};
		}

		&:active{
			background: ${backgroundColor.toIntermediate(0.2)};
		}
	}
`})