
import express from "express";
import http from "http";
import { db } from "@db";
import { schools, users, userSchools, messages, chanceMe } from "@db/schema";
import { eq } from "drizzle-orm";
import type { User } from "./utils/types";

export function registerRoutes(app: express.Application) {
  const server = http.createServer(app);

  app.get("/api/schools", async (req, res) => {
    try {
      const userSchoolsData = await db
        .select()
        .from(userSchools)
        .leftJoin(schools, eq(userSchools.schoolId, schools.id))
        .leftJoin(chanceMe, eq(userSchools.schoolId, chanceMe.schoolId))
        .where(eq(userSchools.userId, (req.user as User).id));

      const stats = {
        total: userSchoolsData?.length || 0,
        interested: userSchoolsData?.filter(s => s.userSchools.status === 'interested').length || 0,
        applied: userSchoolsData?.filter(s => s.userSchools.status === 'applied').length || 0,
        accepted: userSchoolsData?.filter(s => s.userSchools.status === 'accepted').length || 0,
        rejected: userSchoolsData?.filter(s => s.userSchools.status === 'rejected').length || 0
      };

      res.json({ schools: userSchoolsData || [], stats });
    } catch (error) {
      console.error("Error fetching schools:", error);
      res.status(500).json({ message: "Error fetching schools" });
    }
  });

  app.get("/api/chat/:schoolId", async (req, res) => {
    try {
      const schoolId = parseInt(req.params.schoolId);
      
      if (isNaN(schoolId)) {
        return res.status(400).json({ message: "Invalid school ID" });
      }

      const [school] = await db
        .select()
        .from(schools)
        .where(eq(schools.id, schoolId))
        .limit(1);

      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      const messageHistory = await db
        .select()
        .from(messages)
        .where(eq(messages.schoolId, schoolId))
        .orderBy(messages.createdAt);

      res.json(messageHistory);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Error fetching messages" });
    }
  });

  app.post("/api/chat/:schoolId", async (req, res) => {
    try {
      const schoolId = parseInt(req.params.schoolId);
      const { content } = req.body;

      if (isNaN(schoolId)) {
        return res.status(400).json({ message: "Invalid school ID" });
      }

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Message content is required" });
      }

      const [school] = await db
        .select()
        .from(schools)
        .where(eq(schools.id, schoolId))
        .limit(1);

      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      const [newMessage] = await db
        .insert(messages)
        .values({
          content,
          schoolId,
          userId: (req.user as User).id,
          role: 'user'
        })
        .returning();

      console.log("Message saved successfully:", newMessage);
      res.json([newMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Error sending message" });
    }
  });

  return server;
}
