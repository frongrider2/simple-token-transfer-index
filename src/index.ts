import { publicClient } from './utils/chain';
import { ENV } from './constant/env';
import mongoose from 'mongoose';
import { queryTransferEvents } from './utils/events';
import { PollingModel } from './mongo/polling-schema';

const POLLING_INTERVAL_MS = 10_000;
const INITIAL_WINDOW_SIZE = BigInt(1000);

async function connectToDatabase() {
  const uri = `${ENV.MONGO_URI}/${ENV.MONGO_DB_NAME}`;
  await mongoose.connect(uri, {
    ssl: false,
  });
}

async function main() {
  // connect to dabase
  await connectToDatabase();

  const currentBlock = await publicClient.getBlockNumber();

  console.log(`ERC20 Transfer Watcher start 🚀: Current block: ${currentBlock}`);

  // Find last successful polling range
  const lastPolling = await PollingModel.findOne({ isSuccess: true })
    .sort({ toBlock: -1 })
    .lean(); 

  // Determine initial range
  let fromBlock: bigint;
  let toBlock: bigint;

  if (!lastPolling) {
    // No history: backfill a fixed window behind currentBlock
    fromBlock =
      currentBlock > INITIAL_WINDOW_SIZE
        ? currentBlock - INITIAL_WINDOW_SIZE
        : BigInt(0);
    toBlock = currentBlock;
  } else {
    // Continue from the last processed block
    const lastToBlock = BigInt(lastPolling.toBlock);
    fromBlock = lastToBlock + BigInt(1);
    toBlock = currentBlock;
  }

  if (fromBlock <= toBlock) {
    await queryTransferEvents(fromBlock, toBlock);
  }

  let lastProcessedToBlock = toBlock;

  // Polling loop to keep fetching new events
  setInterval(async () => {
    try {
      const latestBlock = await publicClient.getBlockNumber();

      if (latestBlock <= lastProcessedToBlock) {
        return;
      }

      const nextFromBlock = lastProcessedToBlock + BigInt(1);
      const nextToBlock = latestBlock;

      await queryTransferEvents(nextFromBlock, nextToBlock);

      lastProcessedToBlock = nextToBlock;
    } catch (error) {
      console.error('Error in polling loop:', error);
    }
  }, POLLING_INTERVAL_MS);
}

main();
