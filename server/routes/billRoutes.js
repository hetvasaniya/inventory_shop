const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { protect } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .get(billController.getBills)
  .post(billController.createBill);

router.get('/:id', billController.getBill);
router.get('/:id/pdf', billController.getBillPDF);
router.post('/:id/share/email', billController.shareBillEmail);
router.get('/:id/share/whatsapp', billController.shareBillWhatsApp);

module.exports = router;
