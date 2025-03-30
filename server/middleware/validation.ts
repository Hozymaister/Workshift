import { NextFunction, Request, Response } from "express";
import { z, ZodSchema } from "zod";
import { fromZodError } from "zod-validation-error";

/**
 * Middleware pro validaci vstupních dat pomocí Zod schémat
 * 
 * @param schema Zod schéma pro validaci
 * @param source Zdroj dat pro validaci (body, query, params)
 */
export function validateRequest(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validace dat podle zdroje
      const data = source === 'body' ? req.body : 
                 source === 'query' ? req.query : req.params;
      
      // Provedení validace
      const validatedData = schema.parse(data);
      
      // Nahrazení původních dat validovanými daty
      if (source === 'body') {
        req.body = validatedData;
      } else if (source === 'query') {
        req.query = validatedData;
      } else {
        req.params = validatedData;
      }
      
      next();
    } catch (error) {
      // Převedení Zod chyby na uživatelsky přívětivou zprávu
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          error: "Neplatná data", 
          details: validationError.message 
        });
      }
      
      // Pokud nastane jiná chyba, předáme ji dál
      next(error);
    }
  };
}

/**
 * Middleware pro sanitizaci dat před jejich uložením do databáze
 * Odstraňuje potenciálně nebezpečné HTML a JavaScript značky
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  try {
    // Jednoduchá sanitizace pro textové vstupy v req.body
    if (req.body && typeof req.body === 'object') {
      for (const key in req.body) {
        if (typeof req.body[key] === 'string') {
          // Základní sanitizace - nahrazení < a > znaků
          req.body[key] = req.body[key]
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        }
      }
    }
    next();
  } catch (error) {
    console.error('Chyba při sanitizaci vstupních dat:', error);
    next();
  }
}

// Pomocné funkce pro často používané validační schémata
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20)
});

// Validátor pro email
export const emailValidator = z.string().email("Neplatný formát e-mailu");

// Validátor pro heslo (min. 8 znaků, alespoň 1 číslo a 1 speciální znak)
export const passwordValidator = z.string()
  .min(8, "Heslo musí mít alespoň 8 znaků")
  .regex(/[0-9]/, "Heslo musí obsahovat alespoň jedno číslo")
  .regex(/[^a-zA-Z0-9]/, "Heslo musí obsahovat alespoň jeden speciální znak");

// Validátor pro IČO
export const icoValidator = z.string().regex(/^\d{8}$/, "IČO musí obsahovat přesně 8 číslic");

// Validátor pro DIČ
export const dicValidator = z.string().regex(/^CZ\d{8,10}$/, "DIČ musí být ve formátu 'CZ' následovaném 8-10 číslicemi");

// Validátor pro PSČ
export const zipValidator = z.string().regex(/^\d{5}$/, "PSČ musí obsahovat přesně 5 číslic");