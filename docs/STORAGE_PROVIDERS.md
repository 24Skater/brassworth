# Storage Providers Guide

Home Asset Keeper uses a provider-based storage architecture, allowing you to choose the storage backend that best fits your needs.

## Available Providers

### 1. localStorage (Default)

**Type**: `localStorage`

**Best For**:

- Single-user deployments
- Development and testing
- Simple setups

**Characteristics**:

- Synchronous API
- Limited storage (~5-10MB)
- Data stored in browser localStorage
- Lost if browser data is cleared
- Fast and simple

**Configuration**:

```env
VITE_STORAGE_PROVIDER=localStorage
```

### 2. IndexedDB

**Type**: `indexeddb`

**Best For**:

- Single-user deployments needing more storage
- Better persistence
- Larger datasets

**Characteristics**:

- Asynchronous API
- Large storage capacity (typically 50% of disk space)
- Indexed queries for better performance
- Structured data storage
- Better persistence than localStorage
- Auto-migrates from localStorage on first use

**Configuration**:

```env
VITE_STORAGE_PROVIDER=indexeddb
```

**Migration**: Data is automatically migrated from localStorage when you first switch to IndexedDB.

### 3. API (Coming Soon)

**Type**: `api`

**Best For**:

- Multi-user deployments
- Production environments
- Data synchronization across devices

**Characteristics**:

- Requires backend server
- Multi-user support
- Data synchronization
- Server-side validation
- Backup and restore

**Configuration**:

```env
VITE_STORAGE_PROVIDER=api
VITE_API_URL=https://your-api.example.com
```

## Switching Providers

### From localStorage to IndexedDB

1. **Update environment variable**:

   ```env
   VITE_STORAGE_PROVIDER=indexeddb
   ```

2. **Restart the application**:
   - Data will be automatically migrated from localStorage
   - Migration happens on first load
   - Original localStorage data is preserved

3. **Verify migration**:
   - Check browser console for migration messages
   - Verify data appears in IndexedDB (DevTools → Application → IndexedDB)

### From IndexedDB to localStorage

1. **Export data first** (if needed):

   ```typescript
   import { getStorageProvider } from '@/lib/storage';
   const provider = getStorageProvider();
   const data = await provider.exportData();
   // Save data somewhere safe
   ```

2. **Update environment variable**:

   ```env
   VITE_STORAGE_PROVIDER=localStorage
   ```

3. **Restart the application**

## Storage Provider Interface

All providers implement the `StorageProvider` interface:

```typescript
interface StorageProvider {
  // CRUD operations for all entities
  getItems(): Promise<Item[]>;
  getItem(id: string): Promise<Item | null>;
  createItem(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<Item>;
  updateItem(id: string, updates: Partial<Item>): Promise<Item>;
  deleteItem(id: string): Promise<void>;

  // Similar for Organizations, Locations, Categories, Tags, etc.

  // Utility operations
  clearAll(): Promise<void>;
  exportData(): Promise<string>;
  importData(data: string): Promise<void>;
}
```

## Using Storage Providers

### Synchronous API (Backward Compatible)

The existing `storage` object works with localStorage:

```typescript
import { storage } from '@/lib/storage';

// Synchronous (localStorage only)
const items = storage.getItems();
storage.setItems(items);
```

### Asynchronous API (All Providers)

For IndexedDB and API providers, use the async interface:

```typescript
import { getStorageProvider } from '@/lib/storage';

const provider = getStorageProvider();

// Asynchronous (works with all providers)
const items = await provider.getItems();
const item = await provider.getItem('item-id');
const newItem = await provider.createItem({ ... });
```

## Migration

### Manual Migration

If you need to manually migrate data:

```typescript
import { migrateLocalStorageToIndexedDB } from '@/lib/storage/migration';

await migrateLocalStorageToIndexedDB();
```

### Export/Import

Export data from any provider:

```typescript
const provider = getStorageProvider();
const jsonData = await provider.exportData();

// Save to file or send to server
```

Import data to any provider:

```typescript
const provider = getStorageProvider();
await provider.importData(jsonData);
```

## Performance Considerations

### localStorage

- ✅ Fast for small datasets
- ❌ Slow for large datasets (all data loaded at once)
- ❌ Blocking operations

### IndexedDB

- ✅ Fast queries with indexes
- ✅ Non-blocking operations
- ✅ Efficient for large datasets
- ✅ Can query by organization, date, etc.

### API

- ✅ Server-side processing
- ✅ Can handle very large datasets
- ⚠️ Network latency
- ✅ Multi-user support

## Storage Limits

- **localStorage**: ~5-10MB (browser dependent)
- **IndexedDB**: Typically 50% of available disk space
- **API**: Limited by server storage

## Best Practices

1. **Development**: Use `localStorage` for simplicity
2. **Single User**: Use `indexeddb` for better persistence
3. **Multi User**: Use `api` with backend
4. **Backup**: Regularly export data using `exportData()`
5. **Migration**: Test migrations in development first

## Troubleshooting

### IndexedDB Not Working

- Check browser support (all modern browsers support IndexedDB)
- Check browser storage permissions
- Clear browser cache and try again
- Check console for errors

### Migration Issues

- Export data before switching providers
- Check console for migration errors
- Verify data in browser DevTools
- Fall back to localStorage if needed

### Data Loss

- Always export data before switching providers
- Use browser DevTools to inspect storage
- Check localStorage and IndexedDB in Application tab

---

**Last Updated**: December 2024
