import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as LocalStrategy } from "passport-local";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { verifyPassword, hashPassword, validatePasswordStrength } from "./auth-utils";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.use('local', new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return done(null, false, { message: 'Email ou senha incorretos' });
        }
        if (!user.passwordHash) {
          return done(null, false, { message: 'Este usuário deve fazer login com Replit' });
        }
        if (!user.isActive) {
          return done(null, false, { message: 'Conta desativada. Entre em contato com o administrador.' });
        }
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          return done(null, false, { message: 'Email ou senha incorretos' });
        }
        return done(null, {
          id: user.id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          mustChangePassword: user.mustChangePassword,
          authProvider: 'local',
        });
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: any, cb) => cb(null, user));
  passport.deserializeUser((user: any, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: 'Erro interno do servidor' });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Credenciais inválidas' });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Erro ao criar sessão' });
        }
        return res.json({
          id: user.id,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/change-password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Não autenticado' });
    }
    const user = req.user as any;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'Nova senha é obrigatória' });
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    try {
      const dbUser = await storage.getUser(user.id);
      if (!dbUser) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      if (dbUser.mustChangePassword) {
      } else {
        if (!currentPassword) {
          return res.status(400).json({ message: 'Senha atual é obrigatória' });
        }
        if (!dbUser.passwordHash) {
          return res.status(400).json({ message: 'Este usuário não tem senha definida' });
        }
        const isValid = await verifyPassword(currentPassword, dbUser.passwordHash);
        if (!isValid) {
          return res.status(400).json({ message: 'Senha atual incorreta' });
        }
      }

      const newPasswordHash = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, newPasswordHash, false);

      user.mustChangePassword = false;

      return res.json({ message: 'Senha alterada com sucesso' });
    } catch (error) {
      console.error('Error changing password:', error);
      return res.status(500).json({ message: 'Erro ao alterar senha' });
    }
  });

  app.get("/api/logout", (req, res) => {
    const user = req.user as any;
    
    if (user?.authProvider === 'local' || !user?.claims) {
      req.logout(() => {
        res.redirect('/');
      });
    } else {
      req.logout(() => {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (user.authProvider === 'local') {
    const dbUser = await storage.getUser(user.id);
    if (!dbUser) {
      return res.status(401).json({ message: "User not found" });
    }
    if (!dbUser.isActive) {
      return res.status(403).json({ message: "Conta desativada. Entre em contato com o administrador." });
    }
    user.role = dbUser.role;
    user.isActive = dbUser.isActive;
    user.mustChangePassword = dbUser.mustChangePassword;
    return next();
  }

  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    const dbUser = await storage.getUser(user.claims.sub);
    if (!dbUser) {
      return res.status(401).json({ message: "User not found" });
    }
    if (!dbUser.isActive) {
      return res.status(403).json({ message: "Conta desativada. Entre em contato com o administrador." });
    }
    user.role = dbUser.role;
    user.isActive = dbUser.isActive;
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    
    const dbUser = await storage.getUser(user.claims.sub);
    if (!dbUser) {
      return res.status(401).json({ message: "User not found" });
    }
    if (!dbUser.isActive) {
      return res.status(403).json({ message: "Conta desativada. Entre em contato com o administrador." });
    }
    user.role = dbUser.role;
    user.isActive = dbUser.isActive;
    
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
