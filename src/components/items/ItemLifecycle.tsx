import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ItemStatusBadge } from './ItemStatusBadge';
import { storage } from '@/lib/storage';
import {
  EVENT_LABELS,
  availableActions,
  deriveCustody,
  deriveStatus,
  describeEvent,
  isOverdue,
  sortEvents,
  summariseCosts,
} from '@/lib/lifecycle';
import type { ItemEvent, ItemEventType } from '@/types';
import { toast } from 'sonner';
import { History, Plus } from 'lucide-react';

/** Event types that ask for a person or company. */
const NEEDS_COUNTERPARTY: ReadonlySet<ItemEventType> = new Set<ItemEventType>([
  'LOANED_OUT',
  'SENT_FOR_REPAIR',
  'SOLD',
]);

/** Event types that ask for a due date. */
const NEEDS_DUE_DATE: ReadonlySet<ItemEventType> = new Set<ItemEventType>([
  'LOANED_OUT',
  'SENT_FOR_REPAIR',
]);

/** Event types that ask for money, and what to call it. */
const AMOUNT_LABELS: Partial<Record<ItemEventType, string>> = {
  REPAIR_COMPLETED: 'Repair cost',
  SOLD: 'Sale price',
  ACQUIRED: 'Purchase price',
  VALUE_REASSESSED: 'Estimated value',
};

const COUNTERPARTY_LABELS: Partial<Record<ItemEventType, string>> = {
  LOANED_OUT: 'Lent to',
  SENT_FOR_REPAIR: 'Sent to',
  SOLD: 'Sold to',
};

function today(): string {
  return new Date().toISOString().split('T')[0] as string;
}

interface ItemLifecycleProps {
  itemId: string;
  organizationId: string;
}

export function ItemLifecycle({ itemId, organizationId }: ItemLifecycleProps) {
  const [events, setEvents] = useState<ItemEvent[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [type, setType] = useState<ItemEventType>('LOANED_OUT');
  const [occurredAt, setOccurredAt] = useState(today());
  const [counterparty, setCounterparty] = useState('');
  const [expectedBackOn, setExpectedBackOn] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setEvents(await storage.getItemEventsByItem(itemId));
  }, [itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  const status = deriveStatus(events);
  const custody = deriveCustody(events);
  const overdue = isOverdue(events);
  const costs = summariseCosts(events);
  const actions = availableActions(events);

  const openDialog = () => {
    setType(actions[0] ?? 'NOTE');
    setOccurredAt(today());
    setCounterparty('');
    setExpectedBackOn('');
    setAmount('');
    setNote('');
    setIsOpen(true);
  };

  const handleRecord = async () => {
    setIsSaving(true);
    try {
      const parsedAmount = amount.trim() === '' ? undefined : Number(amount);
      if (parsedAmount !== undefined && !Number.isFinite(parsedAmount)) {
        toast.error('Enter a valid amount, or leave it blank.');
        return;
      }

      await storage.createItemEvent({
        itemId,
        organizationId,
        type,
        occurredAt: new Date(`${occurredAt}T00:00:00.000Z`).toISOString(),
        counterparty: counterparty.trim() || undefined,
        expectedBackOn: expectedBackOn
          ? new Date(`${expectedBackOn}T00:00:00.000Z`).toISOString()
          : undefined,
        amount: parsedAmount,
        note: note.trim() || undefined,
      });

      await load();
      setIsOpen(false);
      toast.success(`${EVENT_LABELS[type]} recorded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not record that');
    } finally {
      setIsSaving(false);
    }
  };

  const amountLabel = AMOUNT_LABELS[type];
  const counterpartyLabel = COUNTERPARTY_LABELS[type] ?? 'Who';

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              History
            </CardTitle>
            <CardDescription>
              Everything that has happened to this item, oldest first.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <ItemStatusBadge status={status} overdue={overdue} />
            <Button type="button" size="sm" onClick={openDialog} data-testid="record-event">
              <Plus className="h-4 w-4 mr-1" />
              Record
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {custody.holder && (
          <p className="text-sm" data-testid="custody-line">
            Currently with <strong>{custody.holder}</strong>
            {custody.expectedBackOn && (
              <>
                {' '}
                · due back {new Date(custody.expectedBackOn).toLocaleDateString()}
                {overdue && <span className="text-destructive font-medium"> (overdue)</span>}
              </>
            )}
          </p>
        )}

        {(costs.repairTotal > 0 || costs.saleAmount !== undefined || costs.loanCount > 0) && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {costs.loanCount > 0 && <span>Lent out {costs.loanCount}×</span>}
            {costs.repairTotal > 0 && <span>Repairs: {costs.repairTotal.toFixed(2)}</span>}
            {costs.saleAmount !== undefined && <span>Sold for {costs.saleAmount.toFixed(2)}</span>}
          </div>
        )}

        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="no-history">
            Nothing recorded yet. Use Record to log a loan, a repair, or a sale.
          </p>
        ) : (
          <ol className="space-y-3" data-testid="timeline">
            {sortEvents(events).map((event) => (
              <li key={event.id} className="flex gap-3 text-sm">
                <span className="text-muted-foreground tabular-nums whitespace-nowrap">
                  {new Date(event.occurredAt).toLocaleDateString()}
                </span>
                <span className="flex-1">
                  <span className="font-medium">{describeEvent(event)}</span>
                  {typeof event.amount === 'number' && (
                    <span className="text-muted-foreground"> · {event.amount.toFixed(2)}</span>
                  )}
                  {event.note && <span className="block text-muted-foreground">{event.note}</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record what happened</DialogTitle>
            <DialogDescription>
              Only the actions that make sense for this item right now are offered.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-type">What happened</Label>
              <Select value={type} onValueChange={(v) => setType(v as ItemEventType)}>
                <SelectTrigger id="event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {EVENT_LABELS[action]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-date">When</Label>
              <Input
                id="event-date"
                type="date"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </div>

            {NEEDS_COUNTERPARTY.has(type) && (
              <div className="space-y-2">
                <Label htmlFor="event-counterparty">{counterpartyLabel}</Label>
                <Input
                  id="event-counterparty"
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                  placeholder="Name"
                />
              </div>
            )}

            {NEEDS_DUE_DATE.has(type) && (
              <div className="space-y-2">
                <Label htmlFor="event-due">Expected back</Label>
                <Input
                  id="event-due"
                  type="date"
                  value={expectedBackOn}
                  onChange={(e) => setExpectedBackOn(e.target.value)}
                />
              </div>
            )}

            {amountLabel && (
              <div className="space-y-2">
                <Label htmlFor="event-amount">{amountLabel}</Label>
                <Input
                  id="event-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="event-note">Note</Label>
              <Textarea
                id="event-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleRecord} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
