import { GameEngine } from '../enums';
import { getGameFile } from '../files/files';
import { Task } from './task';

export async function exportToPng(task: Task, repository: string, path: string, params?: any): Promise<boolean> {
	const extension = path.split('.').pop() ?? '';
	const file = await getGameFile(GameEngine.Source1/*TODO: set per repository*/, repository, path);
	file?.exportToPng();
	return true;
};
