import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './users.routes.js';
import questionRoutes from './questions.routes.js';
import answerRoutes from './answers.routes.js';
import commentRoutes from './comments.routes.js';
import voteRoutes from './votes.routes.js';
import catalogRoutes from './catalog.routes.js';
import searchRoutes from './search.routes.js';
import notificationRoutes from './notifications.routes.js';
import reportRoutes from './reports.routes.js';
import messageRoutes from './messages.routes.js';
import paperRoutes from './papers.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/questions', questionRoutes);
router.use('/answers', answerRoutes);
router.use('/comments', commentRoutes);
router.use('/votes', voteRoutes);
router.use('/search', searchRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/messages', messageRoutes);
router.use('/papers', paperRoutes);
router.use('/', catalogRoutes); // departments, courses, tags

export default router;
