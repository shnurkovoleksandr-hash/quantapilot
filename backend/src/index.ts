import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { healthRouter } from './api/routes/health';
import { validationRouter } from './api/routes/validation';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(
  morgan('combined', {
    stream: { write: message => logger.info(message.trim()) },
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/health', healthRouter);
app.use('/validation', validationRouter);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'QuantaPilot Backend API',
    version: '1.0.0',
    status: 'running',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message:
        process.env['NODE_ENV'] === 'production'
          ? 'Something went wrong'
          : err.message,
    });
  }
);

// Only start the server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`QuantaPilot Backend server running on port ${PORT}`);
    logger.info(`Health check available at http://localhost:${PORT}/health`);
  });
}

export default app;
