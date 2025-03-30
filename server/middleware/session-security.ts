import { NextFunction, Request, Response, CookieOptions } from "express";
import { SessionData } from "express-session";

/**
 * Konstanta pro maximální dobu nečinnosti (30 minut)
 */
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minut

/**
 * Middleware pro monitorování aktivity session
 * - Ukončí session při dlouhé nečinnosti
 * - Obnoví časové razítko aktivity při každé akci
 */
export function sessionActivityMonitor(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.isAuthenticated()) {
    const now = Date.now();
    
    // Pokud uživatel má časové razítko poslední aktivity
    if (req.user && (req.user as any).lastActive) {
      const lastActive = new Date((req.user as any).lastActive).getTime();
      
      // Pokud je uživatel neaktivní déle než povolený limit, odhlásíme ho
      if (now - lastActive > INACTIVITY_TIMEOUT) {
        console.log(`Odhlášení uživatele ID ${req.user.id} kvůli neaktivitě`);
        req.logout((err) => {
          if (err) console.error("Chyba při odhlášení neaktivního uživatele:", err);
          
          req.session.destroy((err) => {
            if (err) console.error("Chyba při ničení session:", err);
            
            // Přesměrování na přihlášení
            return res.status(401).json({
              error: "Relace vypršela z důvodu neaktivity",
              redirectTo: "/login"
            });
          });
        });
        return; // Ukončíme zpracování middlewaru
      }
    }
    
    // Aktualizace času poslední aktivity
    if (req.user) {
      (req.user as any).lastActive = new Date();
    }
  }
  
  next();
}

/**
 * Middleware pro ochranu proti CSRF útokům
 * - Ověřuje CSRF token pro nebezpečné metody (POST, PUT, DELETE, PATCH)
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Nebezpečné HTTP metody, které by měly být chráněny
  const unsafeMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  
  // Ignorujeme GET, HEAD, OPTIONS
  if (!unsafeMethods.includes(req.method)) {
    return next();
  }
  
  // API endpointy by měly mít CSRF token v hlavičce X-CSRF-Token
  const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session && (req.session as any).csrfToken;
  
  // Pokud nejsou tokeny nebo se neshodují
  if (!sessionToken || !csrfToken || csrfToken !== sessionToken) {
    console.warn('CSRF validace selhala:', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      sessionToken: sessionToken || 'none',
      requestToken: csrfToken || 'none'
    });
    
    // V produkci vratime 403 Forbidden, ve vývoji povolíme pokračovat
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: "CSRF validace selhala"
      });
    }
    
    // Ve vývoji jen varujeme, ale pokračujeme
    console.warn('CSRF validace přeskočena v development módu');
  }
  
  next();
}

/**
 * Middleware pro nastavení SameSite cookie
 */
export function sameSiteCookies(req: Request, res: Response, next: NextFunction) {
  // Přepsání metody res.cookie pro zajištění SameSite=lax na všech cookies
  const originalCookie = res.cookie;
  
  // Typované přepsání funkce cookie
  res.cookie = function(
    this: Response, 
    name: string, 
    val: string,
    options?: CookieOptions
  ) {
    // Výchozí nastavení cookies
    const secureOptions: CookieOptions = options || {};
    
    // Pokud není nastaveno SameSite, přidáme ho
    if (!secureOptions.sameSite) {
      secureOptions.sameSite = 'lax';
    }
    
    // Zajistíme, že cookies jsou httpOnly
    if (secureOptions.httpOnly === undefined) {
      secureOptions.httpOnly = true;
    }
    
    // V produkci nastavíme secure=true
    if (process.env.NODE_ENV === 'production' && secureOptions.secure === undefined) {
      secureOptions.secure = true;
    }
    
    // Voláme původní metodu s vylepšenými možnostmi
    return originalCookie.call(this, name, val, secureOptions);
  } as typeof res.cookie;
  
  next();
}