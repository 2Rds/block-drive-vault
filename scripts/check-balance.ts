import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

async function main() {
  const rpc = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const conn = new Connection(rpc, 'confirmed');
  const key = bs58.decode(process.env.TREASURY_PRIVATE_KEY || '');
  const kp = Keypair.fromSecretKey(key);
  const bal = await conn.getBalance(kp.publicKey);
  console.log(`Wallet: ${kp.publicKey.toBase58()}`);
  console.log(`RPC: ${rpc}`);
  console.log(`Balance: ${bal / LAMPORTS_PER_SOL} SOL`);
  console.log(bal >= 0.5 * LAMPORTS_PER_SOL ? 'STATUS: SUFFICIENT for setup (~0.35 SOL needed)' : 'STATUS: INSUFFICIENT — need at least 0.5 SOL');
}

main().catch(console.error);
