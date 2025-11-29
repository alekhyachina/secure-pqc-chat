import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
    sender: { 
        type: String, 
        required: true 
    },
    receiver: { 
        type: String, 
        required: true 
    },
    text: { 
        type: String, 
        required: true 
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    }
});

// This line prevents Mongoose from redefining the model if this file is re-run
export default mongoose.models.Message || mongoose.model('Message', MessageSchema);