import { Repositories } from 'harmony-3d';
import { Task } from './task';
import { saveFile } from 'harmony-browser-utils';

const txtPerTask = new Map<number, string>();

export async function concatMaterials(task: Task, repository: string, path: string, params?: any): Promise<boolean> {

	const response = await Repositories.getFileAsText(repository, path);
	if (response.error) {
		return false;
	}

	let txt = response.text!;

	txt = txtPerTask.get(task.id) + path + '\n' + txt + '\n';

	txtPerTask.set(task.id, txt);
	/*
	if (OptionsManager.getItem('app.files.export.namingscheme') == 'name') {
		file = new File([file], file.name.split('/').pop() ?? file.name, { type: file.type });
	}

	saveFile(file);
	*/
	return true;
};

export async function concatMaterialsBegin(task: Task): Promise<boolean> {
	txtPerTask.set(task.id, `Repository: ${task.getRepository()}\nRoot: ${task.getRoot()}\n\n`);
	return true;
}

export async function concatMaterialsEnd(task: Task): Promise<boolean> {
	saveFile(new File([txtPerTask.get(task.id)!], 'materials.txt'));
	txtPerTask.delete(task.id)
	return true;
}
