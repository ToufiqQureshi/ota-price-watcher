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

  // Hotelier submits their own GoMMT username/password here. We hold it only
  // long enough to drive the login; it is stored encrypted at rest.
  @Post()
  create(@Body() dto: CreateSessionDto) {
    return this.sessionService.create(dto.hotelName, dto.gommtUsername, dto.gommtPassword);
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
