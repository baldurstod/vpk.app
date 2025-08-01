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
}

export type SelectRepository = {
	repository: string,
}

export type SelectFile = {
	repository: string,
	path: string,
	hash?: string,
}
