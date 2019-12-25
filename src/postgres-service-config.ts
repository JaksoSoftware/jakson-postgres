import Knex from 'knex'

export interface PostgresServiceTestConfig {
  truncate: PostgresServiceTestTruncateConfig
}

export interface PostgresServiceTestTruncateConfig {
  schemas: string[]
  omitTables: string[]
}

export interface PostgresServiceConfig {
  knex: Knex.Config

  /**
   * Defaults to:
   *
   * {
   *   truncate: {
   *     schemas: ['public'],
   *     omitTables: []
   *   }
   * }
   */
  test?: PostgresServiceTestConfig
}
