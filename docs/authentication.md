# Authentication

## Bearer Token

Every request must include:

```
Authorization: Bearer <your_api_key>
```

API keys are not self-service — contact the Zero team to obtain credentials.

## With the CLI

```bash
# Store token for all future commands
zero-cli login <YOUR_API_TOKEN>

# Or provide per-command
zero-cli contacts list --bearer-token <YOUR_API_TOKEN>
```

## Raw HTTP

```bash
curl https://api.zero.inc/api/workspaces \
  -H "Authorization: Bearer <YOUR_API_TOKEN>"
```
