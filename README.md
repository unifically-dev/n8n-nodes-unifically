# n8n-nodes-unifically

An n8n community node for the [UnificAlly API](https://docs.unifically.com). One node and one API key give your workflows AI video, image, music and speech models: Veo 3.1, Kling 3.0, Seedance, Grok Imagine, Nano Banana, Seedream, Suno, ElevenLabs and 100+ more.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

## Installation

In n8n open Settings, Community Nodes, Install, and enter `n8n-nodes-unifically`. See the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

On a self-hosted instance you can also install it from the command line:

```bash
npm install n8n-nodes-unifically
```

## Credentials

1. Sign up at [unifically.com](https://unifically.com). A new account has $0.50 of balance to test with.
2. Create an API key at [unifically.com/api-keys](https://unifically.com/api-keys).
3. In n8n, create a UnificAlly API credential and paste the key. Leave Base URL as it is.

n8n tests the credential against `GET /v1/account`.

## Operations

| Operation | What it does |
| --- | --- |
| Generate Media | Creates a video, image, music or speech task. By default it waits for the result and returns the output URL. Turn off Wait for Completion to get the task ID back at once. A Callback URL makes the API POST the result to your webhook. |
| Get Task | Returns the status and output of a task by ID. |
| List Tasks | Lists recent tasks, filtered by status, model or category. |
| Estimate Cost | Prices a generation with `dry_run`. Nothing is charged. |

The node is marked `usableAsTool`, so an n8n AI Agent can call it. Self-hosted instances may need `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true`.

Failed generations are not charged.

## Example: text to video

Add the node, pick Generate Media and set:

- Model: `google/veo-3.1-fast`
- Prompt: `A cat walking on the beach at sunset`

The node sends `POST /v1/tasks` with `{ "model": "google/veo-3.1-fast", "input": { "prompt": "..." } }`, polls `GET /v1/tasks/{id}` until the task is done and outputs:

```json
{
  "task_id": "abc123def456",
  "status": "completed",
  "output": { "video_url": "https://.../abc123.mp4" }
}
```

Model-specific fields (duration, resolution, voices, reference images) go in Additional Input Fields as JSON, for example `{"duration": 6, "resolution": "720p"}` for a video model or `{"voice": "21m00Tcm4TlvDq8ikWAM"}` for ElevenLabs text to speech. Each model's fields are listed at [docs.unifically.com](https://docs.unifically.com).

## Popular model IDs

| Type | Model ID |
| --- | --- |
| Video | `google/veo-3.1-fast`, `kuaishou/kling-3.0-video`, `bytedance/seedance-2.5`, `xai/grok-imagine-video`, `alibaba/wan-2.6-video` |
| Image | `google/nano-banana-2`, `bytedance/seedream-5.0-pro`, `openai/gpt-image-2`, `alibaba/z-image-turbo` |
| Music | `suno-ai/music` |
| Speech | `elevenlabs/text-to-speech` |

The full catalog with rates is at [unifically.com/models](https://unifically.com/models).

## Compatibility

Built and tested against `n8n-workflow` 2.16 with n8n's community node linter (`npx n8n-node lint`). The node has no runtime dependencies.

Ready-made workflows that use the built-in HTTP Request node instead of this package are in [unifically-examples/n8n](https://github.com/unifically-dev/unifically-examples/tree/main/n8n).

## Development

```bash
npm install
npm run lint
npm test      # builds, then runs the node against a mocked API
```

## Resources

- [UnificAlly API documentation](https://docs.unifically.com)
- [Model catalog](https://unifically.com/models)
- [UnificAlly MCP server](https://www.npmjs.com/package/@unifically/mcp-server)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- Support: support@unifically.com, [Discord](https://discord.com/invite/FsmJDQVXxF)

## License

[MIT](LICENSE)
