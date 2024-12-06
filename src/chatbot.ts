import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';

export class Chatbot {
  private services: Record<string, { responseText: string; imagePath?: string }> = {};
  private SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQeQO--0gTcKt3DYWkMaoAC_vgNKGl1SrO9v3xM9aP5-QsgOMR9oSR-3V63wjTRCQ/pub?output=csv';

  constructor() {
    // Cargar los números desde el CSV al iniciar el chatbot
    this.loadNumbersFromCSV();
  }

  // Cargar los datos desde el archivo CSV
  private async loadNumbersFromCSV() {
    try {
      const response = await fetch(this.SHEET_URL);
      const csvData = await response.text();
  
      // Analiza los datos CSV y convierte en un objeto
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
      });
  
      // Limpiar la variable services y llenarla con los datos
      this.services = {};
  
      // Iterar sobre cada fila del CSV y guardar los datos en services
      records.forEach((row: any) => {
        const keywords = row['servicios'].toLowerCase().trim().split(',').map((keyword: string) => keyword.trim());; // Palabras clave separadas por coma
        const responseText = row['número']; // Respuesta que se devolverá
        const imagePath = row['imagen'] ? row['imagen'].trim() : null; // Imagen (opcional)
  
        // Guardar la respuesta asociada a cada palabra clave
        keywords.forEach((keyword: string) => {
          this.services[keyword.trim()] = { responseText, imagePath };
        });
      });
  
      // Verificamos que los datos fueron cargados correctamente
      // console.log('Datos del CSV cargados:', this.services);
    } catch (error) {
      console.error('Error al cargar el archivo CSV:', error);
    }
  }
  

  // Formatear URL de Google Drive (si es necesario)
  private formatGoogleDriveURL(url: string): string | null {
    const regex = /https:\/\/drive\.google\.com\/file\/d\/(.*?)\/view/;
    const match = url.match(regex);
    return match && match[1] ? `https://drive.google.com/uc?export=view&id=${match[1]}` : null;
  }

  // Detectar palabras clave en el mensaje
  private detectKeywords(message: string, keywords: string[]): boolean {
    const normalizedMessage = message.toLowerCase().trim(); // Normalizar el mensaje
    return keywords.some((keyword) => normalizedMessage.includes(keyword.trim().toLowerCase()));
  }
  

  // Responder al mensaje recibido
  public async respondToMessage(message: string): Promise<{ text: string; media?: string }> {
    // console.log('Recibiendo mensaje para procesar:', message.toLowerCase().trim());
  
    const serviceName = Object.keys(this.services).find((keyword) => {
      const isMatch = this.detectKeywords(message, [keyword]);
      // console.log(`Comparando "${message}" con palabra clave "${keyword}": ${isMatch}`);
      return isMatch;
    });
  
    if (serviceName && this.services[serviceName]) {
      const { responseText, imagePath } = this.services[serviceName];
  
      // console.log('Palabra clave encontrada:', serviceName);
  
      let formattedImagePath: string | undefined = imagePath;
      if (imagePath && imagePath.includes('drive.google.com')) {
        formattedImagePath = this.formatGoogleDriveURL(imagePath) || undefined;
      }
  
      return formattedImagePath
        ? { text: responseText, media: formattedImagePath }
        : { text: responseText };
    }
  
    console.log('No se encontró respuesta para el mensaje');
    const defaultResponse = this.services['sinrespuesta'];
    if (defaultResponse) {
      const { responseText, imagePath } = defaultResponse;
      let formattedImagePath: string | undefined = imagePath;
      if (imagePath && imagePath.includes('drive.google.com')) {
        formattedImagePath = this.formatGoogleDriveURL(imagePath) || undefined;
      }
  
      return formattedImagePath
        ? { text: responseText, media: formattedImagePath }
        : { text: responseText };
    }
  
    return { text: 'Lo siento, no tengo información para esa consulta.' };
  }
  
  
}
