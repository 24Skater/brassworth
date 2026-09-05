import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { storage } from '@/lib/storage';
import {
  PRIORITY_LABELS,
  buildPurchase,
  groupContributions,
  progressFor,
  readyToBuy,
  sortEntries,
  wishlistTotals,
} from '@/lib/wishlist';
import { alertsFor, groupObservations, priceStats, trend } from '@/lib/prices';
import type {
  PriceObservation,
  SavingsContribution,
  WishlistEntry,
  WishlistPriority,
} from '@/types';
import { toast } from 'sonner';
import { ArrowLeft, Check, Plus, PiggyBank, Tag, Trash2, TrendingDown } from 'lucide-react';

const money = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const today = () => new Date().toISOString().split('T')[0] as string;

const PRIORITY_STYLES: Record<WishlistPriority, string> = {
  HIGH: 'bg-primary/15 text-primary border-primary/30',
  MEDIUM: 'bg-secondary text-secondary-foreground',
  LOW: 'bg-muted text-muted-foreground',
};

const emptyForm = {
  name: '',
  brand: '',
  model: '',
  targetPrice: '',
  priority: 'MEDIUM' as WishlistPriority,
  url: '',
  notes: '',
};

export default function Wishlist() {
  const navigate = useNavigate();
  const { currentOrg } = useOrganization();

  const [entries, setEntries] = useState<WishlistEntry[]>([]);
  const [contributions, setContributions] = useState<SavingsContribution[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [savingFor, setSavingFor] = useState<WishlistEntry | null>(null);
  const [savingAmount, setSavingAmount] = useState('');
  const [savingNote, setSavingNote] = useState('');

  const [observations, setObservations] = useState<PriceObservation[]>([]);
  const [pricingFor, setPricingFor] = useState<WishlistEntry | null>(null);
  const [priceAmount, setPriceAmount] = useState('');

  const [buying, setBuying] = useState<WishlistEntry | null>(null);
  const [pricePaid, setPricePaid] = useState('');

  const load = useCallback(async () => {
    if (!currentOrg) return;

    const [allEntries, allContributions, allObservations] = await Promise.all([
      storage.getWishlistEntries(),
      storage.getSavingsContributions(),
      storage.getPriceObservations(),
    ]);

    setEntries(allEntries.filter((e) => e.organizationId === currentOrg.id));
    setContributions(allContributions.filter((c) => c.organizationId === currentOrg.id));
    setObservations(allObservations.filter((o) => o.organizationId === currentOrg.id));
  }, [currentOrg]);

  useEffect(() => {
    void load();
  }, [load]);

  const byEntry = useMemo(() => groupContributions(contributions), [contributions]);
  const sorted = useMemo(() => sortEntries(entries, byEntry), [entries, byEntry]);
  const totals = useMemo(() => wishlistTotals(entries, byEntry), [entries, byEntry]);
  const ready = useMemo(() => readyToBuy(entries, byEntry), [entries, byEntry]);
  const pricesByEntry = useMemo(() => groupObservations(observations), [observations]);
  const priceAlerts = useMemo(() => alertsFor(entries, pricesByEntry), [entries, pricesByEntry]);

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

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast.error('Give it a name.');
      return;
    }

    const target = form.targetPrice.trim() === '' ? undefined : Number(form.targetPrice);
    if (target !== undefined && !Number.isFinite(target)) {
      toast.error('Enter a valid target price, or leave it blank.');
      return;
    }

    await storage.createWishlistEntry({
      organizationId: currentOrg.id,
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      model: form.model.trim() || undefined,
      targetPrice: target,
      priority: form.priority,
      url: form.url.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });

    setForm(emptyForm);
    setIsAddOpen(false);
    await load();
    toast.success('Added to the wishlist');
  };

  const handleContribute = async () => {
    if (!savingFor) return;

    const amount = Number(savingAmount);
    if (!Number.isFinite(amount) || amount === 0) {
      toast.error('Enter an amount. A negative number takes money back out.');
      return;
    }

    await storage.createSavingsContribution({
      wishlistEntryId: savingFor.id,
      organizationId: currentOrg.id,
      amount,
      occurredAt: new Date().toISOString(),
      note: savingNote.trim() || undefined,
    });

    setSavingFor(null);
    setSavingAmount('');
    setSavingNote('');
    await load();
    toast.success('Saved');
  };

  const handleBuy = async () => {
    if (!buying) return;

    const paid = pricePaid.trim() === '' ? undefined : Number(pricePaid);
    if (paid !== undefined && !Number.isFinite(paid)) {
      toast.error('Enter a valid price, or leave it blank.');
      return;
    }

    const purchasedAt = new Date(`${today()}T00:00:00.000Z`).toISOString();
    const { item, event } = buildPurchase(buying, paid, purchasedAt);

    const created = await storage.createItem(item);
    // The item starts life with the same history every other item has, rather
    // than appearing from nowhere with a purchase date.
    await storage.createItemEvent({ ...event, itemId: created.id });
    await storage.updateWishlistEntry(buying.id, {
      purchasedItemId: created.id,
      purchasedAt,
    });

    setBuying(null);
    setPricePaid('');
    await load();
    toast.success(`${created.name} added to your items`);
  };

  const handleRecordPrice = async () => {
    if (!pricingFor) return;

    const amount = Number(priceAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Enter the price you saw.');
      return;
    }

    await storage.createPriceObservation({
      wishlistEntryId: pricingFor.id,
      organizationId: currentOrg.id,
      amount,
      observedAt: new Date().toISOString(),
      source: 'MANUAL',
      url: pricingFor.url,
    });

    setPricingFor(null);
    setPriceAmount('');
    await load();
    toast.success('Price recorded');
  };

  const handleDelete = async (entry: WishlistEntry) => {
    await storage.deleteWishlistEntry(entry.id);
    await load();
    toast.success('Removed from the wishlist');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-2 -ml-3">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to dashboard
            </Button>
            <h1 className="text-3xl font-bold text-foreground mb-1">Wishlist</h1>
            <p className="text-muted-foreground">
              What you want next, and how close you are to paying for it.
            </p>
          </div>
          <Button onClick={() => setIsAddOpen(true)} data-testid="add-wish">
            <Plus className="h-4 w-4 mr-2" />
            Add something
          </Button>
        </div>

        {totals.outstanding > 0 && (
          <Card className="mb-6" data-testid="wishlist-totals">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-x-10 gap-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Still to buy</p>
                  <p className="text-2xl font-bold tabular-nums">{totals.outstanding}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Set aside</p>
                  <p className="text-2xl font-bold tabular-nums">{money(totals.savedTotal)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Still to find</p>
                  <p className="text-2xl font-bold tabular-nums">{money(totals.remainingTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {priceAlerts.length > 0 && (
          <Card className="mb-6 border-primary" data-testid="price-alerts">
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                {priceAlerts.length === 1 ? 'One thing is' : `${priceAlerts.length} things are`} at
                or below your price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {priceAlerts.map(({ entry, alert }) => (
                  <li key={entry.id} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{entry.name}</span>
                    <span className="tabular-nums">{money(alert.amount)}</span>
                    <span className="text-muted-foreground tabular-nums">
                      ({money(alert.saving)} under your target
                      {alert.isLowestEver ? ', lowest yet' : ''})
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {ready.length > 0 && (
          <Card className="mb-6 border-primary" data-testid="ready-card">
            <CardHeader>
              <CardTitle className="text-primary">
                {ready.length === 1 ? 'One thing is' : `${ready.length} things are`} fully saved for
              </CardTitle>
              <CardDescription>{ready.map((e) => e.name).join(', ')}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {sorted.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Nothing on the list yet</CardTitle>
              <CardDescription>
                Add something you are saving towards, set a target price, and put money aside as you
                go.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="wishlist">
            {sorted.map((entry) => {
              const progress = progressFor(entry, byEntry.get(entry.id) ?? []);
              const bought = Boolean(entry.purchasedItemId);

              return (
                <Card key={entry.id} className={bought ? 'opacity-60' : undefined}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{entry.name}</CardTitle>
                      <Badge variant="outline" className={PRIORITY_STYLES[entry.priority]}>
                        {bought ? 'Bought' : PRIORITY_LABELS[entry.priority]}
                      </Badge>
                    </div>
                    {(entry.brand || entry.model) && (
                      <CardDescription>
                        {[entry.brand, entry.model].filter(Boolean).join(' ')}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="tabular-nums">{money(progress.saved)} saved</span>
                        {progress.target !== undefined && (
                          <span className="text-muted-foreground tabular-nums">
                            of {money(progress.target)}
                          </span>
                        )}
                      </div>
                      {progress.percent !== undefined && (
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                      )}
                      {progress.remaining !== undefined && progress.remaining > 0 && (
                        <p className="text-sm text-muted-foreground tabular-nums">
                          {money(progress.remaining)} to go
                        </p>
                      )}
                    </div>

                    {(() => {
                      const stats = priceStats(pricesByEntry.get(entry.id) ?? []);
                      if (!stats.latest) return null;
                      const direction = trend(pricesByEntry.get(entry.id) ?? []);

                      return (
                        <p className="text-sm text-muted-foreground tabular-nums">
                          Seen at {money(stats.latest.amount)}
                          {direction === 'DOWN' && ' ▼'}
                          {direction === 'UP' && ' ▲'}
                          {stats.lowest && stats.lowest.amount < stats.latest.amount && (
                            <> · lowest {money(stats.lowest.amount)}</>
                          )}
                        </p>
                      );
                    })()}

                    {!bought && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSavingFor(entry)}
                          data-testid={`save-${entry.name}`}
                        >
                          <PiggyBank className="h-4 w-4 mr-1" />
                          Put money aside
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setBuying(entry);
                            setPricePaid(entry.targetPrice ? String(entry.targetPrice) : '');
                          }}
                          data-testid={`buy-${entry.name}`}
                        >
                          <Check className="h-4 w-4 mr-1" />I bought it
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPricingFor(entry)}
                          data-testid={`price-${entry.name}`}
                        >
                          <Tag className="h-4 w-4 mr-1" />
                          Record a price
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(entry)}
                          aria-label={`Remove ${entry.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {bought && entry.purchasedItemId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/items/${entry.purchasedItemId}`)}
                      >
                        View the item
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Add */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to the wishlist</DialogTitle>
            <DialogDescription>Only a name is required.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wish-name">What is it</Label>
              <Input
                id="wish-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wish-brand">Brand</Label>
                <Input
                  id="wish-brand"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wish-model">Model</Label>
                <Input
                  id="wish-model"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wish-target">Target price</Label>
                <Input
                  id="wish-target"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.targetPrice}
                  onChange={(e) => setForm({ ...form, targetPrice: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wish-priority">How badly</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v as WishlistPriority })}
                >
                  <SelectTrigger id="wish-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRIORITY_LABELS) as WishlistPriority[]).map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {PRIORITY_LABELS[priority]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wish-url">Where you saw it</Label>
              <Input
                id="wish-url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wish-notes">Notes</Label>
              <Textarea
                id="wish-notes"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Put money aside */}
      <Dialog open={savingFor !== null} onOpenChange={(open) => !open && setSavingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Put money aside</DialogTitle>
            <DialogDescription>
              Towards {savingFor?.name}. A negative amount takes money back out.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="save-amount">Amount</Label>
              <Input
                id="save-amount"
                type="number"
                step="0.01"
                value={savingAmount}
                onChange={(e) => setSavingAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="save-note">Note</Label>
              <Input
                id="save-note"
                value={savingNote}
                onChange={(e) => setSavingNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSavingFor(null)}>
              Cancel
            </Button>
            <Button onClick={handleContribute}>Add to savings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record a price */}
      <Dialog open={pricingFor !== null} onOpenChange={(open) => !open && setPricingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a price</DialogTitle>
            <DialogDescription>
              What {pricingFor?.name} is going for today. Each one is kept, so you can see whether a
              sale is really a sale.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="price-amount">Price</Label>
            <Input
              id="price-amount"
              type="number"
              step="0.01"
              min="0"
              value={priceAmount}
              onChange={(e) => setPriceAmount(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPricingFor(null)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPrice}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bought it */}
      <Dialog open={buying !== null} onOpenChange={(open) => !open && setBuying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You bought it</DialogTitle>
            <DialogDescription>
              {buying?.name} moves to your items, with what you paid recorded as its acquisition.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="paid-amount">What you actually paid</Label>
            <Input
              id="paid-amount"
              type="number"
              step="0.01"
              min="0"
              value={pricePaid}
              onChange={(e) => setPricePaid(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBuying(null)}>
              Cancel
            </Button>
            <Button onClick={handleBuy}>Add to my items</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
