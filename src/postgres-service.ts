import Knex from 'knex'

import { Config, Application, Service, ServiceContext } from 'jakson'

export class PostgresService<TApplication extends Application<any, Config>> extends Service<
  TApplication
> {
  private _knex: Knex

  constructor(ctx: ServiceContext<TApplication>, knex: Knex) {
    super(ctx)
    this._knex = knex
  }

  get knex(): Knex {
    return this._knex
  }
}
