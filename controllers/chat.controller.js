import prisma from '../prisma/client.js';
import OpenAI from 'openai';
import rateLimit from '../middleware/rateLimit.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

export const handleChat = async (req, res) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    try {
        await limiter.check(res, 10, clientIp);
        console.log(`✅ Límite de tasa aprobado para IP: ${clientIp}`);
    } catch {
        return res.status(429).json({ error: 'Demasiadas peticiones. Intenta más tarde.' });
    }

    const { message, userId, emotionalState } = req.body;

    console.log('📥 Petición de chat recibida:');
    console.log('🧑‍💬 Mensaje del usuario:', message);
    console.log('🧠 Estado emocional:', emotionalState);
    console.log('🆔 ID del usuario:', userId);

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Mensaje inválido' });
    }

    if (!userId) {
        return res.status(400).json({ error: 'Falta ID de usuario' });
    }

    try {
        let chatSession = await prisma.chatSession.findFirst({ where: { userId } });

        if (!chatSession) {
        chatSession = await prisma.chatSession.create({ data: { userId } });
        }

        const chatSessionId = chatSession.id;

        const chatHistories = await prisma.chatHistory.findMany({
        where: { chatSessionId },
        orderBy: { createdAt: 'asc' },
        });

        const messages = [
        {
            role: 'system',
            content:
            'Eres un asistente empático experto en relaciones humanas que habla en español. Tu rol es guiar emocionalmente a las personas y ofrecer consejos útiles según su estado emocional.',
        },
        { role: 'user', content: message },
        ];

        if (emotionalState) {
        messages.push({
            role: 'system',
            content: `El usuario actualmente se siente "${emotionalState}". Ajusta tu respuesta en consecuencia.`,
        });

        if (emotionalState === 'esperanzado') {
            messages.push({ role: 'system', content: 'Motívalo y refuerza esa esperanza.' });
        } else if (emotionalState === 'frustrado') {
            messages.push({
            role: 'system',
            content: 'Tranquilízalo y ayúdalo a ver opciones posibles sin invalidar sus emociones.',
            });
        } else if (emotionalState === 'triste') {
            messages.push({
            role: 'system',
            content: 'Habla con ternura, dale apoyo emocional y recuerda que está bien sentirse así.',
            });
        }
        }

        chatHistories.forEach((chat) => {
            const sender = chat.isUser ? 'user' : 'assistant';
            messages.push({ role: sender, content: chat.message });
        });

        console.log('📦 Prompt enviado a OpenAI:');
        console.dir(messages, { depth: null });

        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages,
            max_tokens: 200,
            temperature: 0.75,
        });

        const aiResponse = completion.choices[0].message.content;
        console.log('📤 Respuesta de OpenAI:', aiResponse);


        await prisma.chatHistory.create({
            data: {
                chatSessionId,
                message,
                isUser: true,
                emotionalState: emotionalState || 'neutral',
            },
        });

        await prisma.chatHistory.create({
        data: {
            chatSessionId,
            message: aiResponse,
            isUser: false,
            emotionalState: emotionalState || 'neutral',
        },
        });

        const updatedHistory = await prisma.chatHistory.findMany({
        where: { chatSessionId },
        orderBy: { createdAt: 'asc' },
        });

        res.status(200).json({ response: aiResponse, history: updatedHistory });
    } catch (error) {
        console.error('❌ Error en chat:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
