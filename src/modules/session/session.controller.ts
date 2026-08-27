import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SubmitOtpDto } from './dto/submit-otp.dto';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  list() {
    return this.sessionService.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.sessionService.findOrThrow(id);
  }

  // For login-gated sites (e.g. "gommt") the hotelier submits their own credentials
  // here; they're held only long enough to drive the login and stored encrypted at
  // rest. Public sites (e.g. "swiftbook") only need siteConfig, no credentials.
  @Post()
  create(@Body() dto: CreateSessionDto) {
    return this.sessionService.create(dto.hotelName, dto.siteType, dto.siteConfig, dto.username, dto.password);
  }

  @Post(':id/otp')
  submitOtp(@Param('id') id: string, @Body() dto: SubmitOtpDto) {
    return this.sessionService.submitOtp(id, dto.otp);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sessionService.remove(id);
  }
}
