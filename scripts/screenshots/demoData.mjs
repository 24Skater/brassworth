/**
 * The demo dataset used for README screenshots.
 *
 * This is deliberately not lorem ipsum. Screenshots sell the product, and a
 * grid of "Item 1 / Item 2 / Test Widget" sells nothing — a reader has to
 * recognise their own garage in the picture. So the gear here is real gear at
 * real prices, the loans are to people with names, and the history has the
 * shape a real history has: mostly quiet, with a few things going wrong.
 *
 * Nothing here ships in the app. It is written straight into localStorage by
 * `capture.mjs` before each screenshot and thrown away afterwards.
 */

/** Every date in the set is relative to this, so screenshots never go stale. */
const TODAY = new Date();

function daysAgo(n) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysAhead(n) {
  return daysAgo(-n);
}

/** A calendar date without the time, for date-only fields. */
function dateOnly(iso) {
  return iso.slice(0, 10);
}

const ORG_ID = 'org-whitfield';

// --- Locations -------------------------------------------------------------
// Nested, because real storage is nested: a chest inside a garage.

const LOC = {
  garage: 'loc-garage',
  pegboard: 'loc-pegboard',
  chest: 'loc-chest',
  basement: 'loc-basement',
  rack: 'loc-rack',
  van: 'loc-van',
  studio: 'loc-studio',
};

const locations = [
  { id: LOC.garage, organizationId: ORG_ID, name: 'Garage' },
  {
    id: LOC.pegboard,
    organizationId: ORG_ID,
    name: 'Pegboard wall',
    parentLocationId: LOC.garage,
  },
  {
    id: LOC.chest,
    organizationId: ORG_ID,
    name: 'Rolling chest',
    parentLocationId: LOC.garage,
    notes: 'Top two drawers are hand tools, bottom is cordless batteries.',
  },
  { id: LOC.basement, organizationId: ORG_ID, name: 'Basement' },
  {
    id: LOC.rack,
    organizationId: ORG_ID,
    name: 'Network rack',
    parentLocationId: LOC.basement,
  },
  { id: LOC.van, organizationId: ORG_ID, name: 'Work van' },
  { id: LOC.studio, organizationId: ORG_ID, name: 'Spare room studio' },
];

// --- Categories ------------------------------------------------------------

const CAT = {
  power: 'cat-power',
  hand: 'cat-hand',
  measuring: 'cat-measuring',
  network: 'cat-network',
  audio: 'cat-audio',
  photo: 'cat-photo',
  yard: 'cat-yard',
};

const categories = [
  { id: CAT.power, organizationId: ORG_ID, name: 'Power tools' },
  { id: CAT.hand, organizationId: ORG_ID, name: 'Hand tools' },
  { id: CAT.measuring, organizationId: ORG_ID, name: 'Measuring and layout' },
  { id: CAT.network, organizationId: ORG_ID, name: 'Network gear' },
  { id: CAT.audio, organizationId: ORG_ID, name: 'Audio' },
  { id: CAT.photo, organizationId: ORG_ID, name: 'Photography' },
  { id: CAT.yard, organizationId: ORG_ID, name: 'Yard and garden' },
];

// --- Tags ------------------------------------------------------------------

const tags = [
  { id: 'tag-cordless', organizationId: ORG_ID, name: 'cordless' },
  { id: 'tag-18v', organizationId: ORG_ID, name: '18V' },
  { id: 'tag-insured', organizationId: ORG_ID, name: 'insured' },
  { id: 'tag-warranty', organizationId: ORG_ID, name: 'under warranty' },
  { id: 'tag-rack', organizationId: ORG_ID, name: 'rack mount' },
];

// --- Items -----------------------------------------------------------------
// A believable spread: a lot of mid-priced tools, a few expensive things, one
// or two cheap ones. Serial numbers are plausible in shape but invented.

/** Fills in the fields every item shares so the list below stays readable. */
function item(partial) {
  return {
    description: undefined,
    quantity: 1,
    isArchived: false,
    tags: [],
    depreciationMethod: 'NONE',
    createdAt: partial.purchaseDate ? `${partial.purchaseDate}T09:00:00.000Z` : daysAgo(400),
    updatedAt: daysAgo(12),
    organizationId: ORG_ID,
    ...partial,
  };
}

const items = [
  item({
    id: 'itm-drill',
    name: 'Cordless hammer drill',
    brand: 'DeWalt',
    model: 'DCD996',
    serialNumber: 'DW2224-118392',
    categoryId: CAT.power,
    locationId: LOC.chest,
    purchaseDate: dateOnly(daysAgo(690)),
    purchasePrice: 219.0,
    purchaseLocation: 'STORE',
    purchaseSourceName: 'Ace Hardware',
    condition: 'GOOD',
    depreciationMethod: 'DECLINING_BALANCE',
    declineRatePerYear: 0.2,
    salvageValue: 60,
    tags: ['cordless', '18V'],
    notes: 'Second battery lives in the chest, not with the drill.',
  }),
  item({
    id: 'itm-impact',
    name: 'Impact driver',
    brand: 'Milwaukee',
    model: '2853-20',
    serialNumber: 'MW-D71FD-0042',
    categoryId: CAT.power,
    locationId: LOC.chest,
    purchaseDate: dateOnly(daysAgo(430)),
    purchasePrice: 179.0,
    purchaseLocation: 'ONLINE',
    purchaseSourceName: 'Acme Tool',
    condition: 'GOOD',
    depreciationMethod: 'DECLINING_BALANCE',
    declineRatePerYear: 0.2,
    salvageValue: 45,
    tags: ['cordless', '18V'],
  }),
  item({
    id: 'itm-tracksaw',
    name: 'Track saw with 55" rail',
    brand: 'Festool',
    model: 'TS 55 FEQ',
    serialNumber: 'FT-490310-77',
    categoryId: CAT.power,
    locationId: LOC.garage,
    purchaseDate: dateOnly(daysAgo(1120)),
    purchasePrice: 675.0,
    purchaseLocation: 'STORE',
    purchaseSourceName: 'Woodcraft',
    condition: 'GOOD',
    depreciationMethod: 'STRAIGHT_LINE',
    usefulLifeMonths: 120,
    salvageValue: 200,
    tags: ['insured'],
    notes: 'Rail is stored flat on the pegboard wall, never leaned.',
  }),
  item({
    id: 'itm-router',
    name: 'Compact router',
    brand: 'Makita',
    model: 'RT0701C',
    categoryId: CAT.power,
    locationId: LOC.pegboard,
    purchaseDate: dateOnly(daysAgo(915)),
    purchasePrice: 99.0,
    purchaseLocation: 'ONLINE',
    purchaseSourceName: 'Acme Tool',
    condition: 'FAIR',
    depreciationMethod: 'DECLINING_BALANCE',
    declineRatePerYear: 0.25,
    salvageValue: 25,
  }),
  item({
    id: 'itm-sander',
    name: 'Random orbit sander',
    brand: 'Bosch',
    model: 'ROS20VSC',
    categoryId: CAT.power,
    locationId: LOC.pegboard,
    purchaseDate: dateOnly(daysAgo(1290)),
    purchasePrice: 79.0,
    purchaseLocation: 'STORE',
    condition: 'FAIR',
    depreciationMethod: 'DECLINING_BALANCE',
    declineRatePerYear: 0.25,
    salvageValue: 20,
  }),
  item({
    id: 'itm-planer',
    name: 'Benchtop thickness planer',
    brand: 'DeWalt',
    model: 'DW735X',
    serialNumber: 'DW735-2019-4471',
    categoryId: CAT.power,
    locationId: LOC.garage,
    purchaseDate: dateOnly(daysAgo(1580)),
    purchasePrice: 649.0,
    purchaseLocation: 'ONLINE',
    purchaseSourceName: 'Acme Tool',
    condition: 'GOOD',
    depreciationMethod: 'STRAIGHT_LINE',
    usefulLifeMonths: 144,
    salvageValue: 180,
    tags: ['insured'],
  }),
  item({
    id: 'itm-multitool',
    name: 'Oscillating multi-tool',
    brand: 'Milwaukee',
    model: '2836-20',
    categoryId: CAT.power,
    locationId: LOC.van,
    purchaseDate: dateOnly(daysAgo(260)),
    purchasePrice: 149.0,
    purchaseLocation: 'STORE',
    condition: 'NEW',
    depreciationMethod: 'DECLINING_BALANCE',
    declineRatePerYear: 0.2,
    salvageValue: 40,
    tags: ['cordless', '18V', 'under warranty'],
  }),
  item({
    id: 'itm-socket',
    name: 'Socket set, 1/4" and 3/8" drive',
    brand: 'Wera',
    model: '8100 SB 2',
    categoryId: CAT.hand,
    locationId: LOC.chest,
    purchaseDate: dateOnly(daysAgo(820)),
    purchasePrice: 289.0,
    purchaseLocation: 'ONLINE',
    condition: 'GOOD',
    quantity: 1,
  }),
  item({
    id: 'itm-chisels',
    name: 'Bench chisel set, four piece',
    brand: 'Narex',
    model: '863010',
    categoryId: CAT.hand,
    locationId: LOC.pegboard,
    purchaseDate: dateOnly(daysAgo(1010)),
    purchasePrice: 62.0,
    purchaseLocation: 'ONLINE',
    condition: 'GOOD',
    quantity: 4,
  }),
  item({
    id: 'itm-handplane',
    name: 'No. 4 smoothing plane',
    brand: 'Lie-Nielsen',
    model: 'No. 4',
    categoryId: CAT.hand,
    locationId: LOC.pegboard,
    purchaseDate: dateOnly(daysAgo(2100)),
    purchasePrice: 350.0,
    purchaseLocation: 'STORE',
    condition: 'GOOD',
    depreciationMethod: 'MANUAL',
    currentEstimatedValue: 320.0,
    tags: ['insured'],
    notes: 'Holds value. Worth more used than most tools are new.',
  }),
  item({
    id: 'itm-laser',
    name: 'Cross-line laser level',
    brand: 'Bosch',
    model: 'GLL 3-330CG',
    serialNumber: 'BO-3330-88214',
    categoryId: CAT.measuring,
    locationId: LOC.chest,
    purchaseDate: dateOnly(daysAgo(540)),
    purchasePrice: 399.0,
    purchaseLocation: 'ONLINE',
    condition: 'GOOD',
    depreciationMethod: 'STRAIGHT_LINE',
    usefulLifeMonths: 96,
    salvageValue: 90,
  }),
  item({
    id: 'itm-caliper',
    name: 'Digital caliper, 6 inch',
    brand: 'Mitutoyo',
    model: '500-196-30',
    categoryId: CAT.measuring,
    locationId: LOC.chest,
    purchaseDate: dateOnly(daysAgo(1450)),
    purchasePrice: 142.0,
    purchaseLocation: 'ONLINE',
    condition: 'GOOD',
  }),
  item({
    id: 'itm-moisture',
    name: 'Pin moisture meter',
    brand: 'Wagner',
    model: 'MMC220',
    categoryId: CAT.measuring,
    locationId: LOC.garage,
    purchaseDate: dateOnly(daysAgo(300)),
    purchasePrice: 279.0,
    purchaseLocation: 'ONLINE',
    condition: 'NEW',
    tags: ['under warranty'],
  }),
  item({
    id: 'itm-switch',
    name: '24-port PoE+ switch',
    brand: 'Ubiquiti',
    model: 'USW-Pro-24-PoE',
    serialNumber: 'UI-7483C29A11B4',
    categoryId: CAT.network,
    locationId: LOC.rack,
    purchaseDate: dateOnly(daysAgo(620)),
    purchasePrice: 719.0,
    purchaseLocation: 'ONLINE',
    purchaseSourceName: 'Ubiquiti Store',
    condition: 'GOOD',
    depreciationMethod: 'STRAIGHT_LINE',
    usefulLifeMonths: 60,
    salvageValue: 120,
    tags: ['rack mount', 'insured'],
  }),
  item({
    id: 'itm-nas',
    name: '4-bay NAS',
    brand: 'Synology',
    model: 'DS923+',
    serialNumber: 'SY-2340RQN01947',
    categoryId: CAT.network,
    locationId: LOC.rack,
    purchaseDate: dateOnly(daysAgo(410)),
    purchasePrice: 599.0,
    purchaseLocation: 'ONLINE',
    condition: 'GOOD',
    depreciationMethod: 'STRAIGHT_LINE',
    usefulLifeMonths: 60,
    salvageValue: 90,
    tags: ['rack mount', 'insured'],
    notes: 'Four 8TB drives tracked separately.',
  }),
  item({
    id: 'itm-ups',
    name: 'Rack UPS, 1500VA',
    brand: 'APC',
    model: 'SMT1500RM2U',
    categoryId: CAT.network,
    locationId: LOC.rack,
    purchaseDate: dateOnly(daysAgo(1180)),
    purchasePrice: 549.0,
    purchaseLocation: 'ONLINE',
    condition: 'FAIR',
    depreciationMethod: 'STRAIGHT_LINE',
    usefulLifeMonths: 60,
    salvageValue: 50,
    tags: ['rack mount'],
    notes: 'Battery replaced once. Due again next spring.',
  }),
  item({
    id: 'itm-ap',
    name: 'Ceiling access point',
    brand: 'Ubiquiti',
    model: 'U6-Pro',
    categoryId: CAT.network,
    locationId: LOC.basement,
    purchaseDate: dateOnly(daysAgo(380)),
    purchasePrice: 159.0,
    purchaseLocation: 'ONLINE',
    condition: 'GOOD',
    quantity: 3,
    depreciationMethod: 'STRAIGHT_LINE',
    usefulLifeMonths: 60,
    salvageValue: 25,
  }),
  item({
    id: 'itm-interface',
    name: 'USB audio interface, 8 preamp',
    brand: 'Focusrite',
    model: 'Scarlett 18i20',
    serialNumber: 'FR-S18-2291043',
    categoryId: CAT.audio,
    locationId: LOC.studio,
    purchaseDate: dateOnly(daysAgo(760)),
    purchasePrice: 649.0,
    purchaseLocation: 'ONLINE',
    condition: 'GOOD',
    depreciationMethod: 'STRAIGHT_LINE',
    usefulLifeMonths: 84,
    salvageValue: 150,
    tags: ['rack mount', 'insured'],
  }),
  item({
    id: 'itm-mic',
    name: 'Large diaphragm condenser mic',
    brand: 'Rode',
    model: 'NT1 5th Gen',
    categoryId: CAT.audio,
    locationId: LOC.studio,
    purchaseDate: dateOnly(daysAgo(220)),
    purchasePrice: 249.0,
    purchaseLocation: 'STORE',
    purchaseSourceName: 'Sweetwater',
    condition: 'NEW',
    quantity: 2,
    tags: ['under warranty'],
  }),
  item({
    id: 'itm-monitors',
    name: 'Studio monitors, 5 inch',
    brand: 'Yamaha',
    model: 'HS5',
    categoryId: CAT.audio,
    locationId: LOC.studio,
    purchaseDate: dateOnly(daysAgo(1340)),
    purchasePrice: 418.0,
    purchaseLocation: 'ONLINE',
    condition: 'GOOD',
    quantity: 2,
    depreciationMethod: 'STRAIGHT_LINE',
    usefulLifeMonths: 120,
    salvageValue: 120,
  }),
  item({
    id: 'itm-camera',
    name: 'Mirrorless camera body',
    brand: 'Fujifilm',
    model: 'X-T5',
    serialNumber: 'FJ-2C4019887',
    categoryId: CAT.photo,
    locationId: LOC.studio,
    purchaseDate: dateOnly(daysAgo(480)),
    purchasePrice: 1699.0,
    purchaseLocation: 'STORE',
    purchaseSourceName: 'B&H',
    condition: 'GOOD',
    depreciationMethod: 'DECLINING_BALANCE',
    declineRatePerYear: 0.22,
    salvageValue: 400,
    tags: ['insured'],
  }),
  item({
    id: 'itm-lens',
    name: '16-55mm f/2.8 lens',
    brand: 'Fujifilm',
    model: 'XF16-55mmR LM WR',
    categoryId: CAT.photo,
    locationId: LOC.studio,
    purchaseDate: dateOnly(daysAgo(480)),
    purchasePrice: 1199.0,
    purchaseLocation: 'STORE',
    purchaseSourceName: 'B&H',
    condition: 'GOOD',
    depreciationMethod: 'DECLINING_BALANCE',
    declineRatePerYear: 0.12,
    salvageValue: 500,
    tags: ['insured'],
  }),
  item({
    id: 'itm-tripod',
    name: 'Carbon tripod with ball head',
    brand: 'Manfrotto',
    model: 'MT055CXPRO4',
    categoryId: CAT.photo,
    locationId: LOC.studio,
    purchaseDate: dateOnly(daysAgo(1620)),
    purchasePrice: 429.0,
    purchaseLocation: 'ONLINE',
    condition: 'GOOD',
  }),
  item({
    id: 'itm-mower',
    name: 'Self-propelled mower',
    brand: 'Honda',
    model: 'HRX217VKA',
    serialNumber: 'HN-MAGA-1180422',
    categoryId: CAT.yard,
    locationId: LOC.garage,
    purchaseDate: dateOnly(daysAgo(1750)),
    purchasePrice: 799.0,
    purchaseLocation: 'STORE',
    purchaseSourceName: 'Home Depot',
    condition: 'FAIR',
    depreciationMethod: 'STRAIGHT_LINE',
    usefulLifeMonths: 120,
    salvageValue: 100,
  }),
  item({
    id: 'itm-blower',
    name: 'Backpack leaf blower',
    brand: 'Stihl',
    model: 'BR 600',
    categoryId: CAT.yard,
    locationId: LOC.garage,
    purchaseDate: dateOnly(daysAgo(980)),
    purchasePrice: 519.0,
    purchaseLocation: 'STORE',
    condition: 'GOOD',
    depreciationMethod: 'STRAIGHT_LINE',
    usefulLifeMonths: 96,
    salvageValue: 80,
  }),
  item({
    id: 'itm-pressure',
    name: 'Pressure washer, 3100 PSI',
    brand: 'Ryobi',
    model: 'RY803023',
    categoryId: CAT.yard,
    locationId: LOC.garage,
    purchaseDate: dateOnly(daysAgo(1490)),
    purchasePrice: 399.0,
    purchaseLocation: 'STORE',
    condition: 'POOR',
    depreciationMethod: 'STRAIGHT_LINE',
    usefulLifeMonths: 84,
    salvageValue: 40,
    notes: 'Pump surges under load. Worth repairing or replacing this season.',
  }),
  item({
    id: 'itm-jointer',
    name: '6 inch benchtop jointer',
    brand: 'Wen',
    model: 'JT6561',
    categoryId: CAT.power,
    locationId: LOC.garage,
    purchaseDate: dateOnly(daysAgo(2200)),
    purchasePrice: 289.0,
    purchaseLocation: 'ONLINE',
    condition: 'DISPOSED',
    isArchived: false,
    notes: 'Sold once the planer earned its space.',
  }),
];

// --- Lifecycle events ------------------------------------------------------
// The shape of a real history: an ACQUIRED for everything, then a handful of
// things that actually happened. One loan is overdue on purpose — an empty
// "overdue" panel on the dashboard would be a screenshot of nothing.

function acquired(itemId, purchaseDate, amount) {
  return {
    id: `evt-acq-${itemId}`,
    itemId,
    organizationId: ORG_ID,
    type: 'ACQUIRED',
    occurredAt: `${purchaseDate}T09:00:00.000Z`,
    amount,
    createdAt: `${purchaseDate}T09:00:00.000Z`,
  };
}

const itemEvents = [
  // Every owned item was acquired at some point.
  ...items
    .filter((i) => i.purchaseDate)
    .map((i) => acquired(i.id, i.purchaseDate, i.purchasePrice)),

  // The impact driver went to a neighbour and has not come back.
  {
    id: 'evt-loan-impact',
    itemId: 'itm-impact',
    organizationId: ORG_ID,
    type: 'LOANED_OUT',
    occurredAt: daysAgo(31),
    counterparty: 'Marcus Reyes (next door)',
    expectedBackOn: dateOnly(daysAgo(10)),
    note: 'Deck rebuild. Said two weeks.',
    createdAt: daysAgo(31),
  },

  // The track saw is out too, but not yet due back.
  {
    id: 'evt-loan-tracksaw',
    itemId: 'itm-tracksaw',
    organizationId: ORG_ID,
    type: 'LOANED_OUT',
    occurredAt: daysAgo(6),
    counterparty: 'Priya Nandakumar',
    expectedBackOn: dateOnly(daysAhead(8)),
    note: 'Kitchen cabinet doors. Rail went with it.',
    createdAt: daysAgo(6),
  },

  // The mower had a full break-and-repair cycle.
  {
    id: 'evt-broke-mower',
    itemId: 'itm-mower',
    organizationId: ORG_ID,
    type: 'BROKE',
    occurredAt: daysAgo(140),
    note: 'Would not hold self-propel. Cable stretched.',
    createdAt: daysAgo(140),
  },
  {
    id: 'evt-repairsent-mower',
    itemId: 'itm-mower',
    organizationId: ORG_ID,
    type: 'SENT_FOR_REPAIR',
    occurredAt: daysAgo(136),
    counterparty: 'Gallo Small Engine',
    createdAt: daysAgo(136),
  },
  {
    id: 'evt-repairdone-mower',
    itemId: 'itm-mower',
    organizationId: ORG_ID,
    type: 'REPAIR_COMPLETED',
    occurredAt: daysAgo(119),
    amount: 118.5,
    note: 'Drive cable and a new blade while it was in.',
    createdAt: daysAgo(119),
  },

  // The pressure washer is broken right now.
  {
    id: 'evt-broke-pressure',
    itemId: 'itm-pressure',
    organizationId: ORG_ID,
    type: 'BROKE',
    occurredAt: daysAgo(22),
    note: 'Pump surges under load. Unloader valve, probably.',
    createdAt: daysAgo(22),
  },

  // The router is away being serviced.
  {
    id: 'evt-repair-router',
    itemId: 'itm-router',
    organizationId: ORG_ID,
    type: 'SENT_FOR_REPAIR',
    occurredAt: daysAgo(9),
    counterparty: 'Makita service centre',
    expectedBackOn: dateOnly(daysAhead(12)),
    note: 'Depth lock slips. Under the extended warranty.',
    createdAt: daysAgo(9),
  },

  // The jointer was sold, which is the end of the arc the product tracks.
  {
    id: 'evt-sold-jointer',
    itemId: 'itm-jointer',
    organizationId: ORG_ID,
    type: 'SOLD',
    occurredAt: daysAgo(64),
    counterparty: 'Marketplace buyer',
    amount: 165.0,
    note: 'Bought for 289 six years ago. Kept 57 percent.',
    createdAt: daysAgo(64),
  },

  // A borrowed thing that did come back, so the log is not all bad news.
  {
    id: 'evt-loan-laser',
    itemId: 'itm-laser',
    organizationId: ORG_ID,
    type: 'LOANED_OUT',
    occurredAt: daysAgo(88),
    counterparty: 'Dad',
    expectedBackOn: dateOnly(daysAgo(74)),
    createdAt: daysAgo(88),
  },
  {
    id: 'evt-return-laser',
    itemId: 'itm-laser',
    organizationId: ORG_ID,
    type: 'RETURNED',
    occurredAt: daysAgo(70),
    counterparty: 'Dad',
    note: 'Four days late, case intact.',
    createdAt: daysAgo(70),
  },

  // Something moved, which is the other thing histories are for.
  {
    id: 'evt-moved-multitool',
    itemId: 'itm-multitool',
    organizationId: ORG_ID,
    type: 'MOVED',
    occurredAt: daysAgo(17),
    locationId: LOC.van,
    note: 'Lives in the van now.',
    createdAt: daysAgo(17),
  },
  {
    id: 'evt-reval-plane',
    itemId: 'itm-handplane',
    organizationId: ORG_ID,
    type: 'VALUE_REASSESSED',
    occurredAt: daysAgo(45),
    amount: 320.0,
    note: 'Same model going for 310-330 used.',
    createdAt: daysAgo(45),
  },
];

// --- Wishlist, savings and price history -----------------------------------

const wishlist = [
  {
    id: 'wsh-domino',
    organizationId: ORG_ID,
    name: 'Domino joiner',
    brand: 'Festool',
    model: 'DF 500 Q',
    categoryId: CAT.power,
    targetPrice: 950.0,
    priority: 'HIGH',
    url: 'https://example.com/festool-df500',
    notes: 'Waiting for the spring promotion. Never discounted otherwise.',
    createdAt: daysAgo(210),
    updatedAt: daysAgo(4),
  },
  {
    id: 'wsh-dustext',
    organizationId: ORG_ID,
    name: 'Cyclone dust extractor',
    brand: 'Oneida',
    model: 'Dust Deputy Deluxe',
    categoryId: CAT.power,
    targetPrice: 320.0,
    priority: 'MEDIUM',
    createdAt: daysAgo(150),
    updatedAt: daysAgo(11),
  },
  {
    id: 'wsh-nvr',
    organizationId: ORG_ID,
    name: 'Network video recorder',
    brand: 'Ubiquiti',
    model: 'UNVR',
    categoryId: CAT.network,
    targetPrice: 400.0,
    priority: 'MEDIUM',
    notes: 'Only worth it once the cameras go up.',
    createdAt: daysAgo(96),
    updatedAt: daysAgo(20),
  },
  {
    id: 'wsh-torque',
    organizationId: ORG_ID,
    name: 'Torque wrench, 1/2" drive',
    brand: 'Precision Instruments',
    model: 'PREC3FR250F',
    categoryId: CAT.hand,
    targetPrice: 180.0,
    priority: 'LOW',
    createdAt: daysAgo(60),
    updatedAt: daysAgo(60),
  },
];

const savings = [
  { id: 'sav-1', wishlistEntryId: 'wsh-domino', amount: 150, occurredAt: daysAgo(196) },
  { id: 'sav-2', wishlistEntryId: 'wsh-domino', amount: 150, occurredAt: daysAgo(165) },
  { id: 'sav-3', wishlistEntryId: 'wsh-domino', amount: 200, occurredAt: daysAgo(134) },
  {
    id: 'sav-4',
    wishlistEntryId: 'wsh-domino',
    amount: -75,
    occurredAt: daysAgo(120),
    note: 'Borrowed back for the water heater.',
  },
  { id: 'sav-5', wishlistEntryId: 'wsh-domino', amount: 150, occurredAt: daysAgo(102) },
  { id: 'sav-6', wishlistEntryId: 'wsh-domino', amount: 175, occurredAt: daysAgo(71) },
  { id: 'sav-7', wishlistEntryId: 'wsh-domino', amount: 150, occurredAt: daysAgo(40) },
  { id: 'sav-8', wishlistEntryId: 'wsh-dustext', amount: 100, occurredAt: daysAgo(140) },
  { id: 'sav-9', wishlistEntryId: 'wsh-dustext', amount: 100, occurredAt: daysAgo(78) },
  { id: 'sav-10', wishlistEntryId: 'wsh-dustext', amount: 60, occurredAt: daysAgo(25) },
].map((s) => ({
  organizationId: ORG_ID,
  note: undefined,
  createdAt: s.occurredAt,
  ...s,
}));

/** A price series that wanders and then dips below target, so an alert is real. */
const priceObservations = [
  ['wsh-domino', 1099, 200],
  ['wsh-domino', 1099, 170],
  ['wsh-domino', 1049, 140],
  ['wsh-domino', 1099, 112],
  ['wsh-domino', 1029, 84],
  ['wsh-domino', 1029, 56],
  ['wsh-domino', 989, 28],
  ['wsh-domino', 939, 4],
  ['wsh-dustext', 379, 130],
  ['wsh-dustext', 379, 95],
  ['wsh-dustext', 349, 60],
  ['wsh-dustext', 359, 30],
  ['wsh-dustext', 344, 11],
  ['wsh-nvr', 499, 90],
  ['wsh-nvr', 479, 55],
  ['wsh-nvr', 479, 20],
].map(([wishlistEntryId, amount, ago], index) => ({
  id: `prc-${index + 1}`,
  wishlistEntryId,
  organizationId: ORG_ID,
  amount,
  currency: 'USD',
  observedAt: daysAgo(ago),
  source: index % 4 === 0 ? 'MANUAL' : 'FEED',
  createdAt: daysAgo(ago),
}));

// --- Gear profiles ---------------------------------------------------------
// One USER profile, to show the feature without pretending to be a catalogue.

const gearProfiles = [
  {
    id: 'gp-user-hs5',
    organizationId: ORG_ID,
    brand: 'Yamaha',
    model: 'HS5',
    productType: 'Powered studio monitor',
    specs: [
      { label: 'Woofer', value: '5', unit: 'in' },
      { label: 'Tweeter', value: '1', unit: 'in' },
      { label: 'Amplifier', value: '70', unit: 'W' },
      { label: 'Frequency response', value: '54 Hz - 30 kHz' },
      { label: 'Inputs', value: 'XLR, TRS' },
    ],
    source: 'USER',
    createdAt: daysAgo(1330),
    updatedAt: daysAgo(200),
  },
];

/**
 * Everything the seeder writes, keyed by the localStorage key it goes to.
 * `userId` is substituted at seed time, once the real signup has produced one.
 */
export function buildDemoData(userId) {
  return {
    brassworth_organizations: [
      {
        id: ORG_ID,
        name: 'Whitfield Workshop',
        type: 'home',
        address: '—',
        createdAt: daysAgo(2300),
        updatedAt: daysAgo(30),
      },
    ],
    brassworth_memberships: [{ id: 'mem-1', userId, organizationId: ORG_ID }],
    brassworth_user_roles: [
      { id: 'role-1', userId, organizationId: ORG_ID, role: 'ADMIN' },
    ],
    brassworth_locations: locations,
    brassworth_categories: categories,
    brassworth_tags: tags,
    brassworth_items: items,
    brassworth_item_events: itemEvents,
    brassworth_wishlist: wishlist,
    brassworth_savings: savings,
    brassworth_price_observations: priceObservations,
    brassworth_gear_profiles: gearProfiles,
  };
}

export const DEMO_USER = {
  name: 'Dana Whitfield',
  email: 'dana@whitfield.example',
  password: 'CorrectHorseBattery12!',
};
