import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// GroupMe specific types (not stored in DB for Phase 1)
export type GroupMeGroup = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  creator_user_id: string;
  created_at: string;
  updated_at: string;
  members: GroupMeMember[];
  messages: {
    count: number;
    last_message_id: string;
    last_message_created_at: string;
    preview: {
      nickname: string;
      text: string;
      image_url?: string;
    };
  };
};

export type GroupMeMember = {
  user_id: string;
  nickname: string;
  muted: boolean;
  image_url: string;
  id: string;
};

export type GroupMeMessage = {
  id: string;
  source_guid: string;
  created_at: string;
  user_id: string;
  group_id: string;
  name: string;
  avatar_url: string;
  text: string;
  system: boolean;
  favorited_by: string[];
  attachments: GroupMeAttachment[];
};

export type GroupMeAttachment = {
  type: string;
  url?: string;
  preview_url?: string;
  name?: string;
};

export type GroupMeUser = {
  id: string;
  phone_number: string;
  email: string;
  name: string;
  image_url: string;
  created_at: string;
  updated_at: string;
};

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
