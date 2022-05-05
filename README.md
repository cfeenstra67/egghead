# Browser History

### Generate Migration

```bash
$ npm run typeorm migration:generate -- -d ./local-db.ts src/migrations/my-migration-name
```

Also need to manually add it to `migrations` array in `migrations/index.ts`

### Run Migrations

```bash
npm run typeorm migration:run -- -d ./local-db.ts
```
