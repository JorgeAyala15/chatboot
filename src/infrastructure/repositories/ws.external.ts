import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import axios from 'axios';
import { Chatbot } from '../../chatbot'; // Chatbot será una clase separada que maneja las respuestas
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';

class WsTransporter extends Client {
  private status = false;
  private chatbot: Chatbot; // Chatbot para gestionar las respuestas

  constructor() {
    super({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ["--disable-setuid-sandbox", "--unhandled-rejections=strict"],
      },
    });

    this.chatbot = new Chatbot(); // Instanciamos el chatbot
    this.initialize();

    // Evento de "listo" para indicar que el cliente de WhatsApp está listo
    this.on('ready', () => {
      this.status = true;
      console.log('Cliente listo para recibir mensajes y procesar respuestas');
    });

    // Escuchar mensajes entrantes
    this.on('message', async (msg) => {
      if (msg.body) {
        const chatbotResponse = await this.chatbot.respondToMessage(msg.body);

        if (chatbotResponse.media) {
          let media: MessageMedia | undefined;

          if (typeof chatbotResponse.media === 'string' && chatbotResponse.media.startsWith('http')) {
            try {
              media = await MessageMedia.fromUrl(chatbotResponse.media, { unsafeMime: true });
            } catch (error) {
              console.error('Error al convertir la URL en media:', error);
            }
          } else {
            console.error('El formato del media no es válido');
          }

          if (media) {
            await this.sendMessage(msg.from, chatbotResponse.text, {
              media: media,
            });
          } else {
            await this.sendMessage(msg.from, chatbotResponse.text);
          }
        } else {
          await this.sendMessage(msg.from, chatbotResponse.text);
        }
      }
    });

    // Manejo de errores de autenticación
    this.on('auth_failure', () => {
      console.log('Error de autenticación');
    });

    // Si el cliente aún no está autenticado, mostramos el código QR
    this.on('qr', (qr) => {
      console.log('Escanea el código QR');
      qrcode.generate(qr, { small: true });
    });
  }

  // Función para enviar un mensaje (con o sin imagen) por WhatsApp
  async sendMsg({
    message,
    phone,
    filePaths = [],
  }: {
    message: string;
    phone: string;
    filePaths?: string[];
  }): Promise<any> {
    try {
      if (!this.status) return { error: 'WAIT_LOGIN' };
  
      const phoneNumber = `${phone}@c.us`;
      let lastResponse;
  
      // Primero, enviamos el mensaje de texto si existe
      if (message) {
        lastResponse = await this.sendMessage(phoneNumber, message);
      }
  
      // Procesar y enviar cada archivo individualmente
      for (const filePath of filePaths) {
        try {
          // Leer el archivo y convertirlo a base64
          const fileBuffer = fs.readFileSync(filePath);
          const mimeType = this.getMimeType(filePath);
          const media = new MessageMedia(mimeType, fileBuffer.toString('base64'), path.basename(filePath));
  
          // Enviar el archivo como un mensaje separado
          lastResponse = await this.sendMessage(phoneNumber, media);
        } catch (error) {
          console.error(`Error al procesar el archivo ${filePath}:`, error);
        }
      }
  
      return { response: lastResponse };
    } catch (error: any) {
      console.error('Error al enviar el mensaje:', error);
      return { error: error.message };
    }
  }
  
  // Método para determinar el tipo MIME según la extensión del archivo
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
  


  // Método para descargar la imagen desde una URL y convertirla a un objeto MessageMedia
  // private async downloadImage(imageUrl: string): Promise<MessageMedia | null> {
  //   try {
  //     const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  //     const buffer = Buffer.from(response.data, 'binary');
  //     return new MessageMedia('image/jpeg', buffer.toString('base64'));
  //   } catch (error) {
  //     console.error('Error al descargar la imagen:', error);
  //     return null;
  //   }
  // }
}
export default WsTransporter;
