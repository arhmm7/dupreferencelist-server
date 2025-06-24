import express from 'express';
import { ensureAuthenticated } from '../middlewares/auth.middleware.js';
import { generatePreferenceList, getUserLists } from '../controllers/list.controller.js';

const router = express.Router();

router.post('/generateList',ensureAuthenticated,generatePreferenceList);
router.post('/lists',ensureAuthenticated,getUserLists);

export default router;
