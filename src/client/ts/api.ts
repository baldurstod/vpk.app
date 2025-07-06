import { fetchApi } from './fetchapi';
import { getFileResponse, VpkListResponse } from './responses/vpk';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	var binaryString = atob(base64);
	var bytes = new Uint8Array(binaryString.length);
	for (var i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}

export async function getFile(repository: string, path: string): Promise<File | null> {
	const { requestId, response } = await fetchApi('get-file', 1, { repository: repository, path: path }) as { requestId: string, response: getFileResponse };

	if (!response.success) {
		return null;
	}
	const content = base64ToArrayBuffer(response.result!.content);

	return new File([new Blob([content])], path);
}

export async function getFileList(repository: string): Promise<Array<string>> {
	const { requestId, response } = await fetchApi('get-file-list', 1, { repository: repository }) as { requestId: string, response: VpkListResponse };

	console.info(event, response);
	if (!response.success) {
		return [];
	}

	return response.result!.files;
}
