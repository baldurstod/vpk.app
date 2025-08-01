export type RepositoryListResponse = {
	success: boolean,
	error?: string,
	result?: {
		files: Array<string>,
	}
}

export type getFileResponse = {
	success: boolean,
	error?: string,
	result?: {
		content: string,
	}
}

export type ConcatFilesResponse = {
	success: boolean,
	error?: string,
	result?: {
		content: string,
	}
}
