import Knex from 'knex'

import { ServiceTestSession } from 'jakson'
import { PostgresServiceFactory } from './postgres-service-factory'

export class PostgresServiceTestSession extends ServiceTestSession {
  private readonly factory: PostgresServiceFactory<any>
  private tableNames?: string[]

  constructor(factory: PostgresServiceFactory<any>) {
    super()
    this.factory = factory
  }

  async beforeStartApp() {
    await this.createDatabase()
    await this.migrateDatabase()
  }

  async beforeEachTest() {
    await this.truncateDatabase()
  }

  private async createDatabase() {
    const config = this.factory.config.knex
    const connection = config.connection as Knex.ConnectionConfig

    const adminKnex = Knex({
      client: 'postgres',

      connection: {
        ...connection,
        database: 'postgres'
      }
    })

    await adminKnex.raw('DROP DATABASE IF EXISTS ??', [connection.database])
    await adminKnex.raw('CREATE DATABASE ??', [connection.database])
    await adminKnex.destroy()
  }

  private async migrateDatabase() {
    const knex = Knex(this.factory.config.knex)

    await knex.migrate.latest()
    await knex.destroy()
  }

  private async truncateDatabase() {
    const { knex } = this.factory

    const tableNames = await this.getTableNamesToTruncate()
    const placeholders = tableNames.map(() => '??').join(', ')

    await knex.raw(`TRUNCATE TABLE ${placeholders} RESTART IDENTITY`, tableNames)
  }

  private async getTableNamesToTruncate(): Promise<string[]> {
    if (!this.tableNames) {
      this.tableNames = await this.fetchTableNamesToTruncate()
    }

    return this.tableNames
  }

  private async fetchTableNamesToTruncate(): Promise<string[]> {
    const { knex, testConfig } = this.factory

    const tablesResult = await knex('pg_tables')
      .select('tablename', 'schemaname')
      .whereIn('schemaname', testConfig.truncate.schemas)

    const tableNames = tablesResult.map(it => normalizeTable(it.tablename, it.schemaname))
    const omitTables = testConfig.truncate.omitTables.map(it => normalizeTable(it))

    return tableNames.filter(it => !omitTables.includes(it))
  }
}

function normalizeTable(table: string, schema?: string): string {
  if (table.includes('.')) {
    return table
  }

  if (schema) {
    return `${schema}.${table}`
  } else {
    return `public.${table}`
  }
}
