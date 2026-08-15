import dbConnect from '../../../lib/dbConnect';
import User from '../../../models/User';
import { getAuthenticatedUser } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!getAuthenticatedUser(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { username } = req.query;

  try {
    await dbConnect();
    // Only return the public key (never the password hash)
    const user = await User.findOne({ username: String(username) }).select('pqcPublicKey');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ pqcPublicKey: user.pqcPublicKey });
  } catch (error) {
    console.error('User lookup error:', error);
    res.status(500).json({ error: 'Server error fetching key' });
  }
}
