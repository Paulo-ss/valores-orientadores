import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response, Request } from 'express-serve-static-core';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request: Request = ctx.getRequest<Request>();

    const status = (exception as any)?.response?.statusCode || 500;
    let errorMessage =
      (exception as any)?.response?.message || 'Internal Server Error.';

    if (exception instanceof TypeError) {
      errorMessage = exception.stack;
    }

    response.status(status).json({
      statusCode: status,
      errorMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
