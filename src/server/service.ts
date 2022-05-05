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
} from './types';

export class Server implements ServerInterface {

  constructor(readonly db: any) {}

  async getHello(request: HelloRequest): Promise<HelloResponse> {
    return { code: ServerResponseCode.Ok, message: 'Hello, world!' };
  }

  async runQuery(request: QueryRequest): Promise<QueryResponse> {
    const results = this.db.exec(request.query);
    if (results.length < 1) {
      return {
        code: ServerResponseCode.Ok,
        result: [],
      }
    }
    const result = results[0];
    const rows = result.values.map((row: any[]) => {
      const out: Record<string, any> = {};
      result.columns.forEach((column: string, idx: number) => {
        out[column] = row[idx];
      });
      return out;
    });
    return {
      code: ServerResponseCode.Ok,
      result: rows,
    };
  }

}
