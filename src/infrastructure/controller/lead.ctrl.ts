// src/infrastructure/controller/lead.ctrl.ts
import { Request, Response } from "express";
import { LeadCreate } from "../../application/lead.create";

class LeadCtrl {
  constructor(private readonly leadCreator: LeadCreate) {}

  public sendCtrl = async ({ body }: Request, res: Response) => {
    const { message, phone, imagePath } = body;

    if (!message || !phone) {
      return res.status(400).send({ error: "Faltan parámetros: message o phone" });
    }

    try {
      const response = await this.leadCreator.sendMessageAndSave({ message, phone, imagePath });
      res.status(200).send(response);
    } catch (error: any) {
      console.error("Error al enviar el mensaje:", error);
      res.status(500).send({ error: error.message });
    }
  };
}

export default LeadCtrl;
