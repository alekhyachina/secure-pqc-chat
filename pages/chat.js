import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { encryptMessage, decryptMessage } from '../utils/crypto';

export default function Chat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [privateKey, setPrivateKey] = useState('');
  const [isKeyLoaded, setIsKeyLoaded] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [currentUser, setCurrentUser] = useState('');

  const router = useRouter();
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // --- 1. CONNECT TO SERVER ---
  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      router.push('/');
      return;
    }

    let username;
    try {
      username = jwtDecode(token).username;
    } catch (e) {
      console.error('Token error', e);
      Cookies.remove('token');
      router.push('/');
      return;
    }
    setCurrentUser(username);

    let cancelled = false;

    const initSocket = async () => {
      // Boot the Socket.IO server before connecting
      await fetch('/api/socket');
      if (cancelled) return;

      const socket = io({ auth: { token } });
      socketRef.current = socket;

      socket.on('connect_error', (err) => {
        console.error('Socket connection failed:', err.message);
      });

      socket.on('receive_message', (data) => {
        setMessages((prev) => [...prev, { ...data, isEncrypted: true }]);
      });
    };

    initSocket();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [router]);

  // --- 2. DECRYPT MESSAGES ---
  useEffect(() => {
    if (!isKeyLoaded || !privateKey) return;

    const pending = messages.some((msg) => msg.isEncrypted && !msg.text);
    if (!pending) return;

    let cancelled = false;

    const decryptAll = async () => {
      const results = await Promise.all(
        messages.map(async (msg) => {
          if (!msg.isEncrypted || msg.text) return msg;
          try {
            const text = await decryptMessage(msg.content, privateKey);
            return { ...msg, text, isEncrypted: false };
          } catch (e) {
            console.error('Decryption failed', e);
            return { ...msg, text: '⚠️ Decryption Failed', isEncrypted: false };
          }
        })
      );
      if (!cancelled) setMessages(results);
    };

    decryptAll();
    return () => { cancelled = true; };
  }, [messages, isKeyLoaded, privateKey]);

  // --- 3. AUTO SCROLL ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogout = () => {
    Cookies.remove('token');
    router.push('/');
  };

  // --- 4. SEND MESSAGE ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const to = recipient.trim();
    if (!message || !to) return;

    try {
      if (!socketRef.current?.connected) {
        throw new Error('Not connected to the chat server');
      }

      // Fetch the recipient's public key
      const res = await fetch(`/api/user/${encodeURIComponent(to)}`);
      if (!res.ok) throw new Error('User not found');
      const { pqcPublicKey } = await res.json();

      // Encrypt for the recipient, then send
      const payload = await encryptMessage(pqcPublicKey, message);
      socketRef.current.emit('send_message', {
        receiver: to,
        content: payload,
        timestamp: new Date(),
      });

      // Show our own plaintext copy locally
      setMessages((prev) => [
        ...prev,
        { sender: currentUser, text: message, timestamp: new Date(), isEncrypted: false },
      ]);
      setMessage('');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  if (!isKeyLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <h1 className="text-2xl font-bold mb-4">Post-Quantum Login</h1>
        <textarea
          className="w-full max-w-lg p-3 bg-gray-800 border border-green-500 rounded h-40 font-mono text-xs"
          placeholder="Paste PRIVATE KEY here..."
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
        />
        <button
          onClick={() => privateKey.trim() && setIsKeyLoaded(true)}
          className="mt-6 bg-green-600 px-8 py-3 rounded font-bold"
        >
          Load Key
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-blue-700 p-4 text-white flex justify-between">
        <h1 className="font-bold">Chat: {currentUser}</h1>
        <button onClick={handleLogout} className="bg-red-500 px-3 rounded">Logout</button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === currentUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs p-3 rounded-lg shadow-sm ${msg.sender === currentUser ? 'bg-blue-600 text-white' : 'bg-white'}`}>
              <p className="text-xs font-bold opacity-75">{msg.sender}</p>
              <p>{msg.text || '🔒 Decrypting...'}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 bg-white shadow-lg flex gap-2">
        <input className="w-1/4 p-3 border rounded" placeholder="Recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
        <input className="flex-1 p-3 border rounded" placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
        <button type="submit" className="bg-blue-600 text-white px-6 rounded">Send</button>
      </form>
    </div>
  );
}
