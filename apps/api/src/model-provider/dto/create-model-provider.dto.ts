import { ArrayUnique, IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { MODEL_PROVIDER_PROTOCOLS, type ModelProviderProtocol } from '@promptbase/shared';

export class CreateModelProviderDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsIn(MODEL_PROVIDER_PROTOCOLS)
  provider!: ModelProviderProtocol;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  baseUrl?: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  models!: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
