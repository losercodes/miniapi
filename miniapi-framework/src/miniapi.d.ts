// miniapi.d.ts - TypeScript definitions for MiniAPI

export interface MiniAPIOptions {
    cors?: boolean;
    logging?: boolean;
    compression?: boolean;
    rateLimit?: boolean;
    rateWindow?: number;
    rateMax?: number;
  }
  
  export interface RequestContext {
    req: any; // Node.js IncomingMessage
    res: any; // Node.js ServerResponse
    params: Record<string, string>;
    query: Record<string, string>;
    body: any;
    send: (data: any, statusCode?: number) => Promise<void>;
    text: (data: string, statusCode?: number) => Promise<void>;
    html: (data: string, statusCode?: number) => Promise<void>;
    redirect: (url: string, statusCode?: number) => void;
  }
  
  export type MiddlewareFunction = (ctx: RequestContext) => Promise<boolean | void> | boolean | void;
  export type RouteHandler = (ctx: RequestContext) => Promise<void> | void;
  export type ErrorHandler = (error: Error, ctx: RequestContext) => Promise<boolean> | boolean;
  
  export class MiniAPI {
    constructor(options?: MiniAPIOptions);
    get(path: string, handler: RouteHandler): MiniAPI;
    post(path: string, handler: RouteHandler): MiniAPI;
    put(path: string, handler: RouteHandler): MiniAPI;
    delete(path: string, handler: RouteHandler): MiniAPI;
    patch(path: string, handler: RouteHandler): MiniAPI;
    use(middleware: MiddlewareFunction): MiniAPI;
    onError(handler: ErrorHandler): MiniAPI;
    group(prefix: string, callback: (api: MiniAPI) => void): MiniAPI;
    listen(port?: number, callback?: (server: any) => void): any;
  }
  
  export function createAPI(options?: MiniAPIOptions): MiniAPI;