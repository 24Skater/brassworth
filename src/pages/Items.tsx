import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Item, ItemCondition, Category, Location, PurchaseSource } from '@/types';
import {
  Search,
  Plus,
  Package,
  Upload,
  Download,
  FileSpreadsheet,
  LayoutGrid,
  List,
  Image as ImageIcon,
  Table as TableIcon,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { ItemCard } from '@/components/items/ItemCard';
import { groupByItem, isOverdue, statusFor, STATUS_LABELS } from '@/lib/lifecycle';
import type { ItemEvent, ItemStatus } from '@/types';
import { ItemListView } from '@/components/items/ItemListView';
import { ItemGalleryView } from '@/components/items/ItemGalleryView';
import { ItemTableView } from '@/components/items/ItemTableView';
import { ReceiptUploadDialog } from '@/components/receipts/ReceiptUploadDialog';
import { ReceiptReviewTable, ConfirmedReceiptData } from '@/components/receipts/ReceiptReviewTable';
import { ParsedReceipt } from '@/lib/receipt';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

/**
 * The "leave it as it is" choice in the bulk edit dialog.
 *
 * Radix rejects an empty string as a SelectItem value — it reserves that for
 * clearing the selection — and throws as the dialog opens, so this option
 * needs a value of its own that cannot collide with a real category or
 * location id.
 */
const KEEP_EXISTING = '__keep_existing__';

/** True when the person actually picked a new value rather than keeping what is there. */
function isRealChoice(value: string): boolean {
  return value !== '' && value !== KEEP_EXISTING;
}

export default function Items() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterCondition, setFilterCondition] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [itemEvents, setItemEvents] = useState<ItemEvent[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'gallery' | 'table'>('grid');
  const [showArchived, setShowArchived] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [bulkLocation, setBulkLocation] = useState<string>('');
  const [receiptUploadOpen, setReceiptUploadOpen] = useState(false);
  const [receiptReviewOpen, setReceiptReviewOpen] = useState(false);
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceipt | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // State for async data
  const [allItemsData, setAllItemsData] = useState<Item[]>([]);
  const [categoriesData, setCategoriesData] = useState<Category[]>([]);
  const [locationsData, setLocationsData] = useState<Location[]>([]);

  // Load data asynchronously
  const loadData = useCallback(async () => {
    if (!currentOrg) return;

    try {
      const [items, cats, locs] = await Promise.all([
        storage.getItems(),
        storage.getCategories(),
        storage.getLocations(),
      ]);

      setAllItemsData(items.filter((item) => item.organizationId === currentOrg.id));
      setItemEvents(
        (await storage.getItemEvents()).filter((e) => e.organizationId === currentOrg.id)
      );
      setCategoriesData(cats.filter((cat) => cat.organizationId === currentOrg.id));
      setLocationsData(locs.filter((loc) => loc.organizationId === currentOrg.id));
    } catch (error) {
      console.error('Failed to load items data:', error);
    }
  }, [currentOrg]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived data
  const allItems = allItemsData;
  const items = useMemo(
    () =>
      showArchived
        ? allItems.filter((item) => item.isArchived)
        : allItems.filter((item) => !item.isArchived),
    [allItems, showArchived]
  );
  const categories = categoriesData;
  const locations = locationsData;

  // One pass over the organisation's events, rather than a query per row.
  const eventsByItem = useMemo(() => groupByItem(itemEvents), [itemEvents]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.model?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || item.categoryId === filterCategory;
      const matchesLocation = filterLocation === 'all' || item.locationId === filterLocation;
      const matchesCondition = filterCondition === 'all' || item.condition === filterCondition;
      const matchesStatus =
        filterStatus === 'all' || statusFor(eventsByItem, item.id) === filterStatus;
      return (
        matchesSearch && matchesCategory && matchesLocation && matchesCondition && matchesStatus
      );
    });
  }, [
    items,
    searchQuery,
    filterCategory,
    filterLocation,
    filterCondition,
    filterStatus,
    eventsByItem,
  ]);

  const getCategoryName = (categoryId?: string) => {
    return categories.find((c) => c.id === categoryId)?.name || 'Uncategorized';
  };

  const getLocationName = (locationId?: string) => {
    return locations.find((l) => l.id === locationId)?.name || 'No location';
  };

  const handleArchiveItem = async (item: Item) => {
    const allItems = await storage.getItems();
    const updatedItems = allItems.map((i) =>
      i.id === item.id ? { ...i, isArchived: true, updatedAt: new Date().toISOString() } : i
    );
    await storage.setItems(updatedItems);
    await loadData();

    toast({
      title: 'Item archived',
      description: `${item.name} has been moved to archive`,
    });
  };

  const handleRestoreItem = async (item: Item) => {
    const allItems = await storage.getItems();
    const updatedItems = allItems.map((i) =>
      i.id === item.id ? { ...i, isArchived: false, updatedAt: new Date().toISOString() } : i
    );
    await storage.setItems(updatedItems);
    await loadData();

    toast({
      title: 'Item restored',
      description: `${item.name} has been restored`,
    });
  };

  const handleDeleteItem = (item: Item) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    const allItems = await storage.getItems();
    const updatedItems = allItems.filter((i) => i.id !== itemToDelete.id);
    await storage.setItems(updatedItems);
    await loadData();

    toast({
      title: 'Item deleted',
      description: `${itemToDelete.name} has been permanently deleted`,
      variant: 'destructive',
    });

    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Name: 'Example Item',
        Description: 'Example description',
        Category: 'Electronics',
        Location: 'Living Room',
        Brand: 'Samsung',
        Model: 'XYZ-123',
        'Serial Number': 'SN123456',
        Condition: 'GOOD',
        Quantity: 1,
        'Purchase Price': 299.99,
        'Current Estimated Value': 250.0,
        'Purchase Date': '2024-01-15',
        'Purchase Source': 'STORE',
        'Purchase Source Name': 'Best Buy',
        Notes: 'Example notes',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Items');
    XLSX.writeFile(wb, 'import-template.xlsx');

    toast({
      title: 'Template downloaded',
      description: 'Fill in the template and import it to add items',
    });
  };

  const handleExport = () => {
    const exportData = filteredItems.map((item) => ({
      Name: item.name,
      Description: item.description || '',
      Category: getCategoryName(item.categoryId),
      Location: getLocationName(item.locationId),
      Brand: item.brand || '',
      Model: item.model || '',
      'Serial Number': item.serialNumber || '',
      Condition: item.condition,
      Quantity: item.quantity,
      'Purchase Price': item.purchasePrice || '',
      'Current Estimated Value': item.currentEstimatedValue || '',
      'Purchase Date': item.purchaseDate || '',
      'Purchase Source': item.purchaseLocation || '',
      'Purchase Source Name': item.purchaseSourceName || '',
      Notes: item.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Items');
    XLSX.writeFile(wb, `${currentOrg?.name}-items-${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: 'Export successful',
      description: `Exported ${filteredItems.length} items to Excel`,
    });
  };

  const processImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          toast({
            title: 'Nothing to import',
            description: 'That spreadsheet has no sheets.',
            variant: 'destructive',
          });
          return;
        }
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = worksheet ? (XLSX.utils.sheet_to_json(worksheet) as any[]) : [];

        let importedCount = 0;
        let createdCategories = 0;
        let createdLocations = 0;

        // Get existing data
        const existingItems = await storage.getItems();
        const existingCategories = [...(await storage.getCategories())];
        const existingLocations = [...(await storage.getLocations())];

        jsonData.forEach((row) => {
          // Check for existing category or create new one (prevent duplicates)
          let categoryId = existingCategories.find(
            (c) =>
              c.name.toLowerCase() === row.Category?.toLowerCase() &&
              c.organizationId === currentOrg!.id
          )?.id;

          if (!categoryId && row.Category) {
            const newCategory: Category = {
              id: crypto.randomUUID(),
              organizationId: currentOrg!.id,
              name: row.Category,
              description: `Auto-created from import`,
            };
            existingCategories.push(newCategory);
            categoryId = newCategory.id;
            createdCategories++;
          }

          // Check for existing location or create new one (prevent duplicates)
          let locationId = existingLocations.find(
            (l) =>
              l.name.toLowerCase() === row.Location?.toLowerCase() &&
              l.organizationId === currentOrg!.id
          )?.id;

          if (!locationId && row.Location) {
            const newLocation: Location = {
              id: crypto.randomUUID(),
              organizationId: currentOrg!.id,
              name: row.Location,
              notes: `Auto-created from import`,
            };
            existingLocations.push(newLocation);
            locationId = newLocation.id;
            createdLocations++;
          }

          const newItem: Item = {
            id: crypto.randomUUID(),
            organizationId: currentOrg!.id,
            name: row.Name || 'Unnamed Item',
            description: row.Description,
            categoryId,
            locationId,
            brand: row.Brand,
            model: row.Model,
            serialNumber: row['Serial Number'],
            purchaseDate: row['Purchase Date'],
            purchasePrice: row['Purchase Price'] ? Number(row['Purchase Price']) : undefined,
            currentEstimatedValue: row['Current Estimated Value']
              ? Number(row['Current Estimated Value'])
              : undefined,
            purchaseLocation: row['Purchase Source'] as PurchaseSource,
            purchaseSourceName: row['Purchase Source Name'],
            condition: (row.Condition as ItemCondition) || 'GOOD',
            quantity: row.Quantity ? Number(row.Quantity) : 1,
            notes: row.Notes,
            isArchived: false,
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          existingItems.push(newItem);
          importedCount++;
        });

        // Save all updated data
        await storage.setItems(existingItems);
        await storage.setCategories(existingCategories);
        await storage.setLocations(existingLocations);

        const messages = [`Imported ${importedCount} items`];
        if (createdCategories > 0) messages.push(`Created ${createdCategories} new categories`);
        if (createdLocations > 0) messages.push(`Created ${createdLocations} new locations`);

        toast({
          title: 'Import successful',
          description: messages.join(', '),
        });

        setImportDialogOpen(false);
        await loadData();
      } catch (error) {
        toast({
          title: 'Import failed',
          description: 'Please check your Excel file format',
          variant: 'destructive',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImportFile(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      processImportFile(file);
    } else {
      toast({
        title: 'Invalid file',
        description: 'Please drop an Excel file (.xlsx or .xls)',
        variant: 'destructive',
      });
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((item) => item.id)));
    }
  };

  const handleBulkEdit = async () => {
    if (selectedItems.size === 0) return;

    const allItems = await storage.getItems();
    const updatedItems = allItems.map((item) => {
      if (selectedItems.has(item.id)) {
        return {
          ...item,
          categoryId: isRealChoice(bulkCategory) ? bulkCategory : item.categoryId,
          locationId: isRealChoice(bulkLocation) ? bulkLocation : item.locationId,
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    await storage.setItems(updatedItems);
    await loadData();

    const updates = [];
    if (isRealChoice(bulkCategory)) updates.push('category');
    if (isRealChoice(bulkLocation)) updates.push('location');

    toast({
      title: 'Bulk update successful',
      description: `Updated ${updates.join(' and ')} for ${selectedItems.size} items`,
    });

    setSelectedItems(new Set());
    setBulkEditOpen(false);
    setBulkCategory('');
    setBulkLocation('');
    await loadData();
  };

  const handleReceiptParsed = (receipt: ParsedReceipt, file?: File) => {
    setParsedReceipt(receipt);
    setReceiptFile(file || null);
    setReceiptUploadOpen(false);
    setReceiptReviewOpen(true);
  };

  const handleReceiptConfirm = async (data: ConfirmedReceiptData) => {
    if (!currentOrg) return;

    const createItems = async () => {
      const allItems = await storage.getItems();
      const createdItems: Item[] = [];

      data.items.forEach((item) => {
        const newItem: Item = {
          id: crypto.randomUUID(),
          name: item.description,
          quantity: item.quantity,
          purchasePrice: item.unitPrice || item.lineTotal,
          purchaseDate: data.purchaseDate,
          purchaseLocation: (data.storeName.toLowerCase().includes('amazon') ||
          data.storeName.toLowerCase().includes('online')
            ? 'ONLINE'
            : 'STORE') as PurchaseSource,
          purchaseSourceName: data.storeName,
          categoryId: data.categoryId,
          locationId: data.locationId,
          organizationId: currentOrg.id,
          condition: 'NEW' as ItemCondition,
          isArchived: false,
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        createdItems.push(newItem);
      });

      await storage.setItems([...allItems, ...createdItems]);

      toast({
        title: 'Items imported',
        description: `Successfully imported ${createdItems.length} items from receipt.`,
      });

      setReceiptReviewOpen(false);
      setParsedReceipt(null);
      setReceiptFile(null);

      // Refresh data to show new items
      await loadData();
    };

    // Convert receipt file to base64 if available
    if (receiptFile) {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;

        // Create receipt document
        const receiptDocument = {
          id: crypto.randomUUID(),
          fileName: receiptFile.name,
          type: 'RECEIPT' as const,
          organizationId: currentOrg.id,
          fileUrl: base64,
          uploadedAt: new Date().toISOString(),
        };

        const allDocuments = await storage.getDocuments();
        await storage.setDocuments([...allDocuments, receiptDocument]);

        await createItems();
      };
      reader.readAsDataURL(receiptFile);
    } else {
      await createItems();
    }
  };

  if (!currentOrg) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>No Property Selected</CardTitle>
            <CardDescription>Please select or create a property first</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/organizations')}>Go to Properties</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <p className="text-muted-foreground">
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
              </p>
              <Tabs
                value={showArchived ? 'archived' : 'active'}
                onValueChange={(v) => setShowArchived(v === 'archived')}
              >
                <TabsList>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="archived">Archived</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="flex gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <TabsList>
                  <TabsTrigger value="grid" className="px-3" aria-label="Grid view">
                    <LayoutGrid className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="list" className="px-3" aria-label="List view">
                    <List className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="gallery" className="px-3" aria-label="Gallery view">
                    <ImageIcon className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="table" className="px-3" aria-label="Table view">
                    <TableIcon className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" onClick={() => setReceiptUploadOpen(true)}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Add from Receipt
              </Button>
              {selectedItems.size > 0 && (
                <Button variant="secondary" onClick={() => setBulkEditOpen(true)}>
                  Edit {selectedItems.size} items
                </Button>
              )}
              <Button onClick={() => navigate('/items/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCondition} onValueChange={setFilterCondition}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="GOOD">Good</SelectItem>
                <SelectItem value="FAIR">Fair</SelectItem>
                <SelectItem value="POOR">Poor</SelectItem>
                <SelectItem value="DAMAGED">Damaged</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[180px]" data-testid="filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(Object.keys(STATUS_LABELS) as ItemStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="whitespace-nowrap"
            >
              {selectedItems.size === filteredItems.length && filteredItems.length > 0
                ? 'Deselect All'
                : 'Select All'}
            </Button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {showArchived ? 'No archived items' : 'No items found'}
              </p>
              {!showArchived && (
                <Button onClick={() => navigate('/items/new')}>Add your first item</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {viewMode === 'grid' && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    status={statusFor(eventsByItem, item.id)}
                    overdue={isOverdue(eventsByItem.get(item.id) ?? [])}
                    categoryName={getCategoryName(item.categoryId)}
                    locationName={getLocationName(item.locationId)}
                    onView={() => navigate(`/items/${item.id}`)}
                    onArchive={() =>
                      showArchived ? handleRestoreItem(item) : handleArchiveItem(item)
                    }
                    onDelete={() => handleDeleteItem(item)}
                    selected={selectedItems.has(item.id)}
                    onToggleSelect={() => toggleItemSelection(item.id)}
                  />
                ))}
              </div>
            )}

            {viewMode === 'list' && (
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <ItemListView
                    key={item.id}
                    item={item}
                    categoryName={getCategoryName(item.categoryId)}
                    locationName={getLocationName(item.locationId)}
                    onView={() => navigate(`/items/${item.id}`)}
                    onArchive={() =>
                      showArchived ? handleRestoreItem(item) : handleArchiveItem(item)
                    }
                    onDelete={() => handleDeleteItem(item)}
                  />
                ))}
              </div>
            )}

            {viewMode === 'gallery' && (
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredItems.map((item) => (
                  <ItemGalleryView
                    key={item.id}
                    item={item}
                    categoryName={getCategoryName(item.categoryId)}
                    onView={() => navigate(`/items/${item.id}`)}
                    onArchive={() =>
                      showArchived ? handleRestoreItem(item) : handleArchiveItem(item)
                    }
                    onDelete={() => handleDeleteItem(item)}
                  />
                ))}
              </div>
            )}

            {viewMode === 'table' && (
              <ItemTableView
                items={filteredItems}
                getCategoryName={getCategoryName}
                getLocationName={getLocationName}
                onView={(item) => navigate(`/items/${item.id}`)}
                onArchive={(item) =>
                  showArchived ? handleRestoreItem(item) : handleArchiveItem(item)
                }
                onDelete={handleDeleteItem}
              />
            )}
          </>
        )}
      </main>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Items</DialogTitle>
            <DialogDescription>
              Upload an Excel file to import multiple items at once
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-2">Drag and drop your Excel file here</p>
              <p className="text-xs text-muted-foreground mb-4">or click to browse</p>
              <Button variant="outline" asChild>
                <label className="cursor-pointer">
                  Choose File
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </Button>
            </div>

            <div className="flex items-center justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadTemplate}
                className="text-primary"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download Import Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Edit {selectedItems.size} Items</DialogTitle>
            <DialogDescription>
              Update category and/or location for all selected items. Leave blank to keep existing
              values.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-category">Change Category</Label>
              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                <SelectTrigger id="bulk-category">
                  <SelectValue placeholder="Select new category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={KEEP_EXISTING}>Keep existing category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-location">Change Location</Label>
              <Select value={bulkLocation} onValueChange={setBulkLocation}>
                <SelectTrigger id="bulk-location">
                  <SelectValue placeholder="Select new location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={KEEP_EXISTING}>Keep existing location</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBulkEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkEdit}
              disabled={!isRealChoice(bulkCategory) && !isRealChoice(bulkLocation)}
            >
              Update Items
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{itemToDelete?.name}"? This action cannot
              be undone.
              {!itemToDelete?.isArchived &&
                ' Consider archiving instead to preserve the item data.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receipt Upload Dialog */}
      <ReceiptUploadDialog
        open={receiptUploadOpen}
        onOpenChange={setReceiptUploadOpen}
        onParsed={handleReceiptParsed}
      />

      {/* Receipt Review Dialog */}
      {parsedReceipt && (
        <ReceiptReviewTable
          open={receiptReviewOpen}
          onOpenChange={setReceiptReviewOpen}
          receipt={parsedReceipt}
          onConfirm={handleReceiptConfirm}
          categories={categories}
          locations={locations}
        />
      )}
    </div>
  );
}
