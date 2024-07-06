# Token Farm Indexer

---

This app indexes data for the `tf.waxdao` smart contract, in order to provide a public API with more comprehensive functionality than reading data directly from the blockchain.

Data is streamed from a SHIP node using [Thalos](https://thalos.waxsweden.org), and stored in a postgres database. The API uses an express server.

---

## Database Structure

The postgres setup process is `postgres.md`, more elaborate documentation can be found [on Gitbook](https://waxdao.gitbook.io/waxdao/products/token-farms/developers/indexer/postgres-thalos).

---

## API Documentation

Descriptions of each endpoint and their expected behavior can be found in our [API documentation](https://waxdao.gitbook.io/waxdao/products/token-farms/developers/api-documentation)

---

## Setup Process

To set up the indexer, first you'll need to install Thalos on your system. v1.1.3 or higher is recommended, as there was a bug on lower versions that resulted in the Thalos instance crashing when attempting to deserialize certain ABIs.

---

After installing Thalos, you need to edit the config file to point to your SHIP node and chain API.

`sudo vi /etc/thalos/config.yml`

An example Thalos config can be found in `thalos-config.yml`. You can edit it as you see fit, and paste it into the `config.yml` file we opened above.

---

Next, you need to set up the postgres database and tables if you haven't done so already. Simply open `psql` on your machine, and paste in each of the commands in the `postgres.md` file.

---

## Setting up the indexer

Go to your directory of choice, clone this repo, and install the dependencies.

```
git clone https://github.com/mdcryptonfts/token-farms-indexer.git
cd token-farms-indexer
npm install
```

You'll need to create your `config.json` file, an example config is at `example.config.json`

```
sudo vi config.json   // paste in your config settings
```

Create a `get_block.sh` script and make it executable, example script is in `get_block_example.sh`

```
sudo vi get_block.sh   // make sure to adjust path settings and postgres details appropriately
chmod -x get_block.sh
```

Now do the same for `start.sh` and `stop.sh`

```
sudo vi start.sh   // adjust details as needed
sudo vi stop.sh   // adjust details as needed
chmod -x start.sh
chmod -x stop.sh
```

Start the indexer before starting Thalos. I use `pm2` to manage this.

```
pm2 start index.js --name "TokenFarmsIndexer" && pm2 logs "TokenFarmsIndexer"
```

You should see "All connections established" in the pm2 logs if the app is working properly.

Exit the pm2 logs with `ctrl+c`

Start Thalos and check pm2 logs to make sure everything is working.

```
sudo ./start.sh && pm2 logs "TokenFarmsIndexer"
```

If everything is working, you should see a "heartbeat" message every 10 blocks. Whenever an action is indexed, you should also see a message indicating that it was successful.

If you ever need to stop Thalos, you can simply run `sudo ./stop.sh` (there is no need to stop the NodeJS app)

In case the `pid` was ever not captured properly, or the `stop.sh` script doesn't work, you can manually stop Thalos using the following method.

```
ps aux | grep thalos   // this will display any processes using Thalos
sudo kill <pid>   // e.g. sudo kill 12345
```

---

At this point, your indexer should be running smoothly. To serve API requests, you'll need to set up the [Token Farms Express Server](https://github.com/mdcryptonfts/token-farms-api)