import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import bcrypt from "bcryptjs";
import prisma from "../prisma/client.js";

passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.password) return done(null, false, { message: "Invalid credentials" });

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return done(null, false, { message: "Invalid credentials" });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";

// GOOGLE
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${backendUrl}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await prisma.user.upsert({
          where: { email: profile.emails[0].value },
          update: {},
          create: {
            email: profile.emails[0].value,
            name: profile.displayName,
            image: profile.photos[0].value,
          },
        });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// FACEBOOK
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: `${backendUrl}/api/auth/facebook/callback`,
      profileFields: ["id", "emails", "name", "displayName", "photos"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(null, false, { message: "No email provided" });

        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            email,
            name: profile.displayName,
            image: profile.photos?.[0]?.value,
          },
        });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);
