import { openInNewSVG } from 'harmony-svg';
import { createElement } from 'harmony-ui';
import { ControllerEvents, SelectFile } from '../controllerevents';
import { Controller } from '../controller';

export function createResource(repository: string, path: string): HTMLElement {
	return createElement('div', {
		class: 'path',
		childs: [
			createElement('input', {
				disabled: true,
				value: path,
			}),
			createElement('span', {
				class: 'open',
				innerHTML: openInNewSVG,

				$click: () => Controller.dispatchEvent(new CustomEvent<SelectFile>(ControllerEvents.SelectFile, { detail: { repository: repository, path: path } })),
			}),
		],
	});
}
