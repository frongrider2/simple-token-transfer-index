import mongoose, { Document, Schema } from 'mongoose';

export interface IPolling extends Document {
  fromBlock: String;
  toBlock: String;
  isSuccess: boolean;
}

const PollingSchema = new Schema<IPolling>(
  {
    fromBlock: {
      type: String,
      required: true,
    },
    toBlock: {
      type: String,
      required: true,
    },
    isSuccess: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const PollingModel =
  mongoose.models.Polling || mongoose.model<IPolling>('Polling', PollingSchema);
