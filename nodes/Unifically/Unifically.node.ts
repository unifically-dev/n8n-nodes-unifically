import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError, sleep } from 'n8n-workflow';

async function unificallyRequest(
	this: IExecuteFunctions,
	method: 'GET' | 'POST',
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('unificallyApi');
	const baseUrl = ((credentials.baseUrl as string) || 'https://api.unifically.com').replace(/\/+$/, '');

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		json: true,
	};
	if (body !== undefined) options.body = body;
	if (qs !== undefined) options.qs = qs;

	const response = (await this.helpers.httpRequestWithAuthentication.call(
		this,
		'unificallyApi',
		options,
	)) as IDataObject;

	return response;
}

export class Unifically implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'UnificAlly',
		name: 'unifically',
		icon: { light: 'file:unifically.svg', dark: 'file:unifically.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description:
			'Generate AI video, images, music and speech with the UnificAlly API: Veo 3.1, Kling, Seedance, Grok Imagine, Nano Banana, Suno, ElevenLabs and 100+ more models',
		defaults: {
			name: 'UnificAlly',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'unificallyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Generate Media',
						value: 'generate',
						description: 'Create a generation task (video, image, music, or speech) and optionally wait for the result',
						action: 'Generate media',
					},
					{
						name: 'Get Task',
						value: 'getTask',
						description: 'Fetch the status and output of an existing task',
						action: 'Get a task',
					},
					{
						name: 'List Tasks',
						value: 'listTasks',
						description: 'List your recent tasks with optional filters',
						action: 'List tasks',
					},
					{
						name: 'Estimate Cost',
						value: 'estimateCost',
						description: 'Price a generation without running it (dry run, nothing is charged)',
						action: 'Estimate cost',
					},
				],
				default: 'generate',
			},

			// ----------------------------------
			// generate + estimateCost
			// ----------------------------------
			{
				displayName: 'Model',
				name: 'model',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'google/veo-3.1-fast',
				description:
					'Model ID, e.g. google/veo-3.1-fast, kuaishou/kling-3.0-video, google/nano-banana-2, suno-ai/music, elevenlabs/text-to-speech. Full catalog: https://unifically.com/models.',
				displayOptions: {
					show: {
						operation: ['generate', 'estimateCost'],
					},
				},
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description:
					'Text prompt for the generation. Leave empty for models that take other inputs (set them in Additional Input Fields).',
				displayOptions: {
					show: {
						operation: ['generate', 'estimateCost'],
					},
				},
			},
			{
				displayName: 'Additional Input Fields',
				name: 'additionalInput',
				type: 'json',
				default: '{}',
				description:
					'Extra model-specific input fields as JSON, merged with the prompt. For example {"duration": 5, "resolution": "720p"} or {"voice": "21m00Tcm4TlvDq8ikWAM"}. Field reference per model: https://docs.unifically.com.',
				displayOptions: {
					show: {
						operation: ['generate', 'estimateCost'],
					},
				},
			},
			{
				displayName: 'Wait for Completion',
				name: 'waitForCompletion',
				type: 'boolean',
				default: true,
				description:
					'Whether to poll until the task finishes and return the output URL. If disabled, the node returns the task ID at once; pair it with a Get Task node or a callback URL.',
				displayOptions: {
					show: {
						operation: ['generate'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: {
						operation: ['generate'],
					},
				},
				options: [
					{
						displayName: 'Callback URL',
						name: 'callbackUrl',
						type: 'string',
						default: '',
						description:
							'Webhook URL that receives a POST when the task completes or fails (alternative to waiting)',
					},
					{
						displayName: 'Poll Interval (Seconds)',
						name: 'pollInterval',
						type: 'number',
						typeOptions: { minValue: 5 },
						default: 15,
						description: 'How often to check task status while waiting',
					},
					{
						displayName: 'Timeout (Seconds)',
						name: 'timeout',
						type: 'number',
						typeOptions: { minValue: 30 },
						default: 900,
						description: 'Maximum time to wait for completion before failing',
					},
				],
			},

			// ----------------------------------
			// getTask
			// ----------------------------------
			{
				displayName: 'Task ID',
				name: 'taskId',
				type: 'string',
				required: true,
				default: '',
				description: 'The task ID returned when the task was created',
				displayOptions: {
					show: {
						operation: ['getTask'],
					},
				},
			},

			// ----------------------------------
			// listTasks
			// ----------------------------------
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add filter',
				default: {},
				displayOptions: {
					show: {
						operation: ['listTasks'],
					},
				},
				options: [
					{
						displayName: 'Category',
						name: 'category',
						type: 'string',
						default: '',
						placeholder: 'video,image',
						description: 'Comma-separated categories: llm, video, image, audio',
					},
					{
						displayName: 'Model',
						name: 'model',
						type: 'string',
						default: '',
						placeholder: 'google/veo-3.1-fast',
						description: 'Filter by exact model ID',
					},
					{
						displayName: 'Page',
						name: 'page',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: 1,
					},
					{
						displayName: 'Page Size',
						name: 'pageSize',
						type: 'options',
						options: [
							{ name: '10', value: 10 },
							{ name: '25', value: 25 },
							{ name: '50', value: 50 },
							{ name: '100', value: 100 },
						],
						default: 25,
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{ name: 'Completed', value: 'completed' },
							{ name: 'Failed', value: 'failed' },
							{ name: 'Processing', value: 'processing' },
						],
						default: 'completed',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject = {};

				if (operation === 'generate' || operation === 'estimateCost') {
					const model = this.getNodeParameter('model', i) as string;
					const prompt = this.getNodeParameter('prompt', i, '') as string;
					const additionalInputRaw = this.getNodeParameter('additionalInput', i, '{}');

					let additionalInput: IDataObject = {};
					if (typeof additionalInputRaw === 'string' && additionalInputRaw.trim() !== '') {
						try {
							additionalInput = JSON.parse(additionalInputRaw) as IDataObject;
						} catch {
							throw new NodeOperationError(
								this.getNode(),
								'Additional Input Fields must be valid JSON',
								{ itemIndex: i },
							);
						}
					} else if (typeof additionalInputRaw === 'object' && additionalInputRaw !== null) {
						additionalInput = additionalInputRaw as IDataObject;
					}

					const input: IDataObject = { ...additionalInput };
					if (prompt !== '') input.prompt = prompt;

					if (operation === 'estimateCost') {
						const response = await unificallyRequest.call(this, 'POST', '/v1/tasks', {
							model,
							input,
							dry_run: true,
						});
						responseData = { model, ...(response.data as IDataObject) };
					} else {
						const options = this.getNodeParameter('options', i, {}) as IDataObject;
						const waitForCompletion = this.getNodeParameter('waitForCompletion', i, true) as boolean;

						const body: IDataObject = { model, input };
						if (options.callbackUrl) body.callback_url = options.callbackUrl;

						const createResponse = await unificallyRequest.call(this, 'POST', '/v1/tasks', body);
						const task = createResponse.data as IDataObject;

						if (!waitForCompletion) {
							responseData = task;
						} else {
							const pollInterval = ((options.pollInterval as number) || 15) * 1000;
							const timeout = ((options.timeout as number) || 900) * 1000;
							const taskId = task.task_id as string;
							const startedAt = Date.now();

							for (;;) {
								const statusResponse = await unificallyRequest.call(
									this,
									'GET',
									`/v1/tasks/${taskId}`,
								);
								const current = statusResponse.data as IDataObject;

								if (current.status === 'completed') {
									responseData = current;
									break;
								}
								if (current.status === 'failed') {
									throw new NodeOperationError(
										this.getNode(),
										`Task ${taskId} failed: ${(current.error_message as string) || 'unknown error'}`,
										{ itemIndex: i },
									);
								}
								if (Date.now() - startedAt > timeout) {
									throw new NodeOperationError(
										this.getNode(),
										`Timed out after ${timeout / 1000}s waiting for task ${taskId}. Increase the Timeout option or disable Wait for Completion.`,
										{ itemIndex: i },
									);
								}
								await sleep(pollInterval);
							}
						}
					}
				} else if (operation === 'getTask') {
					const taskId = this.getNodeParameter('taskId', i) as string;
					const response = await unificallyRequest.call(this, 'GET', `/v1/tasks/${taskId}`);
					responseData = response.data as IDataObject;
				} else if (operation === 'listTasks') {
					const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
					const qs: IDataObject = {};
					if (filters.status) qs.status = filters.status;
					if (filters.model) qs.model = filters.model;
					if (filters.category) qs.category = filters.category;
					if (filters.page) qs.page = filters.page;
					if (filters.pageSize) qs.page_size = filters.pageSize;

					const response = await unificallyRequest.call(this, 'GET', '/v1/tasks', undefined, qs);
					responseData = {
						tasks: response.data,
						pagination: response.pagination,
					};
				}

				returnData.push({
					json: responseData,
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
