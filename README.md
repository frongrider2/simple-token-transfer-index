## ERC20 Transfer Watcher – Task 1

This service watches an ERC20 token contract for `Transfer` events to a specific receiver address, and stores both the raw transfer data and the polling ranges in MongoDB. It is designed to be **restart-safe**: when the process restarts, it resumes from the last successfully processed block.

### Tech Stack

- **Runtime**: Node.js + TypeScript
- **Blockchain**: `viem` public client (JSON-RPC)
- **Database**: MongoDB (via Docker Compose) + Mongoose
- **Process runner**: `nodemon` + `ts-node`

### High-Level Architecture

#### Components

- **`publicClient` (`src/utils/chain.ts`)**
  - Configures a `viem` public client from environment-based chain config (`src/constant/env.ts`).
- **Event query layer (`src/utils/events.ts`)**
  - `queryTransferEvents(fromBlock, toBlock)` fetches ERC20 `Transfer` events for `ENV.TOKEN_ADDRESS` where `to = ENV.RECEIVER_ADDRESS`.
  - Persists each event into `TransactionModel`.
  - Persists the successful polling window into `PollingModel`.
- **Persistence layer (`src/mongo/*.ts`)**
  - `TransactionModel` (`transaction-schema.ts`): stores individual ERC20 transfers.
  - `PollingModel` (`polling-schema.ts`): stores from/to block ranges and success flag.
- **Entry point (`src/index.ts`)**
  - Connects to MongoDB.
  - Determines the initial `fromBlock`/`toBlock` based on the latest `PollingModel` record and current chain head.
  - Runs an interval polling loop to keep processing new blocks.

#### Architecture Diagram (Mermaid)

```mermaid
flowchart LR
  subgraph Blockchain
    RPC[JSON-RPC Node]
  end

  subgraph Service[ERC20 Transfer Watcher]
    ENV[ENV config<br/>src/constant/env.ts]
    CHAIN[publicClient<br/>src/utils/chain.ts]
    EVENTS[queryTransferEvents<br/>src/utils/events.ts]
    INDEX[main loop<br/>src/index.ts]
  end

  subgraph MongoDB
    TX[(TransactionModel<br/>transaction-schema.ts)]
    POLL[(PollingModel<br/>polling-schema.ts)]
  end

  INDEX --> CHAIN
  CHAIN --> RPC
  INDEX --> EVENTS
  EVENTS --> TX
  EVENTS --> POLL
  INDEX --> POLL
```

### Data Model

- **Transactions (`TransactionModel`)**
  - `txHash: string` – transaction hash (unique).
  - `blockNumber: number`
  - `logIndex: number`
  - `from: string`
  - `to: string`
  - `value: number` – raw token amount (in smallest units).
  - Timestamps: `createdAt`, `updatedAt`.

- **Polling ranges (`PollingModel`)**
  - `fromBlock: string` – inclusive start block (stored as string for big numbers).
  - `toBlock: string` – inclusive end block.
  - `isSuccess: boolean` – whether the polling operation completed successfully.
  - Timestamps: `createdAt`, `updatedAt`.

### Environment Configuration

Create a `.env` file in the project root (see `.gitignore` for exclusion). Required variables:

- **Chain / RPC**
  - `RPC_URL_1`
  - `RPC_URL_2`
  - `RPC_URL_3`
  - `CHAIN_ID` – numeric chain id (e.g. `1` for mainnet, `11155111` for Sepolia).
  - `CHAIN_NAME` – human-readable name.
- **Token / Receiver**
  - `TOKEN_ADDRESS` – ERC20 contract address.
  - `TOKEN_SYMBOL` – e.g. `USDT`, `DAI`.
  - `RECEIVER_ADDRESS` – address whose incoming transfers are tracked.
- **Mongo connection (application)**
  - `MONGO_URI` – e.g. `mongodb://user:password@localhost:27017`.
  - `MONGO_DB_NAME` – e.g. `erc20_watcher`.
- **Mongo init (Docker)**
  - `MONGO_INITDB_ROOT_USERNAME`
  - `MONGO_INITDB_ROOT_PASSWORD`
  - `MONGO_INITDB_DATABASE`
  - `MONGO_INITDB_USERNAME`
  - `MONGO_INITDB_PASSWORD`

### Local Setup & Installation

#### 1. Install dependencies

```bash
cd /Users/frongza500/Desktop/Work/alpha/task1
yarn install
```

or:

```bash
npm install
```

#### 2. Start MongoDB via Docker

Make sure Docker is running, then:

```bash
cd /Users/frongza500/Desktop/Work/alpha/task1
make dbup
```

This will:

- Start a MongoDB 4.4 container.
- Mount `./data/db` as the data directory.
- Run `db-init/init.sh` to create the app user and DB using the `.env` configuration.

To stop the DB:

```bash
make dbdown
```

### Running the Service

Development mode with `nodemon` + `ts-node`:

```bash
cd /Users/frongza500/Desktop/Work/alpha/task1
yarn dev
```

This will:

- Use `nodemon.json` (`ts-node src/index.ts`) to start the TypeScript entrypoint.
- Connect to MongoDB using `MONGO_URI` / `MONGO_DB_NAME`.
- Determine the last successful polling window from `PollingModel` and process any missing blocks.
- Enter a polling loop (interval defined in `src/index.ts`) to fetch new `Transfer` events and store them.

### Build (optional)

To compile TypeScript to JavaScript:

```bash
yarn build
```

Output is written to the `dist` directory (see `tsconfig.json`).


