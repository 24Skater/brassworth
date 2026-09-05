import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { profileLabel } from '@/lib/gear';
import type { GearProfile } from '@/types';
import { ExternalLink } from 'lucide-react';

interface GearProfilePanelProps {
  profile: GearProfile;
}

interface CatalogueLinkProps {
  href: string;
  children: string;
}

/**
 * A link out of a catalogue record.
 *
 * `noopener` matters here specifically: the target is a URL from a data file
 * the app did not write, and without it the opened page can reach back through
 * `window.opener`.
 */
function CatalogueLink({ href, children }: CatalogueLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
    >
      {children}
      <ExternalLink className="h-3 w-3" aria-hidden="true" />
    </a>
  );
}

/**
 * What is known about this make and model.
 *
 * The specs live on the profile rather than on the item, so this panel shows
 * the same thing for every drill of the same model — and correcting a spec
 * fixes all of them at once. That is the whole point of profiles existing
 * rather than more item fields.
 */
export function GearProfilePanel({ profile }: GearProfilePanelProps) {
  const links = [
    profile.manualUrl ? { href: profile.manualUrl, label: 'Manual' } : null,
    profile.partsUrl ? { href: profile.partsUrl, label: 'Parts' } : null,
    profile.productUrl ? { href: profile.productUrl, label: 'Product page' } : null,
  ].filter((link): link is { href: string; label: string } => link !== null);

  return (
    <Card data-testid="gear-profile-panel">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">{profileLabel(profile)}</CardTitle>
            {profile.productType && <CardDescription>{profile.productType}</CardDescription>}
          </div>
          <Badge variant={profile.source === 'USER' ? 'secondary' : 'outline'}>
            {profile.source === 'USER' ? 'Yours' : 'Catalogue'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {profile.specs.length > 0 ? (
          <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {profile.specs.map((spec) => (
              <div key={`${spec.label}-${spec.value}`} className="flex justify-between gap-3">
                <dt className="text-sm text-muted-foreground">{spec.label}</dt>
                <dd className="text-sm font-medium">
                  {spec.value}
                  {spec.unit ? ` ${spec.unit}` : ''}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No specifications recorded yet.</p>
        )}

        {links.length > 0 && (
          <div className="flex flex-wrap gap-4">
            {links.map((link) => (
              <CatalogueLink key={link.href} href={link.href}>
                {link.label}
              </CatalogueLink>
            ))}
          </div>
        )}

        {profile.source === 'CATALOGUE' && profile.licence && (
          <p className="text-xs text-muted-foreground">
            {profile.sourceName ?? 'Catalogue'} · {profile.licence}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
