/**
 * Column scale shared by every card collection (resource cards, section
 * tiles), same as the `console` device grids: 1 column, 2 from `sm`, 3 from
 * `lg`, 4 from `xl` and 5 from 1920px (large or 4K screens).
 */
export const cardGridClass =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[120rem]:grid-cols-5"

/**
 * Grid of compact cards: as many 17rem columns as fit. Cards keep their own
 * width when there are few, instead of the scale above reserving columns.
 */
export const compactCardGridClass =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-3"
