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
  @MinLength(8, { message: '密码至少 8 位' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).*$/, {
    message: '密码需同时包含大小写字母、数字和特殊符号',
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
