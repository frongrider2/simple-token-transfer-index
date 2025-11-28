import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  txHash: string;
  blockNumber: number;
  logIndex: number;
  from: string;
  to: string;
  value: number;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    txHash: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    blockNumber: {
      type: Number,
      required: true,
      index: true,
    },
    logIndex: {
      type: Number,
      required: true,
    },
    from: {
      type: String,
      required: true,
      index: true,
    },
    to: {
      type: String,
      required: true,
      index: true,
    },
    value: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const TransactionModel =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>('Transaction', TransactionSchema);
