
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

  

  return server;
}
