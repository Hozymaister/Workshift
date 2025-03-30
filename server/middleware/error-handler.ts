import { NextFunction, Request, Response } from "express";

/**
 * Middleware pro globální zpracování chyb
 * - Skrývá technické podrobnosti o chybách v produkčním prostředí
 * - Loguje detaily chyb pro účely ladění
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Logování chyby pro účely ladění
  console.error("Interní chyba serveru:", err);
  
  // Získání kódu HTTP stavu, nebo výchozí 500
  const statusCode = err.statusCode || 500;
  
  // V produkčním prostředí skrýváme detaily chyb
  const isDev = process.env.NODE_ENV !== 'production';
  
  // Obecná zpráva pro produkci, detailní pro vývoj
  const message = isDev ? err.message : 'Interní chyba serveru';
  
  // Detaily chyby pouze v dev prostředí
  const details = isDev ? {
    stack: err.stack,
    ...err
  } : undefined;
  
  res.status(statusCode).json({
    error: message,
    ...(details ? { details } : {})
  });
}

/**
 * Middleware pro zpracování 404 (Not Found) chyb
 */
export function notFoundHandler(req: Request, res: Response) {
  // Logování pokusů o přístup na neexistující cesty
  console.warn(`Pokus o přístup na neexistující cestu: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    error: "Požadovaný zdroj nebyl nalezen",
    path: req.originalUrl
  });
}

/**
 * Middleware pro zpracování neplatných JSON dat
 */
export function jsonParserErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof SyntaxError && 'body' in err) {
    console.warn("Neplatný JSON v požadavku:", err.message);
    return res.status(400).json({
      error: "Neplatný formát JSON dat v požadavku"
    });
  }
  next(err);
}

/**
 * Middleware pro nastavení bezpečnostních HTTP hlaviček
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Ochrana proti clickjacking útokům
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Ochrana proti MIME-sniffing útokům
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Ochrana proti XSS útokům
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Nastavení Content Security Policy (CSP)
  // Toto by mělo být přizpůsobeno podle potřeb aplikace
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;"
    );
  }
  
  // Omezení informací o použitém serveru
  res.setHeader('X-Powered-By', 'ShiftManager');
  
  next();
}