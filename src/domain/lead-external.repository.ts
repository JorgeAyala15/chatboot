// src/domain/lead-external.repository.ts
export default interface LeadExternal {
    sendMsg({
      message,
      phone,
      imagePath,
    }: {
      message: string;
      phone: string;
      imagePath?: string; // Añadimos imagePath como parámetro opcional
    }): Promise<any>;
  }
  