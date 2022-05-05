import { User } from '../models';
import {
  ServerInterface,
  ServerMessage,
  ServerResponseCode,
  ServerRequest,
  ServerResponse,
  HelloRequest,
  HelloResponse,
  QueryRequest,
  QueryResponse,
  CreateUserRequest,
  CreateUserResponse,
  GetUsersRequest,
  GetUsersResponse,
} from './types';
import { DataSource } from 'typeorm';

export class Server implements ServerInterface {

  constructor(readonly dataSource: DataSource) {}

  async getHello(request: Omit<HelloRequest, 'type'>): Promise<HelloResponse> {
    return { code: ServerResponseCode.Ok, message: 'Hello, world!' };
  }

  async runQuery(request: Omit<QueryRequest, 'type'>): Promise<QueryResponse> {
    const result = await this.dataSource.manager.query(request.query);
    return {
      code: ServerResponseCode.Ok,
      result,
    };
  }

  async createUser(request: Omit<CreateUserRequest, 'type'>): Promise<CreateUserResponse> {
    const repo = this.dataSource.getRepository(User);
    const user = repo.create({ name: request.name });
    await repo.save(user)
    return {
      code: ServerResponseCode.Ok,
      user
    };
  }

  async getUsers(request: Omit<GetUsersResponse, 'type'>): Promise<GetUsersResponse> {
    const repo = this.dataSource.getRepository(User);
    const users = await repo.find();
    return {
      code: ServerResponseCode.Ok,
      users,
    };
  }

}
