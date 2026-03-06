import { Router } from 'express';
import { auth } from '../middleware/auth';
import { roles } from '../middleware/roles';
import { list, getOne, create, update, remove, getHistory } from '../controllers/productController';

const router = Router();

router.get('/', list);
router.get('/:id', getOne);
router.get('/:id/history', getHistory);
router.post('/', auth, roles(['ADMIN']), create);
router.put('/:id', auth, roles(['ADMIN']), update);
router.delete('/:id', auth, roles(['ADMIN']), remove);

export default router;
