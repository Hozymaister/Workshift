import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual, ScryptOptions } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Použití promisify pro scrypt
const scryptAsync = promisify(scrypt);

// Bezpečná implementace hashování s vyššími parametry bezpečnosti
export async function hashPassword(password: string) {
  // Zvýšení délky soli pro lepší bezpečnost
  const salt = randomBytes(32).toString("hex");
  
  // Nastavení pro zvýšení bezpečnosti (N = 2^14, r = 8, p = 1)
  const N = 16384; // 2^14 (standardní doporučení)
  const r = 8;     // Doporučená hodnota
  const p = 1;     // Paralelní faktor (obvykle 1 pro webové aplikace)
  
  return new Promise<string>((resolve, reject) => {
    scrypt(password, salt, 64, { N, r, p }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${derivedKey.toString("hex")}.${salt}`);
    });
  });
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  
  return new Promise<boolean>((resolve, reject) => {
    // Výchozí nastavení pro kryptografickou sílu
    const options = { 
      N: 16384,  // CPU/memory cost faktor
      r: 8,      // Block size faktor
      p: 1       // Paralelizační faktor
    };
    
    // Ověření hesla se stejnými parametry jako při vytváření
    scrypt(supplied, salt, 64, options, (err, derivedKey) => {
      if (err) return reject(err);
      
      try {
        // Bezpečné porovnání odolné vůči timing útokům
        resolve(timingSafeEqual(hashedBuf, derivedKey));
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function setupAuth(app: Express) {
  // Ověříme, zda je SESSION_SECRET k dispozici v produkčním prostředí
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    console.error('VAROVÁNÍ: SESSION_SECRET není nastaven v produkčním prostředí!');
    console.error('Pro produkční nasazení by měl být nastaven stabilní SESSION_SECRET!');
    // Použijeme náhodný klíč, pokud není SESSION_SECRET nastaven, ale to způsobí odhlášení uživatelů při restartu
    process.env.SESSION_SECRET = randomBytes(32).toString('hex');
  }

  // Bezpečnostní opatření - ujistíme se, že používáme silný SESSION_SECRET
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    name: 'shift_manager_sid', // Vlastní název cookie pro zvýšení bezpečnosti
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true, // Ochrana proti XSS
      sameSite: 'lax', // Ochrana proti CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 týden
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
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      
      // Odstranění hesla z objektu uživatele pro zvýšení bezpečnosti
      const { password, ...safeUser } = user;
      
      // Přidání časového razítka poslední aktivity
      const userWithTimestamp = {
        ...safeUser,
        lastActive: new Date()
      };
      
      done(null, userWithTimestamp as any);
    } catch (error) {
      console.error("Error during user deserialization:", error);
      done(error, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const userData = { ...req.body };
      
      // Zkontrolujeme, zda email už existuje
      const existingUserByEmail = await storage.getUserByEmail(userData.email);
      if (existingUserByEmail) {
        return res.status(400).send("Email již existuje");
      }

      // Zkontrolujeme, zda username už existuje
      const existingUserByUsername = await storage.getUserByUsername(userData.username);
      if (existingUserByUsername) {
        return res.status(400).send("Uživatelské jméno již existuje");
      }
      
      // Pro firemní účty zkontrolujeme IČO
      if (userData.role === "company") {
        // Validace IČO - musí mít přesně 8 číslic
        if (!userData.companyId || !/^\d{8}$/.test(userData.companyId)) {
          return res.status(400).send("IČO musí mít přesně 8 číslic");
        }
        
        // Validace DIČ (pokud existuje) - musí začínat CZ a pak 8-10 číslic
        if (userData.companyVatId && !/^CZ\d{8,10}$/.test(userData.companyVatId)) {
          return res.status(400).send("DIČ musí být ve formátu 'CZ' následovaném 8-10 číslicemi");
        }
        
        // Validace povinných polí pro firemní účty
        if (!userData.companyName) {
          return res.status(400).send("Název firmy je povinný");
        }
        if (!userData.companyAddress) {
          return res.status(400).send("Adresa firmy je povinná");
        }
        if (!userData.companyCity) {
          return res.status(400).send("Město je povinné");
        }
        if (!userData.companyZip || !/^\d{5}$/.test(userData.companyZip)) {
          return res.status(400).send("PSČ musí mít přesně 5 číslic");
        }
      }

      // Vytvoříme uživatele s hashovaným heslem
      const user = await storage.createUser({
        ...userData,
        password: await hashPassword(userData.password),
      });

      // Přihlásíme uživatele
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Neexponujeme hash hesla
        const { password, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (error) {
      console.error("Error during registration:", error);
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
    console.log("Logout endpoint called");
    // Pokud je uživatel přihlášen, odhlásit ho
    if (req.isAuthenticated()) {
      console.log("User is authenticated, performing logout");
      req.logout((err) => {
        if (err) {
          console.error("Logout error:", err);
          return next(err);
        }
        req.session.destroy((err) => {
          if (err) {
            console.error("Session destruction error:", err);
            return next(err);
          }
          console.log("Session destroyed, logout successful");
          res.clearCookie('shift_manager_sid'); // Aktualizováno na vlastní název cookie
          res.status(200).json({ message: "Logout successful" });
        });
      });
    } else {
      // Uživatel již není přihlášen, ale i tak vrátíme úspěch
      console.log("User already not authenticated");
      res.status(200).json({ message: "Already logged out" });
    }
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Don't expose password hash to client
    const { password, ...safeUser } = req.user as SelectUser;
    res.json(safeUser);
  });
}
