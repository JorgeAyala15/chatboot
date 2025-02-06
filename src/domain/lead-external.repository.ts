// src/domain/lead-external.repository.ts
export default interface LeadExternal {
    sendMsg({
      message,
      phone,
      filePaths,
    }: {
      message: string;
      phone: string;
      filePaths?: string[]; 
    }): Promise<any>;
  }
  