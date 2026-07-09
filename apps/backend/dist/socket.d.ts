import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { ClientToServerEvents, ServerToClientEvents } from '@delivery-tracker/types';
export declare function setupSocket(httpServer: HttpServer): SocketServer<ClientToServerEvents, ServerToClientEvents, import("socket.io").DefaultEventsMap, any>;
//# sourceMappingURL=socket.d.ts.map