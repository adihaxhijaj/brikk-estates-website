/** Filter options, derived from the listings actually shown on a page. */
export interface Facets {
  deals: string[];
  categories: string[];
  cities: string[];
  neighbourhoods: string[];
  bedrooms: number[];
  hasFurnished: boolean;
  hasNewBuild: boolean;
}
