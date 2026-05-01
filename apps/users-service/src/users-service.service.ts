import { Injectable } from '@nestjs/common';

interface User {
  id: string;
  name: string;
  email: string;
}

@Injectable()
export class UsersServiceService {
  private users: User[] = [
    { id: '1', name: 'Alice', email: 'alice@example.com' },
    { id: '2', name: 'Bob', email: 'bob@example.com' },
  ];

  getUsers(): User[] {
    return this.users;
  }

  getUser(id: string): User | null {
    return this.users.find(u => u.id === id) || null;
  }

  createUser(data: Omit<User, 'id'>): User {
    const newUser: User = {
      id: String(this.users.length + 1),
      ...data,
    };
    this.users.push(newUser);
    return newUser;
  }
}
