import { pool } from '../config/database';
import { generateReferenceNumber } from '../utils/referenceGenerator';

export interface Transaction {
  id: string;
  referenceNumber: string;
  type: 'deposit' | 'withdraw';
  amount: string;
  phoneNumber: string;
  provider: string;
  stellarAddress: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

export class TransactionModel {
  async create(data: Omit<Transaction, 'id' | 'referenceNumber' | 'createdAt'>): Promise<Transaction> {
    const referenceNumber = await generateReferenceNumber();
    
    const result = await pool.query(
      `INSERT INTO transactions (reference_number, type, amount, phone_number, provider, stellar_address, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [referenceNumber, data.type, data.amount, data.phoneNumber, data.provider, data.stellarAddress, data.status]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Transaction | null> {
    const result = await pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await pool.query('UPDATE transactions SET status = $1 WHERE id = $2', [status, id]);
  }


  async findByReferenceNumber(referenceNumber: string): Promise<Transaction | null> {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE reference_number = $1',
      [referenceNumber]
    );
    return result.rows[0] || null;
  }

}
