import { Repositories } from 'harmony-3d';
import { Task } from './task';

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
	txtPerTask.set(task.id, '');
	return true;
}

export async function concatMaterialsEnd(task: Task): Promise<boolean> {
	console.info(txtPerTask.get(task.id));
	return true;
}
