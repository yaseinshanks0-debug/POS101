import { DetailedPostgresTable } from '../types/databaseTypes';
import { detailedPostgresTables } from './postgresSchemaData';
import { detailedPostgresTablesPart2 } from './postgresSchemaDataPart2';
import { detailedPostgresTablesPart3 } from './postgresSchemaDataPart3';

export const allPostgresTables: DetailedPostgresTable[] = [
  ...detailedPostgresTables,
  ...detailedPostgresTablesPart2,
  ...detailedPostgresTablesPart3
];
