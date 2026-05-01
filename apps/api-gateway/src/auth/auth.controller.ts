import { Controller, Post, Body } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('register')
  register(@Body() body: any) {
    return { message: 'Register endpoint', data: body };
  }

  @Post('login')
  login(@Body() body: any) {
    return { message: 'Login endpoint', data: body };
  }
}
