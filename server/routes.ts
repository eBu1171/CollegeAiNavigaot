import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { schools, userSchools, chanceMe, messages, type User } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateCollegeResponse, analyzeAdmissionChances } from "./utils/perplexity";

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

  // Chat routes
  app.get("/api/chat/:schoolId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const schoolId = parseInt(req.params.schoolId);
      const chatMessages = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.schoolId, schoolId),
            eq(messages.userId, (req.user as User).id)
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(50);

      res.json(chatMessages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat/:schoolId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const schoolId = parseInt(req.params.schoolId);
      const { content } = req.body;

      // Get school information
      const [school] = await db
        .select()
        .from(schools)
        .where(eq(schools.id, schoolId))
        .limit(1);

      if (!school) {
        return res.status(404).json({ error: "School not found" });
      }

      // Insert user message
      const [userMessage] = await db
        .insert(messages)
        .values({
          userId: (req.user as User).id,
          schoolId,
          content,
          isAI: false,
        })
        .returning();

      // Generate AI response using Perplexity
      const aiResponse = await generateCollegeResponse(school.name, content);

      const [aiMessage] = await db
        .insert(messages)
        .values({
          userId: (req.user as User).id,
          schoolId,
          content: aiResponse,
          isAI: true,
        })
        .returning();

      res.json([userMessage, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.post("/api/schools/search", async (req, res) => {
    try {
      const { location, major, satScore, gpa } = req.body;

      // Get all schools from the database
      const allSchools = await db.select().from(schools);

      // Calculate match scores based on provided criteria
      const recommendations = allSchools.map(school => {
        let matchScore = 0;

        // Location matching
        if (school.location.toLowerCase().includes(location.toLowerCase())) {
          matchScore += 0.3;
        }

        // SAT score matching (if provided)
        if (satScore && school.averageSAT) {
          const satDiff = Math.abs(parseInt(satScore) - school.averageSAT);
          if (satDiff <= 100) matchScore += 0.3;
          else if (satDiff <= 200) matchScore += 0.2;
          else if (satDiff <= 300) matchScore += 0.1;
        }

        // GPA matching (if provided)
        if (gpa && school.averageGPA) {
          const gpaDiff = Math.abs(parseFloat(gpa) - school.averageGPA);
          if (gpaDiff <= 0.3) matchScore += 0.4;
          else if (gpaDiff <= 0.6) matchScore += 0.3;
          else if (gpaDiff <= 1.0) matchScore += 0.2;
        }

        return {
          id: school.id,
          name: school.name,
          location: school.location,
          description: school.description,
          acceptanceRate: school.acceptanceRate,
          match: matchScore,
        };
      });

      // Sort by match score and return top matches
      const sortedRecommendations = recommendations
        .sort((a, b) => b.match - a.match)
        .slice(0, 10);

      res.json(sortedRecommendations);
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
          userId: (req.user as User).id,
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

      // Get school information
      const [school] = await db
        .select()
        .from(schools)
        .where(eq(schools.id, schoolId))
        .limit(1);

      if (!school) {
        return res.status(404).json({ error: "School not found" });
      }

      // Generate AI analysis using Perplexity
      const aiAnalysis = await analyzeAdmissionChances(
        school.name,
        {
          gpa: parseFloat(gpa),
          sat: sat ? parseInt(sat) : undefined,
          act: act ? parseInt(act) : undefined,
          extracurriculars,
          essays,
        }
      );

      const [entry] = await db
        .insert(chanceMe)
        .values({
          userId: (req.user as User).id,
          schoolId,
          gpa: parseInt(gpa),
          sat: sat ? parseInt(sat) : null,
          act: act ? parseInt(act) : null,
          extracurriculars,
          essays,
          aiAnalysis,
        })
        .returning();

      res.json({ ...entry, aiAnalysis });
    } catch (error) {
      console.error('ChanceMe error:', error);
      res.status(500).json({ error: "Failed to process ChanceMe request" });
    }
  });

  // User statistics route for dashboard
  app.get("/api/user/stats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const userSchoolsData = await db
        .select()
        .from(userSchools)
        .where(eq(userSchools.userId, (req.user as User).id));

      const stats = {
        totalSchools: userSchoolsData.length,
        completedApplications: userSchoolsData.filter(s => s.status === "completed").length,
        averageProgress: userSchoolsData.length > 0
          ? Math.round(userSchoolsData.reduce((acc, curr) => acc + (curr.status === "completed" ? 100 : 50), 0) / userSchoolsData.length)
          : 0
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}