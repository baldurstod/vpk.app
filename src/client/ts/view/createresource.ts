import { openInNewSVG } from 'harmony-svg';
import { createElement } from 'harmony-ui';
import { Controller } from '../controller';
import { ControllerEvents, SelectFile } from '../controllerevents';

export function createResource(repository: string, path: string): HTMLElement {
	return createElement('div', {
		class: 'resource',
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
