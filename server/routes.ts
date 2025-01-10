import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { schools, userSchools, chanceMe } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // School routes
  app.get("/api/schools", async (req, res) => {
    try {
      const allSchools = await db.select().from(schools);
      res.json(allSchools);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch schools" });
    }
  });

  app.post("/api/schools/search", async (req, res) => {
    try {
      // Mock AI API integration for school recommendations
      const recommendations = [
        { id: 1, name: "Example University", match: 0.95 },
        { id: 2, name: "Sample College", match: 0.85 },
      ];
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });

  // User-School relationship routes
  app.post("/api/user-schools", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { schoolId, status } = req.body;
      const [userSchool] = await db
        .insert(userSchools)
        .values({
          userId: req.user!.id,
          schoolId,
          status,
        })
        .returning();
      res.json(userSchool);
    } catch (error) {
      res.status(500).json({ error: "Failed to add school" });
    }
  });

  // ChanceMe routes
  app.post("/api/chance-me", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { schoolId, gpa, sat, act, extracurriculars, essays } = req.body;

      // Mock AI analysis
      const aiAnalysis = "Based on your profile, you have a strong chance of admission...";

      const [entry] = await db
        .insert(chanceMe)
        .values({
          userId: req.user!.id,
          schoolId,
          gpa,
          sat,
          act,
          extracurriculars,
          essays,
          aiAnalysis,
        })
        .returning();

      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to process ChanceMe request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}