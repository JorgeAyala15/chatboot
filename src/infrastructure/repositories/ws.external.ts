import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import axios from 'axios';
import { Chatbot } from '../../chatbot'; // Chatbot será una clase separada que maneja las respuestas
import qrcode from 'qrcode-terminal';

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
    // console.log('Mensaje recibido de WhatsApp:', msg.body);

    const chatbotResponse = await this.chatbot.respondToMessage(msg.body);

    if (chatbotResponse.media) {
      // Asegúrate de que chatbotResponse.media sea un MessageMedia válido
      let media: MessageMedia | undefined;

      // Si media es una URL (string), conviértelo a MessageMedia
      if (typeof chatbotResponse.media === 'string' && chatbotResponse.media.startsWith('http')) {
        try {
          // Usamos unsafeMime: true para permitir la descarga sin verificar el MIME
          media = await MessageMedia.fromUrl(chatbotResponse.media, { unsafeMime: true }); // Convierte la URL a MessageMedia
        } catch (error) {
          console.error('Error al convertir la URL en media:', error);
        }
      } else {
        console.error('El formato del media no es válido');
      }

      // Si la conversión fue exitosa, enviamos el mensaje con el media
      if (media) {
        await this.sendMessage(msg.from, chatbotResponse.text, {
          media: media,
        });
      } else {
        // Si no hay media válido, enviamos solo el texto
        await this.sendMessage(msg.from, chatbotResponse.text);
      }
    } else {
      // Si no hay media, solo enviamos el texto
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

      if (imagePath) {
        // Aquí se manejaría el envío de mensajes con imágenes
        const media = await this.downloadImage(imagePath); // Método para descargar imágenes
        if (!media) {
          return { error: 'No se pudo descargar la imagen desde la URL.' };
        }

        const response = await this.sendMessage(`${phone}@c.us`, message, { media });
        return { response };
      }

      // Si no se pasa imagen, solo enviamos el mensaje de texto
      const response = await this.sendMessage(`${phone}@c.us`, message);
      return { response };
    } catch (error:any) {
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
