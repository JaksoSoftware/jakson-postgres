exports.up = async knex => {
  await knex.schema.raw('CREATE SCHEMA pet')
  await knex.schema.raw('CREATE SCHEMA movie')

  await knex.schema.createTable('persons', table => {
    table.increments('id')
    table.string('firstName')
  })

  await knex.schema.createTable('furniture', table => {
    table.increments('id')
    table.string('type')
  })

  await knex.schema.withSchema('pet').createTable('pets', table => {
    table.increments('id')
    table.string('name')
  })

  await knex.schema.withSchema('pet').createTable('species', table => {
    table.increments('id')
    table.string('species')
  })

  await knex.schema.withSchema('movie').createTable('movies', table => {
    table.increments('id')
    table.string('title')
  })
}

exports.down = () => {}
