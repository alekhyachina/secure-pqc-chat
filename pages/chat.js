import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import Cookies from 'js-cookie';
// Ensure this path matches your file structure exactly
import { encryptMessage, decryptMessage } from '../utils/crypto';

let socket;

export default function Chat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [privateKey, setPrivateKey] = useState(''); 
  const [isKeyLoaded, setIsKeyLoaded] = useState(false);
  const [recipient, setRecipient] = useState(''); 
  const [currentUser, setCurrentUser] = useState('');
  
  const router = useRouter();
  const messagesEndRef = useRef(null);

  // --- 1. CONNECT TO SERVER ---
  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
        router.push('/');
        return;
    }

    // A. Decode Username
    let userFromToken = '';
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        userFromToken = JSON.parse(jsonPayload).username;
        setCurrentUser(userFromToken);
    } catch (e) {
        console.error("Token error", e);
        return;
    }

    // B. Initialize Socket
    const initSocket = async () => {
      await fetch('/api/socket'); 
      
      // THIS IS THE CRITICAL PART - SENDING THE USERNAME
      socket = io({
          query: { username: userFromToken } 
      });

      socket.on('connect', () => {
          console.log(`✅ CLIENT: Connected as ${userFromToken}`);
      });

      socket.on('receive_message', (data) => {
          console.log("📩 CLIENT: Message received!", data); 
          setMessages((prev) => [...prev, { ...data, isEncrypted: true }]);
      });
    };

    initSocket();

    return () => { if (socket) socket.disconnect(); };
  }, [router]);


  // --- 2. DECRYPT MESSAGES ---
  useEffect(() => {
    if (!isKeyLoaded || !privateKey) return;

    const decryptAll = async () => {
        const decryptedPromises = messages.map(async (msg) => {
            if (msg.isEncrypted && !msg.text && msg.sender !== currentUser) {
                try {
                    const decryptedText = await decryptMessage(msg.content, privateKey);
                    return { ...msg, text: decryptedText, isEncrypted: false };
                } catch (e) {
                    console.error("Decryption failed", e);
                    return { ...msg, text: "⚠️ Decryption Failed", isEncrypted: false };
                }
            }
            return msg;
        });
        
        const results = await Promise.all(decryptedPromises);
        if (JSON.stringify(results) !== JSON.stringify(messages)) {
            setMessages(results);
        }
    };
    decryptAll();
  }, [messages, isKeyLoaded, privateKey, currentUser]);

  // --- 3. AUTO SCROLL ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- 4. SEND MESSAGE ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message || !recipient) return;

    try {
        // Fetch Key
        const res = await fetch(`/api/user/${recipient}`);
        if (!res.ok) throw new Error("User not found");
        const { pqcPublicKey } = await res.json();

        // Encrypt
        const payload = await encryptMessage(pqcPublicKey, message);

        // Send
        socket.emit('send_message', {
            sender: currentUser,
            receiver: recipient,
            content: payload,
            timestamp: new Date()
        });

        // Show locally
        setMessages((prev) => [...prev, { 
            sender: currentUser, 
            text: message, 
            timestamp: new Date(),
            isEncrypted: false 
        }]);
        
        setMessage('');
    } catch (error) {
        alert("Error: " + error.message);
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
                onClick={() => setIsKeyLoaded(true)}
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
        <button onClick={() => window.location.reload()} className="bg-red-500 px-3 rounded">Logout</button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === currentUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs p-3 rounded-lg shadow-sm ${msg.sender === currentUser ? 'bg-blue-600 text-white' : 'bg-white'}`}>
              <p className="text-xs font-bold opacity-75">{msg.sender}</p>
              <p>{msg.text || (msg.isEncrypted ? "🔒 Decrypting..." : msg.text)}</p>
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