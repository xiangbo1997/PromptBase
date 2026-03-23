import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OrgMemberGuard } from '../org/org.guard';
import { CreateModelProviderDto } from './dto/create-model-provider.dto';
import { UpdateModelProviderDto } from './dto/update-model-provider.dto';
import { ModelProviderService } from './model-provider.service';

@Controller('orgs/:orgId/model-providers')
@UseGuards(AuthGuard, OrgMemberGuard)
export class ModelProviderController {
  constructor(private readonly modelProviderService: ModelProviderService) {}

  @Post()
  create(@Param('orgId') orgId: string, @Body() dto: CreateModelProviderDto) {
    return this.modelProviderService.create(orgId, dto);
  }

  @Get()
  findAll(@Param('orgId') orgId: string) {
    return this.modelProviderService.findAll(orgId);
  }

  @Get(':id')
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.modelProviderService.findOne(orgId, id);
  }

  @Patch(':id')
  update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: UpdateModelProviderDto) {
    return this.modelProviderService.update(orgId, id, dto);
  }

  @Delete(':id')
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.modelProviderService.remove(orgId, id);
  }
}
