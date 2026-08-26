import { SpecSection, DbTable } from '../types';
import { prdSection } from './prdSection';
import { systemArchSection } from './systemArchSection';
import { domainModelSection } from './domainModelSection';
import { databaseSchemaSection, dbTablesList } from './databaseSchemaSection';
import { apiSpecSection } from './apiSpecSection';
import { mobileArchSection } from './mobileArchSection';
import { syncSpecSection } from './syncSpecSection';
import { securitySpecSection } from './securitySpecSection';
import { testingStrategySection } from './testingStrategySection';
import { deploymentSection } from './deploymentSection';
import { folderStructureSection } from './folderStructureSection';
import { roadmapSection } from './roadmapSection';

export const allSections: SpecSection[] = [
  prdSection,
  systemArchSection,
  domainModelSection,
  databaseSchemaSection,
  apiSpecSection,
  mobileArchSection,
  syncSpecSection,
  securitySpecSection,
  testingStrategySection,
  deploymentSection,
  folderStructureSection,
  roadmapSection,
];

export const allDbTables: DbTable[] = dbTablesList;

export const systemMetrics = {
  totalSections: 12,
  databaseTablesCount: 34,
  boundedContextsCount: 7,
  targetOfflineAvailabilityDays: 30,
  scanLatencyMsTarget: 50,
  frameworks: ['Flutter & Dart', 'NestJS & TypeScript', 'PostgreSQL & Drizzle ORM', 'Redis', 'SQLCipher']
};
