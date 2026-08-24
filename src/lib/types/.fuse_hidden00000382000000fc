/** One slide in a multi-image/video ad. Each slide carries its own
 *  title/description/link, independent of the ad's own title/description/
 *  linkUrl - e.g. slide 2 of a 4-slide carousel can promote a different
 *  product with a different destination link than slide 1. A field left
 *  blank falls back to the parent ad's own value at render time. */
export interface AdMediaItem {
  /** Client-generated id, stable for list rendering/removal - not a DB id. */
  id: string;
  type: 'image' | 'video';
  /** Image: a data: URL (uploaded) or hosted URL. Video: a hosted URL
   *  (mp4, or an embeddable link) - videos aren't uploaded as data: URLs,
   *  since that would balloon the ad payload to tens of MB. */
  url: string;
  title?: string;
  description?: string;
  linkUrl?: string;
}

export interface Ad {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  /** @deprecated superseded by `media` (which carries per-slide title/
   *  description/link) - kept only so older ads created before this field
   *  existed still render their images. */
  images?: string[];
  /** Multiple images/videos for this one ad to carousel/fade between,
   *  each with its own title/description/link. Takes priority over
   *  `images`/`imageUrl` when non-empty. */
  media?: AdMediaItem[];
  linkUrl?: string;
  type: 'banner' | 'sidebar' | 'in-article' | 'popup' | 'video' | 'text' | 'sponsored' | 'link';
  placement: 'top' | 'middle' | 'bottom' | 'sidebar' | 'in-article' | 'footer' | 'ticker';
  status: 'active' | 'inactive' | 'scheduled';
  views: number;
  clicks: number;
  ctr?: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  priority?: number;
  isTextOnly: boolean;
  textContent?: string;
  backgroundColor?: string;
  textColor?: string;
  buttonText?: string;
  sponsorName?: string;
  targetAudience?: {
    ageRange?: { min: number; max: number };
    location?: string[];
    interests?: string[];
  };
}

export interface AdPlacement {
  id: string;
  name: string;
  description?: string;
  size: {
    width: number;
    height: number;
  };
  positions: string[];
  maxAds: number;
  isActive: boolean;
  supportsTextOnly: boolean;
}

export interface AdAnalytics {
  adId: string;
  date: string;
  impressions: number;
  clicks: number;
  conversions?: number;
  revenue?: number;
  ctr: number;
}

export interface AdCampaign {
  id: string;
  name: string;
  description?: string;
  ads: Ad[];
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  targetImpressions?: number;
  targetClicks?: number;
  createdAt: string;
  updatedAt: string;
}
