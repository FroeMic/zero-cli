# Filtering

All list endpoints accept a `where` parameter as a JSON-encoded filter object.

## Basic Equality

```json
{ "workspaceId": "uuid-..." }
{ "name": "Acme Corp" }
```

## Operators by Type

### String
`$eq` `$not` `$in` `$notIn` `$contains` `$notContains` `$containsAny` `$startsWith` `$endsWith` `$exists` `$notExists`

### Number
`$eq` `$not` `$gt` `$gte` `$lt` `$lte` `$in` `$notIn` `$exists` `$notExists`

### Date (ISO 8601 or relative macros)
`$gte` `$lte` `$gt` `$lt` `$date` `$exists` `$notExists`

Relative macros: `+Nd` (days), `-Nw` (weeks), `now()`

### Array
`$includes` `$notIncludes` `$overlaps` `$notOverlaps` `$all` `$length` `$exists` `$notExists`

### Logical
`$or` `$and`

## Examples

```json
{ "name": { "$contains": "acme" } }

{ "createdAt": { "$gte": "-30d" } }

{ "$or": [{ "name": "Acme" }, { "name": "Acme Corp" }] }

{ "company.location.city": "New York" }

{ "custom.54e1ca7d-...": { "$in": ["option-key-uuid"] } }
```

## Dot-Notation for Related Fields

Filter on related records in a single query:

```json
{ "company.name": { "$contains": "acme" } }
{ "company.location.country": "US" }
```
