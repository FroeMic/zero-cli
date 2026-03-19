# Notes

## Endpoints

```
GET    /api/notes
POST   /api/notes
PATCH  /api/notes/{noteId}
DELETE /api/notes/{noteId}
```

## Schema Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | — |
| `workspaceId` | UUID | **Required for creation** |
| `name` | string | Note title |
| `emoji` | string | — |
| `content` | Tiptap doc | Rich content (see format below) |
| `companyId` | UUID | Attach to a company |
| `contactId` | UUID | Attach to a contact |
| `dealId` | UUID | Attach to a deal |
| `archived` | boolean | — |
| `createdAt` | ISO 8601 | — |
| `updatedAt` | ISO 8601 | — |
| `createdById` | UUID | — |
| `externalId` | string | — |
| `source` | string | — |

Notes can be attached to one or more of company, contact, or deal.

PATCH returns only the changed fields, not the full object.

## Tiptap Document Format

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Your note text here" }]
    }
  ]
}
```

Empty note: `{ "type": "doc", "content": [] }`

Supported nodes: `heading` · `paragraph` · `bulletList` · `orderedList` · `taskList` · `blockquote` · `codeBlock`

Supported marks: `bold` · `italic` · `underline` · `strike` · `code` · `link`
