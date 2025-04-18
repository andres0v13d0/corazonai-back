import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
    console.log('🔍 Cookies recibidas:', req.cookies); 

    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'No autenticado' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, email }
        next();
    } catch (err) {
        console.error('Token inválido:', err);
        return res.status(403).json({ message: 'Token inválido' });
    }
};
