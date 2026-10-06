import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { TEST_BANK_IDS, type AuthUser, type TestBankId } from '@kia-group/shared';
import { AdminAccess } from '@kia-group/platform';
import { CurrentUser } from '@kia-group/platform';
import { Roles } from '@kia-group/platform';
import { AdminAccessGuard } from '@kia-group/platform';
import { JwtAuthGuard } from '@kia-group/platform';
import { RolesGuard } from '@kia-group/platform';
import { TestBanksService } from './test-banks.service';

@Controller('admin/tests')
@UseGuards(JwtAuthGuard, RolesGuard, AdminAccessGuard)
@Roles('ADMIN')
export class AdminTestBanksController {
  constructor(private readonly testBanks: TestBanksService) {}

  @Get()
  @AdminAccess('tests', 'view')
  list() {
    return this.testBanks.listMeta();
  }

  @Get(':id')
  @AdminAccess('tests', 'view')
  getOne(@Param('id') id: string) {
    this.assertId(id);
    return this.testBanks.getBank(id as TestBankId);
  }

  @Put(':id')
  @AdminAccess('tests', 'edit')
  save(
    @Param('id') id: string,
    @Body() body: { bank?: unknown },
    @CurrentUser() user: AuthUser,
  ) {
    this.assertId(id);
    return this.testBanks.saveBank(id as TestBankId, body.bank, user.id);
  }

  @Post(':id/reset')
  @AdminAccess('tests', 'manage')
  reset(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    this.assertId(id);
    return this.testBanks.resetBank(id as TestBankId, user.id);
  }

  private assertId(id: string): asserts id is TestBankId {
    if (!TEST_BANK_IDS.includes(id as TestBankId)) {
      throw new NotFoundException(`Unknown test bank: ${id}`);
    }
  }
}
