import { IsNotEmpty, IsString } from 'class-validator';

export class SubmitOtpDto {
  @IsString()
  @IsNotEmpty()
  otp: string;
}
