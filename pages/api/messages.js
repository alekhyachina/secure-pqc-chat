import dbConnect from '../../lib/dbConnect';
import Message from '../../models/Message';

export default async function handler(req, res) {
  // We only care about GET requests for this route
  if (req.method === 'GET') {
    try {
      // Get the two users from the query string
      const { user1, user2 } = req.query;

      if (!user1 || !user2) {
        return res.status(400).json({ message: 'Missing user1 or user2 query parameters' });
      }

      // Connect to the database
      await dbConnect();

      // Find all messages
      // where (sender is user1 AND receiver is user2)
      // OR (sender is user2 AND receiver is user1)
      const messages = await Message.find({
        $or: [
          { sender: user1, receiver: user2 },
          { sender: user2, receiver: user1 },
        ],
      }).sort({ timestamp: 'asc' }); // Sort by oldest first

      // Send the messages back as JSON
      res.status(200).json(messages);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    // Handle any other HTTP method
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}