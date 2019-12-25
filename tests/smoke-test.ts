import Router from 'koa-router'
import path from 'path'

import { expect } from 'chai'
import { PostgresServiceFactory, PostgresServiceConfig } from '../src'
import { Config, Application } from 'jakson'

describe('smoke tests', () => {
  let app: App

  class DbServiceFactory extends PostgresServiceFactory<App> {
    get config(): PostgresServiceConfig {
      return this.app.config.db
    }
  }

  interface ServiceFactories {
    db: DbServiceFactory
  }

  interface TestConfig extends Config {
    db: PostgresServiceConfig
  }

  class App extends Application<ServiceFactories, TestConfig> {
    async createServiceFactories(): Promise<ServiceFactories> {
      return {
        db: new DbServiceFactory(this)
      }
    }

    async registerRoutes(router: Router): Promise<void> {
      // Do nothing.
    }
  }

  const config: TestConfig = {
    type: 'test',
    port: 3000,

    db: {
      knex: {
        client: 'postgresql',

        connection: {
          host: 'localhost',
          port: 5432,
          user: 'postgres',
          password: '',
          database: 'jakson_postgres_test'
        },

        pool: {
          min: 0,
          max: 10
        },

        migrations: {
          directory: path.join(__dirname, 'migrations')
        }
      },

      test: {
        truncate: {
          schemas: ['public', 'pet'],
          omitTables: ['furniture', 'pet.species']
        }
      }
    }
  }

  before(async () => {
    app = new App(config)

    await app.configure()
    await app.forEachServiceFactory(async (_, factory) => factory.testSession.beforeStartApp())
    await app.start()
  })

  after(async () => {
    await app.stop()
  })

  beforeEach(async () => {
    await app.forEachServiceFactory(async (_, factory) => factory.testSession.beforeEachTest())
  })

  it('knex instance should be available in the service', async () => {
    const services = await app.createServiceInstances('test')
    const { knex } = services.db

    await knex('persons').insert({
      firstName: 'Jennifer'
    })

    const persons = await knex('persons')
    expect(persons).to.eql([{ id: 1, firstName: 'Jennifer' }])
  })

  it('knex instance should be available in the service factory', async () => {
    const { knex } = app.serviceFactories.db

    await knex('pets')
      .withSchema('pet')
      .insert({ name: 'Woofy' })

    const pets = await knex('pets').withSchema('pet')
    expect(pets).to.eql([{ id: 1, name: 'Woofy' }])
  })

  it('insert items for the next test', async () => {
    const { knex } = app.serviceFactories.db

    await knex('furniture').insert({ type: 'chair' })

    await knex('species')
      .withSchema('pet')
      .insert({ species: 'dog' })

    await knex('movies')
      .withSchema('movie')
      .insert({ title: 'The Terminator' })
  })

  it('testSession.beforeEachTest() should wipe the db between each test', async () => {
    const { knex } = app.serviceFactories.db

    const persons = await knex('persons')
    const furniture = await knex('furniture')
    const pets = await knex('pets').withSchema('pet')
    const species = await knex('species').withSchema('pet')
    const movies = await knex('movies').withSchema('movie')

    expect(persons).to.be.empty
    expect(pets).to.be.empty

    // Table omitted from truncation.
    expect(furniture).to.eql([{ id: 1, type: 'chair' }])

    // Table omitted from truncation.
    expect(species).to.eql([{ id: 1, species: 'dog' }])

    // Schema not included in truncation.
    expect(movies).to.eql([{ id: 1, title: 'The Terminator' }])
  })
})
