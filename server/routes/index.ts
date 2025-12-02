/**
 * Routes Aggregator
 * Central module that registers all route modules with the Express app
 */

import type { Express, Server } from 'express';
import { registerAuthRoutes } from './auth.routes';
import { registerUserRoutes } from './users.routes';

/**
 * Registers all route modules with the Express application
 * @param app Express application instance
 * @returns HTTP server instance
 */
export async function registerRoutes(app: Express): Promise<Server> {
    // Register modularized routes
    registerAuthRoutes(app);
    registerUserRoutes(app);

    // TODO: Register additional route modules as they are migrated:
    // - registerCompanyRoutes(app);
    // - registerBankRoutes(app);
    // - registerPayableRoutes(app);
    // - registerReceivableRoutes(app);
    // - registerReportRoutes(app);
    // - registerAccountingRoutes(app);
    // - registerBackupRoutes(app);

    // Start server
    const port = Number(process.env.PORT) || 5000;
    const server = app.listen(port);

    return server;
}
