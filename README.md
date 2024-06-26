# Token Farm Indexer

---

# Important

This app is still in the development phase, it should not be used yet.

---

This app indexes data for the `tf.waxdao` smart contract, in order to provide a public API with more comprehensive functionality than reading data directly from the blockchain.

Data is streamed from a SHIP node using [Thalos](https://thalos.waxsweden.org), and stored in a postgres database. The API uses an express server.

---

## Database Structure

Details about the postgres configuration can be found in `postgres.md`, more elaborate documentation can be found [on Gitbook](https://waxdao.gitbook.io/waxdao).

---

## API Documentation

Descriptions of each endpoint and their expected behavior can be found in our [API documentation](https://waxdao.gitbook.io/waxdao/products/token-farms/developers/build-an-api)

---

## Setup Process

