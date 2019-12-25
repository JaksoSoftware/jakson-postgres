import Knex from 'knex'

import { types } from 'pg'
import { ServiceFactory, Application, Config, ServiceContext } from 'jakson'
import { PostgresService } from './postgres-service'
import { PostgresServiceTestSession } from './postgres-service-test-session'
import { PostgresServiceConfig, PostgresServiceTestConfig } from './postgres-service-config'

export abstract class PostgresServiceFactory<
  TApplication extends Application<any, Config>
> extends ServiceFactory<TApplication, PostgresService<TApplication>> {
  private _knex!: Knex

  abstract get config(): PostgresServiceConfig

  get testConfig(): PostgresServiceTestConfig {
    return (
      this.config.test || {
        truncate: {
          schemas: ['public'],
          omitTables: []
        }
      }
    )
  }

  get knex(): Knex {
    return this._knex
  }

  async start(): Promise<void> {
    this._knex = Knex(this.config.knex)
    setupPgDriver()
  }

  async stop(): Promise<void> {
    await this.knex.destroy()
  }

  async createService(ctx: ServiceContext<TApplication>): Promise<PostgresService<TApplication>> {
    return new PostgresService(ctx, this.knex)
  }

  protected createTestSession(): PostgresServiceTestSession {
    return new PostgresServiceTestSession(this)
  }
}

function setupPgDriver() {
  makePgDriverReturnIsoDates()
}

function makePgDriverReturnIsoDates() {
  const TYPE_TIMESTAMP = 1114
  const TYPE_TIMESTAMPTZ = 1184

  const parseDate = (date: string | null): string | null => {
    if (date === null) {
      return null
    }

    // Convert weird postgres format to ISO format.
    date = date.replace(' ', 'T')

    if (date.includes('.')) {
      return date.replace('+00', 'Z')
    } else {
      return date.replace('+00', '.000Z')
    }
  }

  types.setTypeParser(TYPE_TIMESTAMP, parseDate)
  types.setTypeParser(TYPE_TIMESTAMPTZ, parseDate)
}
