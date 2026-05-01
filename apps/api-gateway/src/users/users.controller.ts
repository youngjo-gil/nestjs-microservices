import { Controller, Get, Param, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { USERS_PATTERNS } from '@app/shared';

@Controller('users')
export class UsersController {
  constructor(
    @Inject('USERS_SERVICE')
    private usersClient: ClientProxy,
  ) {}

  @Get()
  async getUsers() {
    try {
      return await lastValueFrom(
        this.usersClient.send(USERS_PATTERNS.GET_USERS, {}).pipe(timeout(5000)),
      );
    } catch (error: any) {
      return { error: 'Failed to fetch users', message: error?.message };
    }
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    try {
      return await lastValueFrom(
        this.usersClient
          .send(USERS_PATTERNS.GET_USER, { id })
          .pipe(timeout(5000)),
      );
    } catch (error: any) {
      return { error: 'Failed to fetch user', message: error?.message };
    }
  }
}
