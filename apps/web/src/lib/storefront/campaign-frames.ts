import type { GrowthPage } from '@almina/contracts';
import { heroArtwork, promoStripArtwork, stripArtwork, supportingArtwork, type ArtworkFrames } from './artwork';

/** The frames a campaign's artwork fills, by its homepage position. Popups and landing pages have no fixed banner frame. */
export function campaignFrames(page: Pick<GrowthPage, 'homepagePlacement' | 'stripSlot'>): ArtworkFrames | null {
  if (page.homepagePlacement === 'hero') return heroArtwork;
  if (page.homepagePlacement === 'secondary') return supportingArtwork;
  if (page.homepagePlacement === 'strip') return page.stripSlot === 'home-promo' ? promoStripArtwork : stripArtwork;
  return null;
}
