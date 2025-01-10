import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { schools, userSchools, chanceMe, messages, type User, users } from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { generateCollegeResponse, analyzeAdmissionChances } from "./utils/perplexity";
import { quests, achievements, userQuests, userAchievements } from "@db/schema";
import { 
  applicationDeadlines,
  checklistItems,
  userChecklist,
} from "@db/schema";

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

  // Learning Path - Quest Interaction Routes
  app.post("/api/learning-path/quests/:questId/start", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const questId = parseInt(req.params.questId);
      if (isNaN(questId)) {
        return res.status(400).send("Invalid quest ID");
      }

      // Check if quest exists
      const [quest] = await db
        .select()
        .from(quests)
        .where(eq(quests.id, questId))
        .limit(1);

      if (!quest) {
        return res.status(404).send("Quest not found");
      }

      // Check if user already started this quest
      const [existingUserQuest] = await db
        .select()
        .from(userQuests)
        .where(
          and(
            eq(userQuests.userId, (req.user as User).id),
            eq(userQuests.questId, questId)
          )
        )
        .limit(1);

      if (existingUserQuest) {
        return res.status(400).send("Quest already started");
      }

      // Start the quest
      const [userQuest] = await db
        .insert(userQuests)
        .values({
          userId: (req.user as User).id,
          questId,
          status: "in_progress",
          progress: {
            "0": false,
            "1": false,
            "2": false,
          },
        })
        .returning();

      res.json(userQuest);
    } catch (error) {
      console.error("Start quest error:", error);
      res.status(500).json({ error: "Failed to start quest" });
    }
  });

  app.post("/api/learning-path/quests/:questId/tasks/:taskId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const questId = parseInt(req.params.questId);
      const taskId = req.params.taskId;

      if (isNaN(questId)) {
        return res.status(400).send("Invalid quest ID");
      }

      // Get user's quest progress
      const [userQuest] = await db
        .select()
        .from(userQuests)
        .where(
          and(
            eq(userQuests.userId, (req.user as User).id),
            eq(userQuests.questId, questId)
          )
        )
        .limit(1);

      if (!userQuest) {
        return res.status(404).send("Quest not found or not started");
      }

      // Update task completion
      const progress = userQuest.progress as Record<string, boolean>;
      progress[taskId] = true;

      // Check if all tasks are completed
      const isQuestCompleted = Object.values(progress).every(Boolean);

      // Get quest points
      const [quest] = await db
        .select()
        .from(quests)
        .where(eq(quests.id, questId))
        .limit(1);

      // Update user quest progress
      await db
        .update(userQuests)
        .set({
          progress,
          status: isQuestCompleted ? "completed" : "in_progress",
          completedAt: isQuestCompleted ? new Date() : null,
        })
        .where(eq(userQuests.id, userQuest.id));

      let response: any = { success: true };

      if (isQuestCompleted) {
        // Award points to user
        const [updatedUser] = await db
          .update(users)
          .set({
            totalPoints: sql`${users.totalPoints} + ${quest.points}`,
          })
          .where(eq(users.id, (req.user as User).id))
          .returning({
            totalPoints: users.totalPoints,
            level: users.level,
          });

        // Check for level up (1000 points per level)
        const newLevel = Math.floor(updatedUser.totalPoints / 1000) + 1;
        if (newLevel > updatedUser.level) {
          await db
            .update(users)
            .set({ level: newLevel })
            .where(eq(users.id, (req.user as User).id));

          response.levelUp = true;
          response.newLevel = newLevel;
        }

        // Check for achievements
        // For example: "Complete 5 quests" achievement
        const [completedQuestsCount] = await db
          .select({
            count: sql<number>`count(*)::int`,
          })
          .from(userQuests)
          .where(
            and(
              eq(userQuests.userId, (req.user as User).id),
              eq(userQuests.status, "completed")
            )
          );

        if (completedQuestsCount.count === 5) {
          const [achievement] = await db
            .select()
            .from(achievements)
            .where(eq(achievements.type, "quest_master"))
            .limit(1);

          if (achievement) {
            const [userAchievement] = await db
              .insert(userAchievements)
              .values({
                userId: (req.user as User).id,
                achievementId: achievement.id,
              })
              .returning();

            response.achievement = achievement;
          }
        }
      }

      res.json(response);
    } catch (error) {
      console.error("Complete task error:", error);
      res.status(500).json({ error: "Failed to complete task" });
    }
  });

  // Timeline routes
  app.get("/api/timeline/schools", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const userSchoolsData = await db
        .select({
          id: userSchools.id,
          userId: userSchools.userId,
          schoolId: userSchools.schoolId,
          name: schools.name,
          location: schools.location,
          deadlines: applicationDeadlines,
        })
        .from(userSchools)
        .leftJoin(schools, eq(userSchools.schoolId, schools.id))
        .leftJoin(applicationDeadlines, eq(schools.id, applicationDeadlines.schoolId))
        .where(eq(userSchools.userId, (req.user as User).id));

      // Transform the data to match the frontend expectations
      const transformedData = userSchoolsData.map((school) => ({
        id: school.schoolId,
        name: school.name,
        location: school.location,
        deadlines: {
          earlyAction: school.deadlines?.earlyAction instanceof Date ? school.deadlines.earlyAction.toISOString() : null,
          earlyDecision: school.deadlines?.earlyDecision instanceof Date ? school.deadlines.earlyDecision.toISOString() : null,
          regularDecision: school.deadlines?.regularDecision instanceof Date ? school.deadlines.regularDecision.toISOString() : null,
          financialAid: school.deadlines?.financialAid instanceof Date ? school.deadlines.financialAid.toISOString() : null,
          scholarship: school.deadlines?.scholarship instanceof Date ? school.deadlines.scholarship.toISOString() : null,
        },
      }));

      res.json(transformedData);
    } catch (error) {
      console.error('Timeline schools error:', error);
      res.status(500).json({ error: "Failed to fetch schools timeline" });
    }
  });

  app.get("/api/timeline/checklist/:schoolId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const schoolId = parseInt(req.params.schoolId);
      if (isNaN(schoolId)) {
        return res.status(400).send("Invalid school ID");
      }

      // Get user's checklist items for this school
      const userItems = await db
        .select({
          id: userChecklist.id,
          name: checklistItems.name,
          description: checklistItems.description,
          category: checklistItems.category,
          completed: userChecklist.completed,
          completedAt: userChecklist.completedAt,
          dueDate: userChecklist.dueDate,
        })
        .from(userChecklist)
        .leftJoin(checklistItems, eq(userChecklist.itemId, checklistItems.id))
        .where(
          and(
            eq(userChecklist.userId, (req.user as User).id),
            eq(userChecklist.schoolId, schoolId)
          )
        );

      // If no items exist for this user/school combination, create default ones
      if (!userItems.length) {
        // Get generic checklist items
        const genericItems = await db
          .select()
          .from(checklistItems)
          .where(eq(checklistItems.isGeneric, true));

        // Get school deadlines to calculate due dates
        const [schoolDeadlines] = await db
          .select()
          .from(applicationDeadlines)
          .where(eq(applicationDeadlines.schoolId, schoolId))
          .limit(1);

        if (!schoolDeadlines?.regularDecision) {
          return res.status(404).send("School deadlines not found");
        }

        // Create user checklist items
        const newItems = await Promise.all(
          genericItems.map(async (item) => {
            const dueDate = new Date(schoolDeadlines.regularDecision);
            dueDate.setDate(
              dueDate.getDate() - (item.daysBeforeDeadline || 14)
            );

            const [userItem] = await db
              .insert(userChecklist)
              .values({
                userId: (req.user as User).id,
                schoolId,
                itemId: item.id,
                dueDate: dueDate,
                completed: false,
              })
              .returning();

            return {
              id: userItem.id,
              name: item.name,
              description: item.description,
              category: item.category,
              completed: false,
              dueDate: dueDate.toISOString(),
            };
          })
        );

        return res.json(newItems);
      }

      res.json(userItems.map(item => ({
        ...item,
        dueDate: item.dueDate instanceof Date ? item.dueDate.toISOString() : item.dueDate,
        completedAt: item.completedAt instanceof Date ? item.completedAt.toISOString() : item.completedAt,
      })));
    } catch (error) {
      console.error('Checklist fetch error:', error);
      res.status(500).json({ error: "Failed to fetch checklist" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}