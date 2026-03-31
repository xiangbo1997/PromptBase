import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AssistantActionChatDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;

  @IsString()
  @MaxLength(8000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  pathname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  locale?: string;
}
