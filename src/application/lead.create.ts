// src/application/lead.create.ts
import LeadExternal from "../domain/lead-external.repository";
import LeadRepository from "../domain/lead.repository";

export class LeadCreate {
  private leadRepository: LeadRepository;
  private leadExternal: LeadExternal;

  constructor(repositories: [LeadRepository, LeadExternal]) {
    const [leadRepository, leadExternal] = repositories;
    this.leadRepository = leadRepository;
    this.leadExternal = leadExternal;
  }

  public async sendMessageAndSave({
    message,
    phone,
    imagePath,
  }: {
    message: string;
    phone: string;
    imagePath?: string; // Imagen opcional
  }) {
    const responseDbSave = await this.leadRepository.save({ message, phone }); // Guardar en DB
    const responseExSave = await this.leadExternal.sendMsg({ message, phone, imagePath }); // Enviar mensaje de WhatsApp
    return { responseDbSave, responseExSave };
  }
}
