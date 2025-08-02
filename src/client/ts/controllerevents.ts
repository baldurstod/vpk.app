export enum ControllerEvents {
	RefreshRepositoryList = 'refreshrepositorylist',
	SelectRepository = 'selectrepository',
	SelectFile = 'selectfile',
	DownloadFile = 'downloadfile',
	CreateRepositoryLink = 'createrepositorylink',
	CreateFileLink = 'createfilelink',
	ToogleOptions = 'toogleoptions',
	OpenAdvancedOptions = 'openadvancedoptions',
	DownloadMaterials = 'downloadmaterials',
	NavigateTo = 'navigateto',
}

export type SelectRepository = {
	repository: string,
}

export type SelectFile = {
	repository: string,
	path: string,
	hash?: string,
}

export type NavigateTo = {
	url: string,
	replaceSate: boolean,
}
