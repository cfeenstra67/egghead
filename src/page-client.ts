import {
  ExtensionRequest,
  ExtensionResponse,
} from './types';

export function processExtensionRequest<T extends ExtensionRequest>(
  request: T
): Promise<ExtensionResponse<T>> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(request, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}
