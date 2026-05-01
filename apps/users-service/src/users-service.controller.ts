import { Controller } from '@nestjs/common';
import { MessagePattern, Ctx, RmqContext } from '@nestjs/microservices';
import { UsersServiceService } from './users-service.service';
import { USERS_PATTERNS } from '@app/shared';

@Controller()
export class UsersServiceController {
  constructor(
    private readonly usersService: UsersServiceService,
  ) {}

  @MessagePattern(USERS_PATTERNS.GET_USERS)
  getUsers(@Ctx() ctx: RmqContext) {
    const channel = ctx.getChannelRef();
    const originalMsg = ctx.getMessage();
    channel.ack(originalMsg);
    return this.usersService.getUsers();
  }

  @MessagePattern(USERS_PATTERNS.GET_USER)
  getUser(data: any, @Ctx() ctx: RmqContext) {
    const channel = ctx.getChannelRef();
    const originalMsg = ctx.getMessage();
    channel.ack(originalMsg);
    return this.usersService.getUser(data.id);
  }

  @MessagePattern(USERS_PATTERNS.CREATE_USER)
  createUser(data: any, @Ctx() ctx: RmqContext) {
    const channel = ctx.getChannelRef();
    const originalMsg = ctx.getMessage();
    channel.ack(originalMsg);
    return this.usersService.createUser(data);
  }
}
