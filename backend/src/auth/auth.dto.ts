import { IsEmail, IsOptional, IsString, MinLength, MaxLength, Matches } from 'class-validator';

const USERNAME_MESSAGE = '用户名 3-20 位，仅允许字母、数字、下划线、连字符';

export class RegisterDto {
  @IsString()
  @MinLength(3, { message: USERNAME_MESSAGE })
  @MaxLength(20, { message: USERNAME_MESSAGE })
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: USERNAME_MESSAGE })
  username: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).*$/, {
    message: '密码至少 6 位，且需同时包含字母和数字',
  })
  password: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class LoginDto {
  @IsString()
  @MinLength(1, { message: '请输入用户名' })
  username: string;

  @IsString()
  password: string;
}

export class RefreshDto {
  @IsString()
  refreshToken: string;
}
