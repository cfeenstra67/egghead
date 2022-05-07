import {
  ExtensionInterface,
  ExtensionMessage,
  HelloExtensionRequest,
  HelloExtensionResponse,
} from './types';
import { ServerResponseCode } from '../server';

export class ExtensionService implements ExtensionInterface {

  async getHello(request: Omit<HelloExtensionRequest, 'type'>): Promise<HelloExtensionResponse> {
    return {
      code: ServerResponseCode.Ok,
      message: `Hello, ${request.message}!`
    };
  }

}
