import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { User, type UserDocument } from "./user.schema";

/** Case-insensitive match, served by the unique username index (same collation). */
export const USERNAME_COLLATION = { locale: "en", strength: 2 } as const;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  /** `withHash` also loads `passwordHash` (hidden by default); only the login flow asks for it. */
  findByUsername(username: string, withHash = false): Promise<UserDocument | null> {
    const query = this.users.findOne({ username: username.trim() }).collation(USERNAME_COLLATION);
    return (withHash ? query.select("+passwordHash") : query).exec();
  }

  create(data: Pick<User, "username" | "passwordHash" | "fullName" | "role"> & Partial<User>): Promise<UserDocument> {
    return this.users.create(data);
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.users.findById(id).exec();
  }

  /** Stamps a successful login and, when given, replaces the stored hash (legacy or outdated cost). */
  async recordLogin(id: string, newPasswordHash?: string): Promise<void> {
    await this.users
      .updateOne({ _id: id }, { $set: { lastLoginAt: new Date(), ...(newPasswordHash && { passwordHash: newPasswordHash }) } })
      .exec();
  }

  count(): Promise<number> {
    return this.users.estimatedDocumentCount().exec();
  }
}
