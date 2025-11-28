import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  RPC_URL_1: process.env.RPC_URL_1 || '',
  RPC_URL_2: process.env.RPC_URL_2 || '',
  RPC_URL_3: process.env.RPC_URL_3 || '',
  CHAIN_ID: process.env.CHAIN_ID || '',
  CHAIN_NAME: process.env.CHAIN_NAME || '',
  TOKEN_ADDRESS: process.env.TOKEN_ADDRESS || '',
  TOKEN_SYMBOL: process.env.TOKEN_SYMBOL || '',
  RECEIVER_ADDRESS: process.env.RECEIVER_ADDRESS || '',

  // database
  MONGO_URI: process.env.MONGO_URI || '',
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || '',
};
