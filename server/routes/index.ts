import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { storage } from "../storage";
import { requireAuth } from "./common";
import workplacesRouter from "./workplaces";
import shiftsRouter from "./shifts";
import customersRouter from "./customers";
import invoicesRouter from "./invoices";
import documentsRouter from "./documents";
import workersRouter from "./workers";
import exchangeRequestsRouter from "./exchange-requests";
import reportsRouter from "./reports";
import statsRouter from "./stats";

const passwordResetTokens = new Map<string, { email: string; code: string; expiresAt: number }>();

const DEMO_COMPANIES: Record<string, { name: string; ico: string; dic: string | null; address: string }> = {
  "04917871": {
    name: "Insion s.r.o.",
    ico: "04917871",
    dic: "CZ04917871",
    address: "Na hřebenech II 1718/8, Nusle, 140 00 Praha 4",
  },
  "27082440": {
    name: "Seznam.cz, a.s.",
    ico: "27082440",
    dic: "CZ27082440",
    address: "Radlická 3294/10, Smíchov, 150 00 Praha 5",
  },
  "45317054": {
    name: "ŠKODA AUTO a.s.",
    ico: "45317054",
    dic: "CZ45317054",
    address: "tř. Václava Klementa 869, Mladá Boleslav II, 293 01 Mladá Boleslav",
  },
  "26168685": {
    name: "Prague City Tourism a.s.",
    ico: "26168685",
    dic: "CZ26168685",
    address: "Arbesovo náměstí 70/4, Smíchov, 150 00 Praha 5",
  },
  "00006947": {
    name: "Česká národní banka",
    ico: "00006947",
    dic: null,
    address: "Na příkopě 864/28, Nové Město, 110 00 Praha 1",
  },
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api/workplaces", workplacesRouter);
  app.use("/api/shifts", shiftsRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/invoices", invoicesRouter);
  app.use("/api/documents", documentsRouter);
  app.use("/api/workers", workersRouter);
  app.use("/api/exchange-requests", exchangeRequestsRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/stats", statsRouter);

  app.get("/api/user", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { password, ...safeUser } = user;
    return res.json(safeUser);
  });

  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      let users;
      if (req.user?.role === "admin") {
        users = await storage.getAllUsers();
      } else if (req.user?.role === "company") {
        users = (await storage.getAllUsers()).filter(
          (user) => user.parentCompanyId === req.user!.id || user.id === req.user!.id,
        );
      } else {
        const self = await storage.getUser(req.user!.id);
        users = self ? [self] : [];
      }

      const safeUsers = users.map(({ password, ...rest }) => rest);
      return res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/ares", requireAuth, handleAresLookup);
  app.get("/api/ares/company", requireAuth, handleAresLookup);

  app.post("/api/reset-password", async (req, res) => {
    const { email } = req.body ?? {};
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    passwordResetTokens.set(email.toLowerCase(), {
      email: user.email,
      code,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    // In production we would send an email. For now we just acknowledge.
    return res.json({ success: true });
  });

  app.post("/api/reset-password/confirm", async (req, res) => {
    const { email, code, newPassword } = req.body ?? {};
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "Email, code, and new password are required" });
    }

    const entry = passwordResetTokens.get(email.toLowerCase());
    if (!entry || entry.code !== code || entry.expiresAt < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { hashPassword } = await import("../auth");
    await storage.updateUser(user.id, { password: await hashPassword(newPassword) });
    passwordResetTokens.delete(email.toLowerCase());

    return res.json({ success: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function handleAresLookup(req: Request, res: Response) {
  const ico = typeof req.query.ico === "string" ? req.query.ico : undefined;
  if (!ico || !/^\d{8}$/.test(ico)) {
    return res.status(400).json({ error: "IČO musí obsahovat přesně 8 číslic." });
  }

  try {
    const response = await fetch(
      `https://wwwinfo.mfcr.cz/cgi-bin/ares/darv_bas.cgi?ico=${encodeURIComponent(ico)}`,
    );

    if (!response.ok) {
      throw new Error(`ARES responded with status ${response.status}`);
    }

    const xml = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const data = parser.parse(xml);
    const record = data?.Ares_odpovedi?.Odpoved?.Zaznam;

    if (!record) {
      return res.status(404).json({ error: "Firma s tímto IČO nebyla nalezena." });
    }

    const company = {
      name: record.Obchodni_firma ?? "",
      ico: record.ICO ?? ico,
      dic: record.DIC ?? null,
      address: buildAddress(record.Identifikace?.Adresa_ARES),
    };

    return res.json(company);
  } catch (error) {
    console.warn("ARES lookup failed, falling back to demo data:", error);
    const demo = DEMO_COMPANIES[ico];
    if (demo) {
      return res.json(demo);
    }

    return res.status(502).json({ error: "Nelze kontaktovat ARES API. Zadejte údaje ručně." });
  }
}

function buildAddress(addressNode: any): string {
  if (!addressNode) {
    return "";
  }

  const parts: string[] = [];
  if (addressNode.Nazev_ulice) {
    parts.push(addressNode.Nazev_ulice);
  }
  if (addressNode.Cislo_domovni) {
    parts.push(addressNode.Cislo_domovni);
  }
  if (addressNode.Cislo_orientacni) {
    parts.push(`/${addressNode.Cislo_orientacni}`);
  }
  if (addressNode.Nazev_obce) {
    parts.push(addressNode.Nazev_obce);
  }
  if (addressNode.PSC) {
    parts.push(addressNode.PSC);
  }

  return parts.filter(Boolean).join(" ");
}
