import { Router } from "express";
import passport from "passport";
import { login, logout, register } from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import prisma from "../prisma/client.js";
import jwt from "jsonwebtoken";



const router = Router();

router.post("/login", login);
router.post("/logout", logout);

// Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
    session: false,
  }),
  (req, res) => {
    const token = jwt.sign({ id: req.user.id, email: req.user.email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });


    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie("token", token, {
    httpOnly: true,
    sameSite: isProduction ? "None" : "Lax", // 🔄 Lax en local
    secure: isProduction,                   // ✅ false en local
    });

      

    res.redirect(`${process.env.FRONTEND_URL}/callback`);
  }
);

// Facebook OAuth
router.get("/facebook", passport.authenticate("facebook", { scope: ["email"] }));

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
    session: false,
  }),
  (req, res) => {
    const token = jwt.sign({ id: req.user.id, email: req.user.email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "None",
      secure: false,
    });

    res.redirect(`${process.env.FRONTEND_URL}/callback`);
  }
);

router.post('/register', register);

router.get('/me', authenticateToken, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        },
      });
  
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
  
      res.json({ user });
    } catch (err) {
      console.error('Error en /me:', err);
      res.status(500).json({ message: 'Error del servidor' });
    }
  });

export default router;
