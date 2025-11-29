import { useState } from 'react';
// FIX 1: Import the new class name 'MlKem512'
import { MlKem512 } from 'crystals-kyber-js';

export default function KeyGen() {
  const [keys, setKeys] = useState({ publicKey: '', privateKey: '' });
  const [status, setStatus] = useState('');

  const generate = async () => {
    setStatus('Generating...');
    try {
      // FIX 2: Create an instance
      const recipient = new MlKem512();

      // FIX 3: Generate keys (Returns an array [publicKey, privateKey])
      const [pk, sk] = await recipient.generateKeyPair();
      
      // Helper to convert Bytes to Hex
      const toHex = (bytes) => 
        bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

      setKeys({
        publicKey: toHex(pk),
        privateKey: toHex(sk)
      });
      setStatus('Success! (ML-KEM-512)');
    } catch (e) {
      console.error(e);
      alert("Error: " + e.message);
      setStatus('Failed');
    }
  };

  return (
    <div className="p-8 font-sans max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">PQC Key Generator (ML-KEM)</h1>
      
      <button 
        onClick={generate}
        className="bg-blue-600 text-white px-6 py-2 rounded font-bold mb-6 hover:bg-blue-700"
      >
        Generate New Key Pair
      </button>
      <span className="ml-4 text-gray-600 font-bold">{status}</span>

      <div className="space-y-6">
        <div>
          <h3 className="font-bold text-lg">Public Key</h3>
          <textarea 
            className="w-full h-32 p-2 border bg-gray-50 font-mono text-xs" 
            readOnly 
            value={keys.publicKey} 
          />
        </div>

        <div>
          <h3 className="font-bold text-lg text-red-600">Private Key</h3>
          <textarea 
            className="w-full h-32 p-2 border bg-gray-50 font-mono text-xs" 
            readOnly 
            value={keys.privateKey} 
          />
        </div>
      </div>
    </div>
  );
}