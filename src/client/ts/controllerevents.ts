export enum ControllerEvents {
	RefreshVpkList = 'refreshvpklist',
	SelectVpk = 'selectvpk',
	SelectFile = 'selectfile',
	DownloadFile = 'downloadfile',
	CreateFileLink = 'createfilelink',
	ToogleOptions = 'toogleoptions',
}

export type SelectVpk = {
	path: string,
}

export type SelectFile = {
	vpkPath: string,
	path: string,
}
