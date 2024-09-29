
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
