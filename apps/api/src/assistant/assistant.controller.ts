import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/auth.decorator';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { AuthGuard } from '../auth/auth.guard';
import { OrgMemberGuard } from '../org/org.guard';
import { AssistantActionChatDto } from './dto/assistant-action-chat.dto';
import { AssistantUndoDto } from './dto/assistant-undo.dto';
import { GuideAssistantDto } from './dto/guide-assistant.dto';
import { AssistantService } from './assistant.service';

@Controller('orgs/:orgId/assistant')
@UseGuards(AuthGuard, OrgMemberGuard)
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('guide')
  guide(
    @Param('orgId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GuideAssistantDto,
  ) {
    return this.assistantService.answer(orgId, user, dto);
  }

  @Post('actions/chat')
  chat(
    @Param('orgId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssistantActionChatDto,
  ) {
    return this.assistantService.chat(orgId, user, dto);
  }

  @Post('actions/undo')
  undo(
    @Param('orgId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssistantUndoDto,
  ) {
    return this.assistantService.undo(orgId, user, dto);
  }
}
