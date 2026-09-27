import mongoose from 'mongoose';
import dns from 'node:dns';

// Some networks hand the OS a link-local IPv6 DNS resolver that Node's
// built-in resolver (c-ares) fails to query correctly for SRV records
// (EBADRESP), even though the OS resolver itself handles it fine. Prefer
// well-known public resolvers so `mongodb+srv://` lookups don't intermittently
// fail; keep the original servers as a fallback.
try {
    dns.setServers(['1.1.1.1', '8.8.8.8']);
} catch {
    // non-fatal — fall back to whatever the OS provides
}

const MONGODB_URI = process.env.MONGODB_URI;

declare global {
    var mongooseCache: {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
    }
}

let cached = global.mongooseCache;// so no new connection is created if one already exists

if(!cached) {
    cached = global.mongooseCache = { conn: null, promise: null };
}

export const connectToDatabase = async () => {
    if(!MONGODB_URI) throw new Error('MONGODB_URI must be set within .env');

    if(cached.conn) return cached.conn;

    if(!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
    }

    try {
        cached.conn = await cached.promise;
    } catch (err) {
        cached.promise = null;
        throw err;
    }

    console.log(`Connected to database ${process.env.NODE_ENV} - ${MONGODB_URI}`);

    return cached.conn;
}