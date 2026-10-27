import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { env } from './config/env.js';

const app = express();
const clientOrigin = new URL(env.CLIENT_ORIGIN);
const allowedClientOrigins = new Set([clientOrigin.origin]);

if (env.NODE_ENV === 'development' && ['localhost', '127.0.0.1'].includes(clientOrigin.hostname)) {
  clientOrigin.hostname = clientOrigin.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
  allowedClientOrigins.add(clientOrigin.origin);
}

app.disable('x-powered-by');
app.set('trust proxy', env.NODE_ENV === 'production' ? 1 : false);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      'script-src': ["'self'", 'https://checkout.razorpay.com'],
      'connect-src': ["'self'", 'https://api.razorpay.com'],
      'frame-src': ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
      'form-action': ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com']
    }
  }
}));
app.use(cors({ origin: [...allowedClientOrigins], credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());

// IMPORTANT: when Razorpay webhooks are added, mount their express.raw() route
// before express.json() so the original body is available for signature verification.
app.use('/api/v1', apiRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
