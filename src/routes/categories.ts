import { Router } from 'express';
import { auth } from '../middleware/auth';
import { roles } from '../middleware/roles';
import { list, create, update, remove } from '../controllers/categoryController';

const router = Router();

router.get('/', list);
router.post('/', auth, roles(['ADMIN']), create);
router.put('/:id', auth, roles(['ADMIN']), update);
router.delete('/:id', auth, roles(['ADMIN']), remove);

export default router;
