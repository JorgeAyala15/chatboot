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
    imagePath,
  }: {
    message: string;
    phone: string;
    imagePath?: string;
  }): Promise<any> {
    try {
      if (!this.status) return { error: 'WAIT_LOGIN' };
      if(imagePath?.includes('pdf')){
        try {
          // Leer el archivo PDF desde la ruta local
          const filePath = imagePath;
          // console.log('filePath'+filePath)
          const fileBuffer = fs.readFileSync(imagePath);
          
          // Crear el objeto MessageMedia para el archivo PDF
          const media = new MessageMedia('application/pdf', fileBuffer.toString('base64'), path.basename(filePath));
          
          // Enviar el mensaje con el archivo PDF
          const response = await this.sendMessage(`${phone}@c.us`, message, { media });
          return { response };
        } catch (error: any) {
          console.error('Error al enviar el archivo PDF:', error);
          return { error: error.message };
        }
      }
      if (imagePath) {
  
          // Si es una imagen, lo descargamos directamente
          const media = await this.downloadImage(imagePath);
          if (!media) {
            return { error: 'No se pudo descargar la imagen desde la URL.' };
          }
          const response = await this.sendMessage(`${phone}@c.us`, message, { media });
          return { response };
      }

      // Si no se pasa imagen, solo enviamos el mensaje de texto
      const response = await this.sendMessage(`${phone}@c.us`, message);
      return { response };
    } catch (error: any) {
      console.error('Error al enviar el mensaje:', error);
      return { error: error.message };
    }
  }

  // Método para descargar la imagen desde una URL y convertirla a un objeto MessageMedia
  private async downloadImage(imageUrl: string): Promise<MessageMedia | null> {
    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      return new MessageMedia('image/jpeg', buffer.toString('base64'));
    } catch (error) {
      console.error('Error al descargar la imagen:', error);
      return null;
    }
  }
}
export default WsTransporter;
