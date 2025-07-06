export enum ControllerEvents {
	RefreshRepositoryList = 'refreshrepositorylist',
	SelectRepository = 'selectrepository',
	SelectFile = 'selectfile',
	DownloadFile = 'downloadfile',
	CreateFileLink = 'createfilelink',
	ToogleOptions = 'toogleoptions',
}

export type SelectRepository = {
	path: string,
}

export type SelectFile = {
	origin: string,
	path: string,
}
