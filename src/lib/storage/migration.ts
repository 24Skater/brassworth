import { LocalStorageProvider } from './providers/localStorageProvider';
import { IndexedDBProvider } from './providers/indexedDBProvider';

/**
 * Migration utility to move data from localStorage to IndexedDB
 */
export async function migrateLocalStorageToIndexedDB(): Promise<void> {
  try {
    console.log('Starting migration from localStorage to IndexedDB...');

    const localStorageProvider = new LocalStorageProvider();
    const indexedDBProvider = new IndexedDBProvider();

    // Check if there's data to migrate
    const hasData =
      localStorage.getItem('inventory_items') ||
      localStorage.getItem('inventory_organizations') ||
      localStorage.getItem('inventory_locations');

    if (!hasData) {
      console.log('No data to migrate');
      return;
    }

    // Export from localStorage
    const data = await localStorageProvider.exportData();

    // Import to IndexedDB
    await indexedDBProvider.importData(data);

    // Mark migration as complete
    localStorage.setItem('migrated_to_indexeddb', 'true');

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Check if migration has been completed
 */
export function hasMigratedToIndexedDB(): boolean {
  return localStorage.getItem('migrated_to_indexeddb') === 'true';
}

/**
 * Auto-migrate if using IndexedDB provider and migration hasn't been done
 */
export async function autoMigrateIfNeeded(providerType: string): Promise<void> {
  if (providerType === 'indexeddb' && !hasMigratedToIndexedDB()) {
    try {
      await migrateLocalStorageToIndexedDB();
    } catch (error) {
      console.error('Auto-migration failed, continuing with IndexedDB:', error);
    }
  }
}
