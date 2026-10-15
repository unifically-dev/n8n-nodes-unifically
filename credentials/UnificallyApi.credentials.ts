import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class UnificallyApi implements ICredentialType {
	name = 'unificallyApi';

	displayName = 'UnificAlly API';

	icon: Icon = { light: 'file:unifically.svg', dark: 'file:unifically.dark.svg' };

	documentationUrl = 'https://github.com/unifically-dev/n8n-nodes-unifically#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Your UnificAlly API key. Create one at https://unifically.com/api-keys.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.unifically.com',
			description: 'Leave as default unless you were told otherwise',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v1/account',
		},
	};
}
