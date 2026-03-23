import { IsObject, IsOptional, IsString, IsUUID, MinLength, ValidateIf } from 'class-validator';

export class CreateTestRunDto {
  @ValidateIf((dto: CreateTestRunDto) => !dto.content)
  @IsUUID()
  promptId!: string;

  @ValidateIf((dto: CreateTestRunDto) => !dto.content)
  @IsUUID()
  promptVersionId!: string;

  @IsUUID()
  providerId!: string;

  @IsString()
  model!: string;

  @ValidateIf((dto: CreateTestRunDto) => !dto.promptId || !dto.promptVersionId)
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
