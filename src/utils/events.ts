import { Erc20_ABI } from '../abi/Erc20_ABI';
import { ENV } from '../constant/env';
import { publicClient } from './chain';
import { TransactionModel } from '../mongo/transaction-schema';
import { PollingModel } from '../mongo/polling-schema';

export const queryTransferEvents = async (
  fromBlock: bigint,
  toBlock: bigint
) => {
  const currentBlock = await publicClient.getBlockNumber();
  const fronBlockFetch =
    fromBlock > BigInt(0) ? fromBlock - BigInt(1) : currentBlock - BigInt(1);
  const toBlockFetch =
    toBlock < currentBlock ? toBlock + BigInt(1) : currentBlock;
  const events = await publicClient.getContractEvents({
    address: ENV.TOKEN_ADDRESS as `0x${string}`,
    abi: Erc20_ABI,
    eventName: 'Transfer',
    args: {
      to: ENV.RECEIVER_ADDRESS as `0x${string}`,
    },
    fromBlock: fronBlockFetch,
    toBlock: toBlockFetch,
  });

  for (const event of events) {
    await TransactionModel.create({
      txHash: event.transactionHash,
      blockNumber: +event.blockNumber.toString(),
      logIndex: event.logIndex,
      from: event.args.from,
      to: event.args.to,
      value: +event.args.value.toString(),
    })
      .then(() => {
        console.log(
          `Recieve ${formatValue(+event.args.value.toString())} ${
            ENV.TOKEN_SYMBOL
          } from ${event.args.from} `
        );
      })
      .catch((_) => {});
  }

  await PollingModel.create({
    fromBlock: fromBlock.toString(),
    toBlock: toBlock.toString(),
    isSuccess: true,
  });
};

export const formatValue = (value: number): string => {
  return (value / Math.pow(10, 18)).toString();
};
