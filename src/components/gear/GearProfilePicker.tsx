import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { profileLabel, searchProfiles } from '@/lib/gear';
import type { GearProfile } from '@/types';
import { BookOpen, X } from 'lucide-react';

interface GearProfilePickerProps {
  profiles: readonly GearProfile[];
  /** The currently linked profile, if any. */
  selected: GearProfile | null;
  onSelect: (profile: GearProfile) => void;
  onClear: () => void;
}

/** How many results to offer before asking for a narrower query. */
const RESULT_LIMIT = 6;

/**
 * Choosing the make and model an item is an instance of.
 *
 * A search box rather than a dropdown: the catalogue is meant to grow, and a
 * select listing every model anyone has ever contributed stops being usable
 * long before that is interesting.
 */
export function GearProfilePicker({
  profiles,
  selected,
  onSelect,
  onClear,
}: GearProfilePickerProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(
    () => (query.trim() ? searchProfiles(profiles, query, RESULT_LIMIT) : []),
    [profiles, query]
  );

  if (selected) {
    return (
      <div>
        <Label>Gear profile</Label>
        <div
          data-testid="gear-profile-selected"
          className="mt-1 flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{profileLabel(selected)}</p>
            {selected.productType && (
              <p className="truncate text-xs text-muted-foreground">{selected.productType}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={selected.source === 'USER' ? 'secondary' : 'outline'}>
              {selected.source === 'USER' ? 'Yours' : 'Catalogue'}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Unlink gear profile"
              onClick={onClear}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor="gear-profile-search">Gear profile</Label>
      <Input
        id="gear-profile-search"
        value={query}
        placeholder="Search a make and model, e.g. DeWalt DCD791"
        onChange={(event) => setQuery(event.target.value)}
      />

      {query.trim() && results.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Nothing in the catalogue matches. Fill in brand and model yourself — the item works the
          same either way.
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-2 divide-y rounded-md border" aria-label="Matching gear profiles">
          {results.map((profile) => (
            <li key={profile.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                onClick={() => {
                  onSelect(profile);
                  setQuery('');
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {profileLabel(profile)}
                  </span>
                  {profile.productType && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {profile.productType}
                    </span>
                  )}
                </span>
                <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
