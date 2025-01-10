import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { schools, userSchools, chanceMe, messages, type User } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

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

      // Generate AI response (simple response for now)
      const aiResponses = [
        "That's a great question about our university!",
        "I can help you understand more about our programs.",
        "Let me provide you with more information about that.",
        "That's an interesting point you raise about our campus.",
        "I'd be happy to explain more about our admissions process.",
      ];

      const aiResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];

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

      // Calculate admission chances based on provided data
      let aiAnalysis = "Based on your profile:\n\n";

      // GPA Analysis
      if (gpa >= 3.8) {
        aiAnalysis += "- Your GPA is excellent and well above average\n";
      } else if (gpa >= 3.5) {
        aiAnalysis += "- Your GPA is strong and competitive\n";
      } else {
        aiAnalysis += "- Consider explaining any circumstances affecting your GPA in your essays\n";
      }

      // Test Scores Analysis
      if (sat) {
        if (parseInt(sat) >= 1500) {
          aiAnalysis += "- Your SAT score is exceptional\n";
        } else if (parseInt(sat) >= 1400) {
          aiAnalysis += "- Your SAT score is competitive\n";
        }
      }

      if (act) {
        if (parseInt(act) >= 33) {
          aiAnalysis += "- Your ACT score is exceptional\n";
        } else if (parseInt(act) >= 30) {
          aiAnalysis += "- Your ACT score is competitive\n";
        }
      }

      // Extracurricular Analysis
      const ecKeywords = ['leadership', 'volunteer', 'research', 'internship', 'award'];
      let ecScore = 0;
      ecKeywords.forEach(keyword => {
        if (extracurriculars.toLowerCase().includes(keyword)) ecScore++;
      });

      if (ecScore >= 3) {
        aiAnalysis += "- Your extracurricular activities show strong leadership and initiative\n";
      } else {
        aiAnalysis += "- Consider highlighting specific achievements in your activities\n";
      }

      // Essays Analysis
      const essayKeywords = ['passion', 'growth', 'challenge', 'overcome', 'learn'];
      let essayScore = 0;
      essayKeywords.forEach(keyword => {
        if (essays.toLowerCase().includes(keyword)) essayScore++;
      });

      if (essayScore >= 3) {
        aiAnalysis += "- Your essays effectively communicate personal growth and experiences\n";
      } else {
        aiAnalysis += "- Consider incorporating more personal reflection in your essays\n";
      }

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

      res.json(entry);
    } catch (error) {
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