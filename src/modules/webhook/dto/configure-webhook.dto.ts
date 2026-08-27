import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class ConfigureWebhookDto {
  @IsUrl({ require_tld: false })
  targetUrl: string;

  @IsString()
  @IsNotEmpty()
  secret: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
