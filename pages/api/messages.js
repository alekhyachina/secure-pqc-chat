import dbConnect from '../../lib/dbConnect';
import Message from '../../models/Message';
import { getAuthenticatedUser } from '../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const auth = getAuthenticatedUser(req);
  if (!auth) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user1 = String(req.query.user1 ?? '');
  const user2 = String(req.query.user2 ?? '');

  if (!user1 || !user2) {
    return res.status(400).json({ message: 'Missing user1 or user2 query parameters' });
  }

  // Only participants may read a conversation
  if (auth.username !== user1 && auth.username !== user2) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    await dbConnect();

    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 },
      ],
    }).sort({ timestamp: 'asc' });

    res.status(200).json(messages);
  } catch (error) {
    console.error('Messages fetch error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
