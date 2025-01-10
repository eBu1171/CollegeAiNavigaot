import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { schools, userSchools, chanceMe, messages, type User, users } from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { generateCollegeResponse, analyzeAdmissionChances } from "./utils/perplexity";
import { quests, achievements, userQuests, userAchievements } from "@db/schema";

export function registerRoutes(app: Express): Server {
  // User-School relationship routes
  app.post("/api/user-schools", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { schoolId, status } = req.body;

      // Check if user already has this school
      const [existingUserSchool] = await db
        .select()
        .from(userSchools)
        .where(
          and(
            eq(userSchools.userId, (req.user as User).id),
            eq(userSchools.schoolId, schoolId)
          )
        )
        .limit(1);

      if (existingUserSchool) {
        return res.status(400).json({ error: "School already added to your list" });
      }

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
      console.error('Add school error:', error);
      res.status(500).json({ error: "Failed to add school" });
    }
  });

  // Chat routes
  app.get("/api/chat/:schoolId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const schoolId = parseInt(req.params.schoolId);
      if (isNaN(schoolId)) {
        return res.status(400).send("Invalid school ID");
      }

      console.log("Fetching messages for school:", schoolId); // Debug log

      // First verify if the school exists
      const [school] = await db
        .select()
        .from(schools)
        .where(eq(schools.id, schoolId))
        .limit(1);

      if (!school) {
        return res.status(404).send("School not found");
      }

      // Then check if user has access to this school
      const [userSchool] = await db
        .select()
        .from(userSchools)
        .where(
          and(
            eq(userSchools.schoolId, schoolId),
            eq(userSchools.userId, (req.user as User).id)
          )
        )
        .limit(1);

      if (!userSchool) {
        return res.status(403).send("You need to add this school to your list first");
      }

      const chatMessages = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.schoolId, schoolId),
            eq(messages.userId, (req.user as User).id)
          )
        )
        .orderBy(desc(messages.createdAt));

      res.json(chatMessages);
    } catch (error) {
      console.error('Chat fetch error:', error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat/:schoolId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const schoolId = parseInt(req.params.schoolId);
      if (isNaN(schoolId)) {
        return res.status(400).send("Invalid school ID");
      }

      const { content } = req.body;
      if (!content || typeof content !== 'string') {
        return res.status(400).send("Message content is required");
      }

      console.log("Sending message for school:", schoolId); // Debug log

      // First verify if the school exists
      const [school] = await db
        .select()
        .from(schools)
        .where(eq(schools.id, schoolId))
        .limit(1);

      if (!school) {
        return res.status(404).send("School not found");
      }

      // Then check if user has access to this school
      const [userSchool] = await db
        .select()
        .from(userSchools)
        .where(
          and(
            eq(userSchools.schoolId, schoolId),
            eq(userSchools.userId, (req.user as User).id)
          )
        )
        .limit(1);

      if (!userSchool) {
        return res.status(403).send("You need to add this school to your list first");
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
      const aiResponse = await generateCollegeResponse(
        school.name,
        content
      );

      // Insert AI response
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
      console.error('Chat message error:', error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

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
      const { location, major, satScore, gpa } = req.body;

      if (!location) {
        return res.status(400).json({ error: "Location is required" });
      }

      // Get all schools from the database
      const allSchools = await db
        .select()
        .from(schools);

      // Calculate match scores based on provided criteria
      const recommendations = allSchools.map(school => {
        let matchScore = 0;
        let totalFactors = 1; // Start with 1 for location which is required

        // Location matching (case insensitive)
        if (school.location.toLowerCase().includes(location.toLowerCase())) {
          matchScore += 1;
        }

        // SAT score matching (if provided)
        if (satScore && school.averageSAT) {
          totalFactors++;
          const satDiff = Math.abs(parseInt(satScore) - school.averageSAT);
          if (satDiff <= 50) matchScore += 1;
          else if (satDiff <= 100) matchScore += 0.8;
          else if (satDiff <= 200) matchScore += 0.6;
          else if (satDiff <= 300) matchScore += 0.4;
          else matchScore += 0.2;
        }

        // GPA matching (if provided)
        if (gpa && school.averageGPA) {
          totalFactors++;
          const gpaDiff = Math.abs(parseFloat(gpa) - school.averageGPA);
          if (gpaDiff <= 0.2) matchScore += 1;
          else if (gpaDiff <= 0.4) matchScore += 0.8;
          else if (gpaDiff <= 0.6) matchScore += 0.6;
          else if (gpaDiff <= 0.8) matchScore += 0.4;
          else matchScore += 0.2;
        }

        // Calculate final match score as a percentage
        const finalMatchScore = matchScore / totalFactors;

        return {
          id: school.id,
          name: school.name,
          location: school.location,
          description: school.description,
          acceptanceRate: school.acceptanceRate,
          match: finalMatchScore,
        };
      });

      // Sort by match score and return top matches
      const sortedRecommendations = recommendations
        .sort((a, b) => b.match - a.match)
        .filter(school => school.match > 0); // Only return schools with some match

      res.json(sortedRecommendations);
    } catch (error) {
      console.error('School search error:', error);
      res.status(500).json({ error: "Failed to search schools" });
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
        .select({
          id: userSchools.id,
          userId: userSchools.userId,
          schoolId: userSchools.schoolId,
          status: userSchools.status,
          notes: userSchools.notes,
          createdAt: userSchools.createdAt,
          schoolName: schools.name,
          location: schools.location,
          acceptanceRate: schools.acceptanceRate,
          chanceMe: chanceMe.aiAnalysis,
        })
        .from(userSchools)
        .leftJoin(schools, eq(userSchools.schoolId, schools.id))
        .leftJoin(chanceMe, eq(userSchools.schoolId, chanceMe.schoolId))
        .where(eq(userSchools.userId, (req.user as User).id));

      const stats = {
        totalSchools: userSchoolsData.length,
        completedApplications: userSchoolsData.filter(s => s.status === "completed").length,
        averageProgress: userSchoolsData.length > 0
          ? Math.round(userSchoolsData.reduce((acc, curr) => acc + (curr.status === "completed" ? 100 : 50), 0) / userSchoolsData.length)
          : 0,
        schools: userSchoolsData.map(school => ({
          id: school.id,
          name: school.schoolName,
          location: school.location,
          status: school.status,
          acceptanceRate: school.acceptanceRate,
          deadline: new Date(Date.now() + 7776000000).toISOString(), // 90 days from now as example
          progress: school.status === "completed" ? 100 : 50,
          admissionTitle: school.chanceMe
            ? school.chanceMe.toLowerCase().includes('exceptional') || school.chanceMe.toLowerCase().includes('excellent')
              ? 'Competitive Applicant'
              : school.chanceMe.toLowerCase().includes('strong') || school.chanceMe.toLowerCase().includes('good')
                ? 'Average Applicant'
                : 'Below Average Applicant'
            : undefined
        }))
      };

      res.json(stats);
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ error: "Failed to fetch user statistics" });
    }
  });

  // Learning Path routes
  app.get("/api/learning-path/progress", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const [user] = await db
        .select({
          totalPoints: users.totalPoints,
          level: users.level,
        })
        .from(users)
        .where(eq(users.id, (req.user as User).id))
        .limit(1);

      const [questStats] = await db
        .select({
          completed: sql<number>`count(*)::int`,
        })
        .from(userQuests)
        .where(
          and(
            eq(userQuests.userId, (req.user as User).id),
            eq(userQuests.status, "completed")
          )
        );

      const [achievementStats] = await db
        .select({
          unlocked: sql<number>`count(*)::int`,
        })
        .from(userAchievements)
        .where(eq(userAchievements.userId, (req.user as User).id));

      // Calculate next level requirements
      const pointsPerLevel = 1000;
      const currentLevelPoints = (user.level - 1) * pointsPerLevel;
      const nextLevelPoints = user.level * pointsPerLevel;
      const pointsToNextLevel = nextLevelPoints - user.totalPoints;
      const progress = ((user.totalPoints - currentLevelPoints) / pointsPerLevel) * 100;

      res.json({
        totalPoints: user.totalPoints,
        level: user.level,
        questsCompleted: questStats.completed,
        achievementsUnlocked: achievementStats.unlocked,
        nextLevel: {
          pointsNeeded: pointsToNextLevel,
          progress,
        },
      });
    } catch (error) {
      console.error("Progress fetch error:", error);
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  app.get("/api/learning-path/quests", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const userQuestsData = await db
        .select({
          quest: quests,
          userQuest: userQuests,
        })
        .from(quests)
        .leftJoin(
          userQuests,
          and(
            eq(userQuests.questId, quests.id),
            eq(userQuests.userId, (req.user as User).id)
          )
        );

      const formattedQuests = userQuestsData.map(({ quest, userQuest }) => ({
        id: quest.id,
        title: quest.title,
        description: quest.description,
        type: quest.type,
        points: quest.points,
        status: userQuest?.status || "not_started",
        progress: userQuest?.progress || null,
      }));

      res.json(formattedQuests);
    } catch (error) {
      console.error("Quests fetch error:", error);
      res.status(500).json({ error: "Failed to fetch quests" });
    }
  });

  app.get("/api/learning-path/achievements", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const userAchievementsData = await db
        .select({
          achievement: achievements,
          userAchievement: userAchievements,
        })
        .from(achievements)
        .leftJoin(
          userAchievements,
          and(
            eq(userAchievements.achievementId, achievements.id),
            eq(userAchievements.userId, (req.user as User).id)
          )
        );

      const formattedAchievements = userAchievementsData.map(
        ({ achievement, userAchievement }) => ({
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          type: achievement.type,
          icon: achievement.icon,
          points: achievement.points,
          unlocked: !!userAchievement,
          unlockedAt: userAchievement?.unlockedAt?.toISOString(),
        })
      );

      res.json(formattedAchievements);
    } catch (error) {
      console.error("Achievements fetch error:", error);
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}