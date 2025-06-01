export type VpkListResponse = {
	success: boolean,
	error?: string,
	result?: {
		files: Array<string>,
	}
}
