import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";
import { USERNAME_PATTERN } from "../../users/roles";

/** Same rules as the web login form (login-schema.ts): username shape, password only has to be present. */
export class LoginDto {
  @ApiProperty({ example: "admin" })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Matches(USERNAME_PATTERN, {
    message: "username must start with a letter, be 5-20 characters long and contain only letters or numbers",
  })
  username!: string;

  @ApiProperty({ format: "password" })
  @IsString()
  @IsNotEmpty({ message: "password should not be empty" })
  @MaxLength(128)
  password!: string;
}
