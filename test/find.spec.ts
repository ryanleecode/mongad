import { run } from 'fp-ts/lib/ReaderTaskEither'
import { fold } from 'fp-ts/lib/Either'
import { MongoError } from 'mongodb'
import { findOne, findMany } from '../src/lib/find'
import { setupMongo } from './_util'

const { connectToDatabase, getMongo } = setupMongo()

const collection = 'testCollection'

describe('findOne', () => {
  test('should return Left if a MongoError occured', async () => {
    const { db, client } = getMongo()

    // close connection to provoke error from mongo
    await client.close()

    const result = await run(findOne(collection, {}), db)

    expect(result._tag).toEqual('Left')
    expect(() =>
      fold(
        err => {
          throw err
        },
        _ => null
      )(result)
    ).toThrow(MongoError)
    // reconnect to database to not break afterEach reset function
    await connectToDatabase()
  })

  test('right value should contain the requested document', async () => {
    const { db } = getMongo()

    const toBeFound = [
      { name: 'testName', property: 'testProperty' },
      { name: 'testName', property: 'anotherProperty' },
    ]
    await db.collection(collection).insertMany(toBeFound)

    const result = await run(findOne(collection, { name: 'testName' }), db)

    fold(
      err => {
        throw err
      },
      res => expect(res).toEqual(toBeFound[0])
    )(result)
  })
})

describe('findMany', () => {
  test('left value should contain error', async () => {
    const { db, client } = getMongo()

    // close connection to provoke error from mongo
    await client.close()

    const result = await run(findMany(collection, {}), db)

    // reconnect to database to not break afterEach reset function
    await connectToDatabase()
    expect(result._tag).toEqual('Left')
    expect(() =>
      fold(
        err => {
          throw err
        },
        _ => null
      )(result)
    ).toThrow(MongoError)
  })

  test('right value should contain all requested documents', async () => {
    const { db } = getMongo()

    const toBeFound = [
      { name: 'testName', property: 'testProperty' },
      { name: 'testName', property: 'anotherProperty' },
    ]
    await db
      .collection(collection)
      .insertMany([{ name: 'some', property: 'none' }, ...toBeFound])

    const result = await run(findMany(collection, { name: 'testName' }), db)

    fold(
      err => {
        throw err
      },
      res => expect(res).toEqual(toBeFound)
    )(result)
  })
})
