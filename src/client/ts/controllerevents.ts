export enum ControllerEvents {
	RefreshVpkList = 'refreshvpklist',
	SelectVpk = 'selectvpk',
}

export type SelectVpk = {
	path: string,
}
