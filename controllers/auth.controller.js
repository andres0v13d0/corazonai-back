import jwt from "jsonwebtoken";
import prisma from "../prisma/client.js";
import bcrypt from "bcryptjs";

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return res.status(401).json({ message: "Credenciales inválidas" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Credenciales inválidas" });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? "None" : "Lax",
      secure: process.env.NODE_ENV === 'production',
      domain: ".surtte.com",
    });
      

    res.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error interno" });
  }
};

export const logout = (req, res) => {
    res.clearCookie("token", {
      sameSite: "None",
      secure: process.env.NODE_ENV === "production",
      domain: ".surtte.com",
      path: "/",
    });
    res.json({ message: "Sesión cerrada" });
};

export const register = async (req, res) => {
    const { name, email, password } = req.body;
  
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }
  
    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
  
      if (existingUser) {
        return res.status(400).json({ message: 'El correo ya está registrado' });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword },
      });
  
      return res.status(201).json({ message: 'Usuario registrado con éxito', user });
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  };
