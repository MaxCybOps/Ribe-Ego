import { Router } from 'express';
import { authRouter } from './authRoutes.js';
import { catalogRouter } from './catalogRoutes.js';
import { inventoryRouter } from './inventoryRoutes.js';
import { rfqRouter } from './rfqRoutes.js';
import { orderRouter } from './orderRoutes.js';
import { paymentRouter } from './paymentRoutes.js';
import { adminRouter } from './adminRoutes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/catalog', catalogRouter);
apiRouter.use('/inventory', inventoryRouter);
apiRouter.use('/rfq', rfqRouter);
apiRouter.use('/orders', orderRouter);
apiRouter.use('/payments', paymentRouter);
apiRouter.use('/admin', adminRouter);
