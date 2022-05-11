import { User, Session, SessionIndex } from '../models';
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
  StartSessionRequest,
  StartSessionResponse,
  EndSessionRequest,
  EndSessionResponse,
  SessionResponse,
  QuerySessionsRequest,
  QuerySessionsResponse,
  ExportDatabaseRequest,
  ExportDatabaseResponse,
} from './types';
import { DataSource } from 'typeorm';
import { SqljsDriver } from 'typeorm/driver/sqljs/SqljsDriver';

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

  async getUsers(request: Omit<GetUsersRequest, 'type'>): Promise<GetUsersResponse> {
    const repo = this.dataSource.getRepository(User);
    const users = await repo.find();
    return {
      code: ServerResponseCode.Ok,
      users,
    };
  }

  async startSession(request: Omit<StartSessionRequest, 'type'>): Promise<StartSessionResponse> {
    const repo = this.dataSource.getRepository(Session);
    let parentSessionId: string | undefined = request.parentSessionId;
    if (request.parentSessionId) {
      const parent = await repo.findOne({ where: { id: request.parentSessionId } });
      if (parent === null) {
        console.error(`Parent session ${request.parentSessionId} does not exist.`)
        parentSessionId = undefined;
      }
    }
    const session = repo.create({
      ...request.session,
      transitionType: request.transitionType,
      parentSessionId
    });
    await repo.save(session);
    return { code: ServerResponseCode.Ok };
  }

  async endSession(request: Omit<EndSessionRequest, 'type'>): Promise<EndSessionResponse> {
    const repo = this.dataSource.getRepository(Session);
    const session = await repo.findOne({ where: { id: request.session.id } });
    if (session === null) {
      throw new Error(`Session ${request.session.id} does not exist.`);
    }
    await repo.update(session.id, {
      url: request.session.url,
      rawUrl: request.session.rawUrl,
      title: request.session.title,
      endedAt: request.session.endedAt,
    });
    return { code: ServerResponseCode.Ok };
  }

  async querySessions(request: Omit<QuerySessionsRequest, 'type'>): Promise<QuerySessionsResponse> {
    const repo = this.dataSource.getRepository(SessionIndex);
    let builder = await repo
      .createQueryBuilder('s')
      .loadRelationCountAndMap(
        's.childCount',
        's.childSessions',
        'children'
      )
      .orderBy('s.startedAt', 'DESC');

    if (request.query) {
      builder = builder.where('session_index MATCH :query', { query: request.query });
    }

    const totalCount = await builder.getCount();

    if (request.skip) {
      builder = builder.offset(request.skip);
    }
    if (request.limit) {
      builder = builder.limit(request.limit);
    }

    // Typescript won't let us case to SessionResponse[] because of the extra col.
    const results = (await builder.getMany()).map((session) => {
      return {
        ...session,
        startedAt: session.startedAt.toString(),
        endedAt: session.endedAt?.toString(),
      };
    }) as any[];

    return {
      code: ServerResponseCode.Ok,
      totalCount,
      results,
    };
  }

  async exportDatabase(request: Omit<ExportDatabaseRequest, 'type'>): Promise<ExportDatabaseResponse> {
    const driver = this.dataSource.driver as SqljsDriver;
    const database = new Blob([driver.export()]);
    const databaseUrl = URL.createObjectURL(database);
    return {
      code: ServerResponseCode.Ok,
      databaseUrl,
    };
  }

}
