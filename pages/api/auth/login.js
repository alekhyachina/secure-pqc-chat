import dbConnect from '../../../lib/dbConnect';
import User from '../../../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../../lib/auth';

const TOKEN_MAX_AGE_SECONDS = 86400; // 1 day, matches token expiry

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username, password } = req.body ?? {};

  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    await dbConnect();

    const user = await User.findOne({ username: username.trim() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      getJwtSecret(),
      { expiresIn: TOKEN_MAX_AGE_SECONDS }
    );

    // Not HttpOnly: the chat page reads this cookie to authenticate the socket
    // connection. Session identity is always re-verified server-side.
    const cookie = [
      `token=${token}`,
      'Path=/',
      `Max-Age=${TOKEN_MAX_AGE_SECONDS}`,
      'SameSite=Lax',
      process.env.NODE_ENV === 'production' ? 'Secure' : '',
    ]
      .filter(Boolean)
      .join('; ');

    res.setHeader('Set-Cookie', cookie);
    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
}
