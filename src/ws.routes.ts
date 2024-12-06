// src/routes/ws.routes.ts
import express, { Request, Response } from 'express';
import WsTransporter from './infrastructure/repositories/ws.external';

const router = express.Router();
const wsTransporter = new WsTransporter();

router.post('/lead', async (req: Request, res: Response) => {
  const { message, phone, imagePath } = req.body;

  try {
    // Llamamos al método sendMsg con los parámetros correspondientes
    const result = await wsTransporter.sendMsg({
      message,
      phone,
      imagePath
    });

    if (result.response) {
      res.status(200).send({ success: true, response: result.response });
    } else {
      res.status(400).send({ success: false, error: result.error });
    }
  } catch (error: any) {
    console.error('Error al enviar el mensaje:', error);
    res.status(500).send({ success: false, error: error.message });
  }
});

export default router;
