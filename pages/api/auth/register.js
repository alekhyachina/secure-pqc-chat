import dbConnect from '../../../lib/dbConnect';
import User from '../../../models/User';
import bcrypt from 'bcryptjs';

// Kyber-512 public keys are 800 bytes (1600 hex characters)
const PUBLIC_KEY_HEX_LENGTH = 1600;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password, pqcPublicKey } = req.body ?? {};

  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    typeof pqcPublicKey !== 'string' ||
    !username.trim() ||
    !password
  ) {
    return res
      .status(400)
      .json({ error: 'Username, Password, and Public Key are required' });
  }

  const publicKey = pqcPublicKey.replace(/\s/g, '');
  if (!new RegExp(`^[0-9a-fA-F]{${PUBLIC_KEY_HEX_LENGTH}}$`).test(publicKey)) {
    return res.status(400).json({
      error: 'Public key must be a 1600-character hex string (Kyber-512, 800 bytes)',
    });
  }

  try {
    await dbConnect();

    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({
      username: username.trim(),
      password: hashedPassword,
      pqcPublicKey: publicKey,
    });

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('Register Error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}
