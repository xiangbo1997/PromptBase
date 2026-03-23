import { PartialType } from '@nestjs/mapped-types';
import { CreateModelProviderDto } from './create-model-provider.dto';

export class UpdateModelProviderDto extends PartialType(CreateModelProviderDto) {}
