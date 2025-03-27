import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Ověříme, zda je SESSION_SECRET k dispozici v produkčním prostředí
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    console.error('SESSION_SECRET není nastaven v produkčním prostředí!');
    // Použijeme náhodný klíč, pokud není SESSION_SECRET nastaven (pro vývoj)
    process.env.SESSION_SECRET = randomBytes(32).toString('hex');
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "shift-manager-dev-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        const user = await storage.getUserByEmail(email);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUserByEmail = await storage.getUserByEmail(req.body.email);
      if (existingUserByEmail) {
        return res.status(400).send("Email already exists");
      }

      const existingUserByUsername = await storage.getUserByUsername(req.body.username);
      if (existingUserByUsername) {
        return res.status(400).send("Username already exists");
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        
        // Don't expose password hash to client
        const { password, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", async (req, res, next) => {
    try {
      console.log("Login attempt:", { email: req.body.email });
      
      // Email je case-insensitive, převedeme na lowercase
      const emailLowerCase = req.body.email?.toLowerCase();
      
      // Manuální ověření uživatele (přeskakujeme Passport)
      const user = await storage.getUserByEmail(emailLowerCase);
      
      if (!user) {
        console.log("User not found");
        return res.status(401).send("Neplatný email nebo heslo");
      }
      
      const passwordMatch = await comparePasswords(req.body.password, user.password);
      
      if (!passwordMatch) {
        console.log("Password doesn't match");
        return res.status(401).send("Neplatný email nebo heslo");
      }
      
      // Použití Passport, ale s již ověřeným uživatelem
      req.login(user, (err) => {
        if (err) {
          console.log("Login error:", err);
          return next(err);
        }
        
        console.log("Login success for user:", user.id);
        // Neposílejme hashované heslo klientovi
        const { password, ...safeUser } = user;
        res.status(200).json(safeUser);
      });
    } catch (error) {
      console.error("Login error:", error);
      next(error);
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Don't expose password hash to client
    const { password, ...safeUser } = req.user as SelectUser;
    res.json(safeUser);
  });
}
