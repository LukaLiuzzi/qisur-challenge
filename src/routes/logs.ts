import { Router } from 'express';
import { auth } from '../middleware/auth';
import { roles } from '../middleware/roles';
import { getLogs, getLog } from '../controllers/logsController';

const router = Router();

router.use(auth, roles(['ADMIN']));
router.get('/', getLogs);
router.get('/:id', getLog);

export default router;
