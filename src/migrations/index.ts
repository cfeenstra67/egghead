import { createUser1651729792149 } from "./1651729792149-create-user";
import { session1651745331265 } from "./1651745331265-session";
import { searchIndex1652082981231 } from "./1652082981231-search-index";
import { nextSession1652318266882 } from "./1652318266882-next-session";
import { addHost1652328083169 } from "./1652328083169-add-host";
import { dropIndex1652668559066 } from "./1652668559066-drop-index";
import { createIndex1652668711232 } from "./1652668711232-create-index";
import { index1652947986280 } from "./1652947986280-index";
import { dummyColumn1653238599617 } from "./1653238599617-dummy-column";
import { addSettings1655016473038 } from './1655016473038-add-settings';
import { addInteractions1656568975256 } from './1656568975256-add-interactions';
import { addChromeVisitId1656829928767 } from './1656829928767-add-chrome-visit-id';
import { hostIndex1656900179493 } from './1656900179493-host-index';
import { moreIndexes1656901146387 } from "./1656901146387-more-indexes";

export const migrations = [
  createUser1651729792149,
  session1651745331265,
  searchIndex1652082981231,
  nextSession1652318266882,
  addHost1652328083169,
  dropIndex1652668559066,
  createIndex1652668711232,
  index1652947986280,
  dummyColumn1653238599617,
  addSettings1655016473038,
  addInteractions1656568975256,
  addChromeVisitId1656829928767,
  hostIndex1656900179493,
  moreIndexes1656901146387,
];
