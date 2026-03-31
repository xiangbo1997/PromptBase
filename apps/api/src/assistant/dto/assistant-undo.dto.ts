import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AssistantUndoDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;
}
