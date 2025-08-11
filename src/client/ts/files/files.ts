import { Map2 } from 'harmony-utils';
import { getFile } from '../api';
import { GameEngine } from '../enums';
import { GameFile } from './file';

export async function getGameFile(engine: GameEngine, repository: string, path: string): Promise<GameFile | null> {
	const extension = path.split('.').pop() ?? '';

	const constructor = fileExtensions.get(engine, extension);
	if (!constructor) {
		return null;
	}

	return new constructor(repository, path);
}

const fileExtensions = new Map2<GameEngine, string, typeof GameFile>();

export function registerFileExtension(engine: GameEngine, extension: string, file:  typeof GameFile) {
	fileExtensions.set(engine, extension, file);
}
