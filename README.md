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

### Interval Query Algorithm (Blocks & Events)

The core polling logic is implemented in `src/index.ts` (`main` loop + `setInterval`) and `src/utils/events.ts` (`queryTransferEvents`). The diagram below shows how block ranges are calculated and processed on each interval:

```mermaid
flowchart TD
  A[Start service main] --> B[Connect MongoDB]
  B --> C[Get current block]
  C --> D{Has last polling range}
  D -- No --> E[Set initial range]
  D -- Yes --> F[Set range after last block]
  E --> G[Call queryTransferEvents]
  F --> G

  subgraph Query[queryTransferEvents]
    Q1[Get current block again]
    Q2[Compute fetch range]
    Q3[Get contract events]
    Q4[Save events to TransactionModel]
    Q5[Save range to PollingModel]
  end

  G --> Q1
  Q5 --> H[Set last processed block]
  H --> I[Interval loop]
  I --> J[Get latest block]
  J --> K{New blocks}
  K -- No --> I
  K -- Yes --> L[Compute next range]
  L --> M[Call queryTransferEvents again]
  M --> N[Update last processed block]
  N --> I
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
yarn install
```

or:

```bash
npm install
```

#### 2. Start MongoDB via Docker

Make sure Docker is running, then:

```bash
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
yarn dev
```

This will:

- Use `nodemon.json` (`ts-node src/index.ts`) to start the TypeScript entrypoint.
- Connect to MongoDB using `MONGO_URI` / `MONGO_DB_NAME`.
- Determine the last successful polling window from `PollingModel` and process any missing blocks.
- Enter a polling loop (interval defined in `src/index.ts`) to fetch new `Transfer` events and store them.

### Build & Scripts

- **Build** (from `package.json` `build` script):

  ```bash
  yarn build        # runs: rimraf dist && tsc
  # or
  npm run build
  ```

  Output is written to the `dist` directory (see `tsconfig.json`).

- **Start compiled app** (from `package.json` `start` script):

  ```bash
  yarn start        # runs: node dist/index.js
  # or
  npm start
  ```

- **Dev mode** (from `package.json` `dev` script, already referenced above):

  ```bash
  yarn dev          # runs: npx nodemon
  # or
  npm run dev
  ```

### Design Rationale & Alternatives

- **Restart-safe via persisted polling ranges**
  - This service persists each successfully processed `[fromBlock, toBlock]` window in `PollingModel`, so on restart it can deterministically resume from the last completed block instead of relying on in-memory state or ad-hoc "latest block" heuristics.
  - **Alternative**: A simpler design might only track the last processed block in memory or a single config document; this is brittle (crashes / deploys can cause gaps or double-processing) and makes audits harder, whereas explicit ranges create a verifiable history of what was processed.

- **Separation of concerns: transactions vs polling metadata**
  - Storing transfer data in `TransactionModel` and ranges in `PollingModel` cleanly separates **business data** (what happened on-chain) from **operational data** (how and when it was fetched), which simplifies querying and future evolution (e.g., adding new event types without changing how ranges are tracked).
  - **Alternative**: Embedding polling metadata into each transaction record couples ingestion logic to storage shape, making backfills, re-syncs, or parallel consumers harder and more error-prone.

- **Idempotent, append-only write pattern**
  - Using `(txHash, logIndex)` semantics and recording only successfully completed ranges encourages idempotent writes and avoids complex "partial state" cleanups; re-running the same range is safe as long as unique constraints / upserts are used.
  - **Alternative**: Designs that mutate a single "cursor" document or try to mark partially processed ranges often require careful transactional semantics; they are more fragile in the face of process crashes or RPC inconsistencies.

- **Polling-based event ingestion over long-lived subscriptions**
  - A periodic query loop using `viem` is robust against ephemeral RPC failures, load balancer restarts, and node upgrades, and can be horizontally scaled by sharding block ranges if needed.
  - **Alternative**: WebSocket or pub/sub subscriptions can provide lower latency, but they introduce more moving parts (connection lifecycle, reconnection gaps, backfill logic) and are harder to make provably complete for historical data; polling offers a simpler, easier-to-reason-about baseline.

- **Explicit environment-driven configuration**
  - Chain, RPC URLs, and Mongo credentials are provided via `.env`, so the same codebase can target multiple environments (testnet/mainnet, staging/production) without changes, and secrets remain out of the repository.
  - **Alternative**: Hardcoding RPC endpoints or DB URIs in code or config files couples deployment details to source control and makes rotation, environment parity, and secret management more difficult.

Overall, this design favors **simplicity, observability, and safety** over premature optimization: ranges are explicit, state is restart-safe, and concerns are separated, which makes it easier to extend the watcher (e.g., support additional events, new tokens, or more complex reconciliation logic) without reworking the core architecture.
