import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  hotelName: string;

  @IsString()
  @IsNotEmpty()
  gommtUsername: string;

  @IsString()
  @IsNotEmpty()
  gommtPassword: string;
}
